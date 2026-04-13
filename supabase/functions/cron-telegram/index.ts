import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

Deno.cron("Alertas Diarias Telegram", "0 12 * * *", async () => {
    // Se ejecuta a las 12 PM UTC (9 AM ART)
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        
        if (!supabaseUrl || !supabaseKey) {
            console.error("Faltan variables de entorno");
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Obtener settings
        const { data: settings, error: configError } = await supabase
            .from('settings_empresa')
            .select('telegram_alertas_activas, telegram_chat_id, telegram_dias_recordatorio, telegram_bot_token')
            .limit(1)
            .single();

        if (configError || !settings?.telegram_alertas_activas || !settings?.telegram_chat_id || !settings?.telegram_bot_token) {
            console.log("Alertas desactivadas o mal configuradas.");
            return;
        }

        const chatId = settings.telegram_chat_id;
        const diasPrevios = settings.telegram_dias_recordatorio || 2;
        const botToken = settings.telegram_bot_token;

        const enviarTelegram = async (mensaje: string, tipo: string) => {
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: mensaje })
            });

            if (res.ok) {
                await supabase.from('mensajes_telegram').insert({
                    tipo_mensaje: tipo,
                    contenido: mensaje,
                    estado: 'enviado'
                });
            } else {
                console.error("Error Telegram:", await res.text());
            }
        };

        const hoy = new Date();
        const hoyIso = hoy.toISOString().split('T')[0];

        // 2. Comprobar si ya se enviaron hoy
        const { data: enviosHoy } = await supabase
            .from('mensajes_telegram')
            .select('tipo_mensaje')
            .gte('created_at', hoyIso)
            .in('tipo_mensaje', ['resumen_diario', 'alerta_vencidas']);
            
        const enviados = enviosHoy?.map((e: any) => e.tipo_mensaje) || [];

        // 3. Resumen Diario (por vencer en X días)
        if (!enviados.includes('resumen_diario')) {
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() + diasPrevios);
            const fechaLimiteIso = fechaLimite.toISOString().split('T')[0];

            const { data: porVencer } = await supabase
                .from('cuotas')
                .select(`
                    id, 
                    monto_cuota,
                    monto_cobrado,
                    fecha_vencimiento,
                    numero_cuota,
                    prestamos!inner ( cliente_id, clientes (nombre) )
                `)
                .eq('estado', 'pendiente')
                .lte('fecha_vencimiento', fechaLimiteIso)
                .gte('fecha_vencimiento', hoyIso);

            if (porVencer && porVencer.length > 0) {
                let mensaje = `📅 *Cuotas próximas a vencer (Próximos ${diasPrevios} días):*\n\n`;
                porVencer.forEach((c: any) => {
                    const saldo = c.monto_cuota - (c.monto_cobrado || 0);
                    const nom = c.prestamos?.clientes?.nombre || "Cliente";
                    mensaje += `- ${nom}: $${saldo} (Cuota ${c.numero_cuota}) vence el ${c.fecha_vencimiento}\n`;
                });
                await enviarTelegram(mensaje, 'resumen_diario');
            }
        }

        // 4. Alerta Vencidas
        if (!enviados.includes('alerta_vencidas')) {
            const { data: vencidas } = await supabase
                .from('cuotas')
                .select(`
                    id, 
                    monto_cuota,
                    monto_cobrado,
                    fecha_vencimiento,
                    numero_cuota,
                    prestamos!inner ( cliente_id, clientes (nombre) )
                `)
                .in('estado', ['pendiente', 'vencida', 'parcial'])
                .lt('fecha_vencimiento', hoyIso);

            if (vencidas && vencidas.length > 0) {
                let mensaje = `🚨 *Cuotas vencidas sin pagar:*\n\n`;
                vencidas.forEach((c: any) => {
                    const saldo = c.monto_cuota - (c.monto_cobrado || 0);
                    const nom = c.prestamos?.clientes?.nombre || "Cliente";
                    mensaje += `- ${nom}: $${saldo} (Cuota ${c.numero_cuota}) vencida el ${c.fecha_vencimiento}\n`;
                });
                await enviarTelegram(mensaje, 'alerta_vencidas');
            }
        }

    } catch (e) {
        console.error("Cron exception", e);
    }
});
