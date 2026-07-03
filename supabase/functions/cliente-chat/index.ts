import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurado");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    let userId: string | null = null;
    let ownerId: string | null = null;

    if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id ?? null;
      if (userId) {
        const { data: role } = await admin
          .from("user_roles")
          .select("created_by")
          .eq("user_id", userId)
          .maybeSingle();
        ownerId = role?.created_by || null;
      }
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages)) throw new Error("messages inválido");

    // Contexto da barbearia
    let ctx = "";
    if (ownerId) {
      const [shop, services, plans] = await Promise.all([
        admin.from("barbershops").select("name, address, phone, whatsapp, instagram").eq("owner_id", ownerId).maybeSingle(),
        admin.from("services").select("name, price, duration_min").eq("owner_id", ownerId).eq("active", true).limit(20),
        admin.from("plans").select("name, price, period, features").eq("owner_id", ownerId).eq("active", true).limit(10),
      ]);
      if (shop.data) {
        ctx += `Barbearia: ${shop.data.name}\n`;
        if (shop.data.address) ctx += `Endereço: ${shop.data.address}\n`;
        if (shop.data.phone) ctx += `Telefone: ${shop.data.phone}\n`;
        if (shop.data.whatsapp) ctx += `WhatsApp: ${shop.data.whatsapp}\n`;
      }
      if (services.data?.length) {
        ctx += `\nServiços:\n` + services.data.map((s: any) => `- ${s.name} — R$${Number(s.price).toFixed(2)} (${s.duration_min}min)`).join("\n") + "\n";
      }
      if (plans.data?.length) {
        ctx += `\nPlanos:\n` + plans.data.map((p: any) => `- ${p.name} — R$${Number(p.price).toFixed(2)}/${p.period}`).join("\n") + "\n";
      }
    }

    const system = `Você é o assistente virtual de uma barbearia. Ajude o cliente com dúvidas sobre serviços, planos, agendamentos, horários e produtos. Seja simpático, direto e responda em português.

Oriente sobre como agendar (aba "Agendar"), ver planos (aba "Planos"), comprar produtos (aba "Loja") e ver agendamentos (aba "Agendamentos").

${ctx ? "Informações da barbearia:\n" + ctx : ""}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (r.status === 429) {
      return new Response(JSON.stringify({ error: "Muitas mensagens, tente novamente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (r.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Contate o suporte." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`AI Gateway: ${r.status} ${t}`);
    }

    return new Response(r.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
