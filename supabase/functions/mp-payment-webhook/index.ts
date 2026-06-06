import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Public webhook for Mercado Pago payments (store orders / one-off)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const type = body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic");
    const id = body.data?.id || body.id || url.searchParams.get("id") || url.searchParams.get("data.id");
    console.log("MP payment webhook", type, id);

    if (!id || type !== "payment") return new Response("ignored", { status: 200 });

    // We need MP access_token. Find via mp_payments by mp_preference_id later — first fetch payment to learn preference.
    // Try with each barbershop token until one resolves. Optimization: look up by external_reference if present.
    const { data: settingsList } = await admin.from("mp_settings").select("user_id, access_token").eq("active", true);
    let mpPayment: any = null;
    let ownerUserId: string | null = null;
    for (const s of settingsList || []) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { Authorization: `Bearer ${s.access_token}` },
      });
      if (r.ok) {
        mpPayment = await r.json();
        ownerUserId = s.user_id;
        break;
      }
    }
    if (!mpPayment) return new Response("not found", { status: 200 });

    const status = mpPayment.status; // approved|pending|rejected|cancelled
    const preferenceId = mpPayment.preference_id || mpPayment.order?.id;

    // Locate our record
    const { data: payment } = await admin
      .from("mp_payments")
      .select("*")
      .eq("mp_preference_id", String(preferenceId))
      .maybeSingle();

    if (payment) {
      await admin
        .from("mp_payments")
        .update({ status, mp_payment_id: String(mpPayment.id), raw: mpPayment })
        .eq("id", payment.id);

      if (status === "approved") {
        // Mark related orders as paid (store source)
        if (payment.source === "loja") {
          await admin.from("orders").update({ status: "pago", mp_payment_id: payment.id }).eq("user_id", payment.payer_user_id).eq("status", "aguardando_pagamento");
        }
        // Insert into transactions (Financeiro)
        await admin.from("transactions").insert({
          description: payment.description || "Pagamento Mercado Pago",
          type: "entrada",
          value: Number(payment.amount),
          category: payment.source === "loja" ? "Loja" : "Mercado Pago",
          transaction_date: new Date().toISOString().slice(0, 10),
          owner_id: payment.admin_user_id,
          notes: `MP Payment ID: ${mpPayment.id}`,
        });
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("err", { status: 200 });
  }
});
