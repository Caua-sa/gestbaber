// Envia lembrete manual por WhatsApp para o cliente de um agendamento específico.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Não autenticado");
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) throw new Error("Usuário inválido");

    const admin = createClient(url, service);
    const { appointment_id, custom_message } = await req.json();
    if (!appointment_id) throw new Error("Agendamento não informado");

    const { data: appt } = await admin.from("appointments").select("*").eq("id", appointment_id).maybeSingle();
    if (!appt) throw new Error("Agendamento não encontrado");

    // Verificar dono
    const { data: role } = await admin.from("user_roles").select("created_by").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    const ownerId = role?.created_by || u.user.id;
    if (appt.owner_id !== ownerId) throw new Error("Sem permissão");

    // Descobrir telefone: primeiro profile do cliente, senão parse do notes
    let phone: string | null = null;
    let name = "Cliente";
    if (appt.user_id) {
      const { data: p } = await admin.from("profiles").select("phone, full_name").eq("user_id", appt.user_id).maybeSingle();
      phone = p?.phone || null;
      name = p?.full_name || name;
    }
    if (!phone && appt.notes) {
      const parts = String(appt.notes).replace(/\s*\[appt:[0-9a-f-]+\]\s*$/i, "").split("||");
      name = parts[0] || name;
      phone = (parts[1] || "").replace(/\D/g, "") || null;
    }
    if (!phone) throw new Error("Cliente sem telefone");
    const digits = phone.replace(/\D/g, "");
    const to = digits.startsWith("55") ? digits : `55${digits}`;

    const { data: shop } = await admin.from("barbershops").select("name").eq("owner_id", ownerId).maybeSingle();
    const shopName = shop?.name || "Barbearia";
    const timeStr = String(appt.appointment_time || "").slice(0, 5);
    const dateStr = new Date(appt.appointment_date + "T00:00:00").toLocaleDateString("pt-BR");
    const message = custom_message ||
      `Olá ${name}! 👋\nLembrete do seu agendamento na *${shopName}*:\n📅 ${dateStr} às ${timeStr}\n✂️ ${appt.service}\n👤 ${appt.barber}\n\nAté logo!`;

    const { data: s } = await admin
      .from("whatsapp_settings")
      .select("mode, phone_number_id, access_token, baileys_url, baileys_token")
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (!s) throw new Error("WhatsApp não configurado");

    if ((s.mode || "cloud") === "baileys") {
      if (!s.baileys_url) throw new Error("Servidor Baileys não configurado");
      const r = await fetch(`${s.baileys_url.replace(/\/$/, "")}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(s.baileys_token ? { Authorization: `Bearer ${s.baileys_token}` } : {}) },
        body: JSON.stringify({ to, message }),
      });
      if (!r.ok) throw new Error("Falha ao enviar via Baileys");
    } else {
      if (!s.phone_number_id || !s.access_token) throw new Error("Meta Cloud API não configurada");
      const r = await fetch(`https://graph.facebook.com/v20.0/${s.phone_number_id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: message } }),
      });
      if (!r.ok) throw new Error("Falha ao enviar via Cloud API");
    }

    return new Response(JSON.stringify({ ok: true, phone: to }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
