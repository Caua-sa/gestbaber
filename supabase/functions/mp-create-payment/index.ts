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

    const admin = createClient(supabaseUrl, serviceKey);
    const { amount, description, admin_user_id, source, reference_id } = await req.json();

    if (!amount || amount <= 0) throw new Error("Valor inválido");
    if (!admin_user_id) throw new Error("Barbearia não informada");

    // Get MP credentials of the barbershop
    const { data: settings, error: sErr } = await admin
      .from("mp_settings")
      .select("access_token, active")
      .eq("user_id", admin_user_id)
      .maybeSingle();

    if (sErr) throw sErr;
    if (!settings || !settings.active) {
      throw new Error("Esta barbearia ainda não configurou o Mercado Pago");
    }

    // Create MP preference
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            title: description || "Pagamento Barber Pro",
            quantity: 1,
            unit_price: Number(amount),
            currency_id: "BRL",
          },
        ],
        payer: { email: userData.user.email },
        back_urls: {
          success: `${req.headers.get("origin") || ""}/cliente/portal`,
          failure: `${req.headers.get("origin") || ""}/cliente/portal`,
          pending: `${req.headers.get("origin") || ""}/cliente/portal`,
        },
        auto_return: "approved",
      }),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP error", mpData);
      throw new Error(mpData.message || "Erro ao criar pagamento no Mercado Pago");
    }

    // Save record
    const { data: payment } = await admin
      .from("mp_payments")
      .insert({
        admin_user_id,
        payer_user_id: userData.user.id,
        amount: Number(amount),
        description,
        source: source || "pdv",
        reference_id,
        mp_preference_id: mpData.id,
        init_point: mpData.init_point,
        status: "pending",
        raw: mpData,
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({ init_point: mpData.init_point, preference_id: mpData.id, payment_id: payment?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
