// Envia código de 6 dígitos via WhatsApp (Meta Cloud API ou Baileys) para confirmar cadastro.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalize(raw: string) {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("55") ? d : `55${d}`;
}

async function sendWhatsapp(ownerId: string, admin: any, to: string, message: string) {
  const { data: s } = await admin
    .from("whatsapp_settings")
    .select("mode, phone_number_id, access_token, baileys_url, baileys_token")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!s) return { ok: false, error: "WhatsApp não configurado" };
  if ((s.mode || "cloud") === "baileys") {
    if (!s.baileys_url) return { ok: false, error: "Servidor Baileys não configurado" };
    const r = await fetch(`${s.baileys_url.replace(/\/$/, "")}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(s.baileys_token ? { Authorization: `Bearer ${s.baileys_token}` } : {}) },
      body: JSON.stringify({ to, message }),
    });
    return { ok: r.ok };
  }
  if (!s.phone_number_id || !s.access_token) return { ok: false, error: "Meta Cloud não configurada" };
  const r = await fetch(`https://graph.facebook.com/v20.0/${s.phone_number_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: message } }),
  });
  return { ok: r.ok };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { phone, full_name, owner_id } = await req.json();
    const p = normalize(phone);
    if (!p || p.length < 12) throw new Error("Telefone inválido");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Descobre owner (barbearia). Se não informado, pega a primeira barbearia disponível.
    let ownerId = owner_id;
    if (!ownerId) {
      const { data: shop } = await admin.from("barbershops").select("owner_id").limit(1).maybeSingle();
      ownerId = shop?.owner_id;
    }
    if (!ownerId) throw new Error("Nenhuma barbearia configurada");

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await admin.from("signup_otps").insert({ phone: p, code, full_name: full_name || null });

    const send = await sendWhatsapp(ownerId, admin, p, `🔐 Seu código de confirmação GestBarber: *${code}*\nVálido por 10 minutos.`);
    if (!send.ok) throw new Error(send.error || "Falha ao enviar WhatsApp");

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
