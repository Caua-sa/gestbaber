import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getRequestOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== "null") return origin;
  const referer = req.headers.get("referer");
  if (referer) {
    try { return new URL(referer).origin; } catch { /* ignore */ }
  }
  return "https://barbermg.lovable.app";
}

function errorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return "Erro desconhecido"; }
}

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

    const admin = createClient(supabaseUrl, serviceKey);
    const { plan_id, admin_user_id } = await req.json();

    if (!plan_id || !admin_user_id) throw new Error("Plano ou barbearia ausente");

    // Get plan
    const { data: plan, error: planErr } = await admin
      .from("plans")
      .select("id, name, price, period, barbershop_id, owner_id")
      .eq("id", plan_id)
      .maybeSingle();
    if (planErr) throw planErr;
    if (!plan) throw new Error("Plano não encontrado");

    if (plan.owner_id !== admin_user_id) throw new Error("Plano não pertence a esta barbearia");

    // Get MP credentials
    const { data: settings } = await admin
      .from("mp_settings")
      .select("access_token, active")
      .eq("user_id", admin_user_id)
      .maybeSingle();
    if (!settings || !settings.active) {
      throw new Error("Esta barbearia ainda não configurou o Mercado Pago");
    }

    const origin = getRequestOrigin(req);
    const backUrl = `${origin}/cliente?tab=planos`;

    // Create internal subscription record (pending)
    const { data: subRecord, error: subErr } = await admin
      .from("subscriptions")
      .insert({
        user_id: userData.user.id,
        plan_id: plan.id,
        barbershop_id: plan.barbershop_id,
        status: "pendente",
      })
      .select()
      .single();
    if (subErr) throw subErr;

    const notificationUrl = `${supabaseUrl}/functions/v1/mp-subscription-webhook`;

    // Create MP preapproval (recurring subscription).
    // Mercado Pago exige payer_email para abrir corretamente o checkout de assinatura recorrente.
    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: `Assinatura ${plan.name}`,
        external_reference: subRecord.id,
        payer_email: userData.user.email,
        back_url: backUrl,
        notification_url: notificationUrl,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: Number(plan.price),
          currency_id: "BRL",
        },
        status: "pending",
      }),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP preapproval error", mpData);
      const cause = mpData.message || mpData.error || mpData.cause?.[0]?.description;
      throw new Error(cause || "Falha ao criar assinatura recorrente no Mercado Pago");
    }
    const checkoutUrl = mpData.init_point || mpData.sandbox_init_point;
    if (!checkoutUrl) throw new Error("Mercado Pago não retornou link de checkout");

    // Save mp_subscription
    await admin.from("mp_subscriptions").insert({
      user_id: userData.user.id,
      admin_user_id,
      plan_id: plan.id,
      subscription_id: subRecord.id,
      mp_preapproval_id: mpData.id,
      status: "pending",
      amount: Number(plan.price),
      init_point: checkoutUrl,
      raw: mpData,
    });

    return new Response(
      JSON.stringify({ init_point: checkoutUrl, preapproval_id: mpData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = errorMessage(err);
    console.error("mp-create-subscription error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
