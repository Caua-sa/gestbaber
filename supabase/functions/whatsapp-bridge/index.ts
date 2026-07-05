// WhatsApp Bridge — proxy between the app and the external Baileys server.
// Endpoints:
//   POST { action: "qr" }            -> returns { qr, status } from the Baileys server
//   POST { action: "status" }        -> returns { status, phone }
//   POST { action: "send", to, message } -> sends a message
//   POST { action: "logout" }        -> disconnects the session
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Usuário inválido");

    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve account owner
    const { data: role } = await admin
      .from("user_roles")
      .select("created_by")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const ownerId = role?.created_by || user.id;

    const { data: settings } = await admin
      .from("whatsapp_settings")
      .select("baileys_url, baileys_token")
      .eq("owner_id", ownerId)
      .maybeSingle();

    const url = settings?.baileys_url?.replace(/\/$/, "");
    const token = settings?.baileys_token;
    if (!url) throw new Error("URL do servidor Baileys não configurada.");

    const body = await req.json();
    const action = String(body.action || "status");

    const path =
      action === "qr" ? "/qr" :
      action === "send" ? "/send" :
      action === "logout" ? "/logout" :
      "/status";

    const method = action === "send" || action === "logout" ? "POST" : "GET";
    const r = await fetch(url + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: method === "POST" ? JSON.stringify(action === "send" ? { to: body.to, message: body.message } : {}) : undefined,
    });
    const data = await r.json().catch(() => ({}));

    // Persist status opportunistically
    if (data?.status) {
      await admin
        .from("whatsapp_settings")
        .update({ baileys_status: data.status })
        .eq("owner_id", ownerId);
    }

    if (!r.ok) throw new Error(data?.error || `Servidor Baileys retornou ${r.status}`);
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
