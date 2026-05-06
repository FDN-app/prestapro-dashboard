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

    if (!supabaseServiceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { email, password, nombre_completo, rol, comision_porcentaje } = body;

    if (!email || !password || !nombre_completo) {
      throw new Error(`Faltan campos requeridos.`);
    }

    const validRol = rol === "admin" ? "admin" : "cobrador";
    const comision = Number(comision_porcentaje) || 0;

    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo },
    });

    if (authError) {
      throw new Error(`Error auth: ${authError.message}`);
    }

    const userId = authData.user.id;

    // UPSERT profile (trigger may or may not have created it)
    const { error: profileError } = await supabase
      .from("perfiles")
      .upsert({
        id: userId,
        email: email,
        rol: validRol,
        comision_porcentaje: comision,
        nombre_completo: nombre_completo,
      }, { onConflict: "id" });

    if (profileError) {
      console.error("Error upserting perfil:", profileError.message);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, email, rol: validRol }),
      {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("crear-usuario error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
