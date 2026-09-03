import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TIME_ZONE = "America/Argentina/Buenos_Aires";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

const localDate = (date = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
}).format(date);

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00-03:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return localDate(value);
};

const weekRanges = (today: string) => {
  const value = new Date(`${today}T12:00:00-03:00`);
  const dayOfWeek = value.getUTCDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const currentSunday = addDays(today, daysUntilSunday);
  const nextMonday = addDays(currentSunday, 1);
  const nextSunday = addDays(nextMonday, 6);
  return { currentSunday, nextMonday, nextSunday };
};

const displayDate = (date: string) => {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

const splitMessage = (message: string) => {
  const chunks: string[] = [];
  let current = "";
  for (const line of message.split("\n")) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length <= 4000) current = next;
    else {
      if (current) chunks.push(current);
      current = line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

Deno.serve(async () => {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY || !BOT_TOKEN) {
      return json({ error: "Faltan secretos requeridos para ejecutar telegram-cron" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: settings, error: settingsError } = await supabase
      .from("settings_empresa")
      .select("telegram_chat_id, telegram_alertas_activas")
      .limit(1).single();
    if (settingsError) throw settingsError;
    if (!settings?.telegram_alertas_activas || !settings.telegram_chat_id) {
      return json({ skipped: true, reason: "Alertas desactivadas o sin chat_id configurado" });
    }

    const hoy = localDate();
    const { currentSunday, nextMonday, nextSunday } = weekRanges(hoy);
    const { data: enviado, error: duplicateError } = await supabase
      .from("mensajes_telegram").select("id")
      .eq("tipo_mensaje", "resumen_diario")
      .gte("created_at", `${hoy}T03:00:00.000Z`).limit(1);
    if (duplicateError) throw duplicateError;
    if (enviado?.length) return json({ skipped: true, reason: "Resumen diario ya enviado hoy" });

    const fields = `numero_cuota, monto_cuota, monto_cobrado, fecha_vencimiento,
      prestamos!inner (clientes!inner (nombre_completo))`;
    const [estaSemana, proximaSemana, atrasadas] = await Promise.all([
      supabase.from("cuotas").select(fields).in("estado", ["pendiente", "parcial"])
        .gte("fecha_vencimiento", hoy).lte("fecha_vencimiento", currentSunday)
        .order("fecha_vencimiento", { ascending: true }),
      supabase.from("cuotas").select(fields).in("estado", ["pendiente", "parcial"])
        .gte("fecha_vencimiento", nextMonday).lte("fecha_vencimiento", nextSunday)
        .order("fecha_vencimiento", { ascending: true }),
      supabase.from("cuotas").select(fields).in("estado", ["pendiente", "parcial", "vencida"])
        .lt("fecha_vencimiento", hoy).order("fecha_vencimiento", { ascending: true }),
    ]);
    if (estaSemana.error) throw estaSemana.error;
    if (proximaSemana.error) throw proximaSemana.error;
    if (atrasadas.error) throw atrasadas.error;

    const line = (cuota: any, label: string) => {
      const nombre = cuota.prestamos?.clientes?.nombre_completo ?? "Sin nombre";
      const saldo = Number(cuota.monto_cuota) - Number(cuota.monto_cobrado ?? 0);
      return `• ${nombre} — $${saldo.toFixed(2)} — ${label}: ${displayDate(cuota.fecha_vencimiento)} (Cuota #${cuota.numero_cuota})`;
    };
    const porVencer = estaSemana.data ?? [];
    const semanaSiguiente = proximaSemana.data ?? [];
    const vencidas = atrasadas.data ?? [];
    const totalSemanaSiguiente = semanaSiguiente.reduce(
      (total: number, cuota: any) => total + Number(cuota.monto_cuota) - Number(cuota.monto_cobrado ?? 0),
      0,
    );
    const mensaje = [
      `📋 Resumen diario — ${hoy}`,
      `⏰ Cuotas por vencer esta semana (hasta el ${displayDate(currentSunday)})`,
      porVencer.length ? porVencer.map((c: any) => line(c, "Vence")).join("\n") : "Ninguna",
      `📆 Próxima semana — del ${displayDate(nextMonday)} al ${displayDate(nextSunday)}`,
      semanaSiguiente.length
        ? `${semanaSiguiente.map((c: any) => line(c, "Vence")).join("\n")}\n💰 Total previsto: $${totalSemanaSiguiente.toFixed(2)}`
        : "No hay cuotas previstas ✅",
      "🔴 Cuotas vencidas impagas",
      vencidas.length ? vencidas.map((c: any) => line(c, "Venció")).join("\n") : "Ninguna ✅",
    ].join("\n\n");

    const chunks = splitMessage(mensaje);
    for (const text of chunks) {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: settings.telegram_chat_id, text }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(`Error de Telegram: ${result.description ?? response.status}`);
    }

    const { error: logError } = await supabase.from("mensajes_telegram").insert({
      tipo_mensaje: "resumen_diario", contenido: mensaje, estado: "enviado",
    });
    if (logError) throw logError;
    return json({ success: true, mensajes_enviados: chunks.length,
      cuotas_esta_semana: porVencer.length, cuotas_proxima_semana: semanaSiguiente.length,
      cuotas_vencidas: vencidas.length });
  } catch (error) {
    console.error("[telegram-cron]", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
