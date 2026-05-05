import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://prestapro-dashboard.vercel.app",
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

  if (method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, password, nombre_completo, rol, comision_porcentaje } = await req.json();

    if (!email || !password || !nombre_completo) {
      throw new Error("Faltan campos requeridos: email, password, nombre_completo");
    }

    const validRol = rol === "admin" ? "admin" : "cobrador";
    const comision = Number(comision_porcentaje) || 0;

    // Crear usuario en auth con SERVICE_ROLE_KEY (admin)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: { nombre_completo },
    });

    if (authError) {
      throw new Error(`Error creando usuario: ${authError.message}`);
    }

    const userId = authData.user.id;

    // Actualizar perfil (el trigger ya lo creó como cobrador, pero actualizamos rol y comisión)
    const { error: profileError } = await supabase
      .from("perfiles")
      .update({
        rol: validRol,
        comision_porcentaje: comision,
        nombre_completo: nombre_completo,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Error actualizando perfil:", profileError);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, email, rol: validRol }),
      {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
