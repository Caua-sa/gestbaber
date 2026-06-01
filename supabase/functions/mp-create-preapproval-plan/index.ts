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
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) throw new Error("Usuário inválido");
    const adminUserId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { reason, amount, frequency, frequency_type, plan_id } = body;

    if (!reason || !amount) throw new Error("Nome e valor são obrigatórios");

    const { data: settings } = await admin
      .from("mp_settings")
      .select("access_token, active")
      .eq("user_id", adminUserId)
      .maybeSingle();
    if (!settings) throw new Error("Configure suas credenciais do Mercado Pago primeiro");

    const origin = req.headers.get("origin") || "";

    const mpRes = await fetch("https://api.mercadopago.com/preapproval_plan", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason,
        auto_recurring: {
          frequency: Number(frequency) || 1,
          frequency_type: frequency_type || "months",
          transaction_amount: Number(amount),
          currency_id: "BRL",
        },
        back_url: `${origin}/admin/mercado-pago`,
        status: "active",
      }),
    });
    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP preapproval_plan error", mpData);
      throw new Error(mpData.message || "Falha ao criar plano no Mercado Pago");
    }

    await admin.from("mp_recurring_plans").insert({
      admin_user_id: adminUserId,
      plan_id: plan_id || null,
      mp_preapproval_plan_id: mpData.id,
      reason,
      amount: Number(amount),
      frequency: Number(frequency) || 1,
      frequency_type: frequency_type || "months",
      init_point: mpData.init_point,
      status: mpData.status || "active",
      raw: mpData,
    });

    return new Response(JSON.stringify({ ok: true, plan: mpData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    console.error(msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
