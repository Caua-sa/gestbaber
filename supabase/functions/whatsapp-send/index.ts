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

    const { to, message } = await req.json();
    if (!to || !message) throw new Error("Destinatário e mensagem são obrigatórios");

    // Get owner -> whatsapp_settings
    const { data: role } = await admin
      .from("user_roles")
      .select("created_by")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Acesso negado");
    const ownerId = role.created_by || user.id;

    const { data: settings } = await admin
      .from("whatsapp_settings")
      .select("phone_number_id, access_token")
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (!settings?.phone_number_id || !settings?.access_token) {
      throw new Error("WhatsApp não configurado. Acesse Painel > WhatsApp.");
    }

    const cleaned = String(to).replace(/\D/g, "");
    const r = await fetch(`https://graph.facebook.com/v20.0/${settings.phone_number_id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleaned,
        type: "text",
        text: { body: String(message).slice(0, 4000) },
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("WhatsApp API error", data);
      throw new Error(data?.error?.message || "Erro ao enviar mensagem");
    }

    return new Response(JSON.stringify({ ok: true, data }), {
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
