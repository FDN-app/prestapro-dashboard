import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { chat_id, mensaje, cliente_id, prestamo_id, tipo_mensaje } = payload;

    console.log('[enviar-telegram] Payload recibido:', JSON.stringify({ chat_id, tipo_mensaje, mensajeLength: mensaje?.length }));

    if (!chat_id || !mensaje) {
      console.error('[enviar-telegram] Error: chat_id o mensaje faltante');
      return new Response(
        JSON.stringify({ error: 'Se requieren chat_id y mensaje en el body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Obtener el token desde las variables de entorno del servidor
    const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    console.log('[enviar-telegram] Token presente:', !!telegramToken);

    if (!telegramToken) {
      console.error('[enviar-telegram] Error: TELEGRAM_BOT_TOKEN no configurado');
      return new Response(
        JSON.stringify({ error: 'El secret TELEGRAM_BOT_TOKEN no está configurado en el servidor.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Llamada a la API de Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    console.log('[enviar-telegram] Llamando a Telegram API para chat_id:', chat_id);

    const res = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat_id,
        text: mensaje,
        parse_mode: 'Markdown',
      }),
    });

    const telegramData = await res.json();
    console.log('[enviar-telegram] Respuesta Telegram:', JSON.stringify(telegramData));

    if (!telegramData.ok) {
      console.error('[enviar-telegram] Error de Telegram:', telegramData.description);
      return new Response(
        JSON.stringify({ error: 'Error en la API de Telegram: ' + telegramData.description, telegram_response: telegramData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Registrar en mensajes_telegram con permisos de admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseAdmin
      .from('mensajes_telegram')
      .insert({
        cliente_id: cliente_id || null,
        prestamo_id: prestamo_id || null,
        tipo_mensaje: tipo_mensaje || 'alerta_admin',
        contenido: mensaje,
        estado: 'enviado'
      });

    console.log('[enviar-telegram] Mensaje enviado y registrado exitosamente');

    return new Response(
      JSON.stringify({ success: true, data: telegramData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[enviar-telegram] Excepción:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
