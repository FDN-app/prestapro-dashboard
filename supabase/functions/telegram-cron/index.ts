import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Leer configuración de Telegram
    const { data: settings, error: settingsError } = await supabase
      .from("settings_empresa")
      .select("telegram_chat_id, telegram_alertas_activas, telegram_dias_recordatorio")
      .limit(1)
      .single();

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: "No se pudo leer settings_empresa" }), { status: 500 });
    }

    // 2. Si las alertas están desactivadas o no hay chat_id configurado, salir
    if (!settings.telegram_alertas_activas || !settings.telegram_chat_id) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Alertas desactivadas o sin chat_id configurado" }),
        { status: 200 }
      );
    }

    const chatId = settings.telegram_chat_id;
    const diasAnticipacion = settings.telegram_dias_recordatorio ?? 2;
    const hoy = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 3. Verificar si ya se envió el resumen del día (evitar duplicados)
    const { data: yaEnviado } = await supabase
      .from("mensajes_telegram")
      .select("id")
      .eq("tipo_mensaje", "resumen_diario")
      .gte("created_at", `${hoy}T00:00:00.000Z`)
      .lte("created_at", `${hoy}T23:59:59.999Z`)
      .limit(1);

    if (yaEnviado && yaEnviado.length > 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Resumen diario ya enviado hoy" }),
        { status: 200 }
      );
    }

    // 4. Calcular fecha límite para cuotas por vencer
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);
    const fechaLimiteStr = fechaLimite.toISOString().split("T")[0];

    // 5. Consultar cuotas por vencer en los próximos X días (estado pendiente/parcial)
    const { data: cuotasPorVencer } = await supabase
      .from("cuotas")
      .select(`
        numero_cuota,
        monto_cuota,
        monto_cobrado,
        fecha_vencimiento,
        prestamos!inner (
          cliente_id,
          clientes!inner ( nombre_completo )
        )
      `)
      .in("estado", ["pendiente", "parcial"])
      .gte("fecha_vencimiento", hoy)
      .lte("fecha_vencimiento", fechaLimiteStr)
      .order("fecha_vencimiento", { ascending: true });

    // 6. Consultar cuotas vencidas impagas
    const { data: cuotasVencidas } = await supabase
      .from("cuotas")
      .select(`
        numero_cuota,
        monto_cuota,
        monto_cobrado,
        fecha_vencimiento,
        prestamos!inner (
          cliente_id,
          clientes!inner ( nombre_completo )
        )
      `)
      .eq("estado", "vencida")
      .lt("fecha_vencimiento", hoy)
      .order("fecha_vencimiento", { ascending: true });

    // 7. Construir el mensaje de resumen
    let mensaje = `📋 *Resumen Diario — ${hoy}*\n\n`;

    if (cuotasPorVencer && cuotasPorVencer.length > 0) {
      mensaje += `⏰ *Cuotas por vencer (próximos ${diasAnticipacion} días)*\n`;
      for (const cuota of cuotasPorVencer) {
        // @ts-ignore: tipado dinámico de joins anidados
        const nombreCliente = cuota.prestamos?.clientes?.nombre_completo ?? "Sin nombre";
        const saldoCuota = (cuota.monto_cuota - (cuota.monto_cobrado ?? 0)).toFixed(2);
        mensaje += `• ${nombreCliente} — $${saldoCuota} — Vence: ${cuota.fecha_vencimiento} (Cuota #${cuota.numero_cuota})\n`;
      }
    } else {
      mensaje += `⏰ *Cuotas por vencer:* Ninguna en los próximos ${diasAnticipacion} días\n`;
    }

    mensaje += "\n";

    if (cuotasVencidas && cuotasVencidas.length > 0) {
      mensaje += `🔴 *Cuotas vencidas impagas*\n`;
      for (const cuota of cuotasVencidas) {
        // @ts-ignore: tipado dinámico de joins anidados
        const nombreCliente = cuota.prestamos?.clientes?.nombre_completo ?? "Sin nombre";
        const saldoCuota = (cuota.monto_cuota - (cuota.monto_cobrado ?? 0)).toFixed(2);
        mensaje += `• ${nombreCliente} — $${saldoCuota} — Venció: ${cuota.fecha_vencimiento} (Cuota #${cuota.numero_cuota})\n`;
      }
    } else {
      mensaje += `🔴 *Cuotas vencidas:* Ninguna ✅\n`;
    }

    // 8. Enviar mensaje a Telegram usando el bot token
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramRes = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: mensaje,
        parse_mode: "Markdown",
      }),
    });

    const telegramData = await telegramRes.json();

    if (!telegramData.ok) {
      throw new Error("Error en la API de Telegram: " + telegramData.description);
    }

    // 9. Registrar en mensajes_telegram para evitar duplicados futuros
    await supabase.from("mensajes_telegram").insert({
      tipo_mensaje: "resumen_diario",
      contenido: mensaje,
      estado: "enviado",
    });

    return new Response(
      JSON.stringify({
        success: true,
        cuotas_por_vencer: cuotasPorVencer?.length ?? 0,
        cuotas_vencidas: cuotasVencidas?.length ?? 0,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
