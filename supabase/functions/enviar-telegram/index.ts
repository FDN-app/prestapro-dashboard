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

    // Obtener el token de las variables de entorno de Supabase
    const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    
    if (!telegramToken) {
      throw new Error("El secret TELEGRAM_BOT_TOKEN no está configurado de lado del servidor.");
    }

    // Lamada a Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const res = await fetch(telegramApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat_id,
        text: mensaje,
      }),
    });
    
    const telegramData = await res.json();

    if (!telegramData.ok) {
        throw new Error("Error en la API de Telegram: " + telegramData.description);
    }

    // Registrar el mensaje en Supabase con permisos de admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Guardar rastro en la base de datos
    await supabaseAdmin
      .from('mensajes_telegram')
      .insert({
        cliente_id: cliente_id || null,
        prestamo_id: prestamo_id || null,
        tipo_mensaje: tipo_mensaje || 'alerta_admin',
        contenido: mensaje,
        estado: 'enviado'
      });

    return new Response(JSON.stringify({ success: true, data: telegramData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
