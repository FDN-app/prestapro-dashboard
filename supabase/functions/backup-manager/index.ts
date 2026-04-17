import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

// 1. Configuración de Dominios Permitidos (CORS)
const ALLOWED_ORIGINS = [
  "http://localhost:5173", // Desarrollo local
  "https://prestapro-dashboard.vercel.app", // Producción (ejemplo, ajustar cuando sea necesario)
];

const corsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

Deno.serve(async (req) => {
  const { method } = req;
  const origin = req.headers.get("origin");

  // Manejo de Preflight (CORS)
  if (method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    // 2. Inicialización de Clientes
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Usamos Service Role Key para saltar RLS en backups
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Iniciando Backup Manager...");

    // 3. Lógica del Endpoint (Paso 1: Esqueleto)
    // Por ahora solo responde que está vivo
    return new Response(
      JSON.stringify({
        status: "success",
        message: "Backup Manager iniciado correctamente. Esqueleto de Fase 1 listo.",
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error en Backup Manager:", error.message);
    
    return new Response(
      JSON.stringify({ 
        status: "error", 
        message: error.message 
      }),
      {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
