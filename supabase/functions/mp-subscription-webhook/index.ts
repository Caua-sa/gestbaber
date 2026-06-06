import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Public webhook from Mercado Pago - no auth
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    console.log("MP webhook", JSON.stringify(body));

    const type = body.type || body.topic;
    const id = body.data?.id || body.id;
    if (!id) return new Response("no id", { status: 200 });

    if (type === "preapproval" || type === "subscription_preapproval") {
      const { data: mpSub } = await admin
        .from("mp_subscriptions")
        .select("*")
        .eq("mp_preapproval_id", String(id))
        .maybeSingle();
      if (!mpSub) return new Response("not found", { status: 200 });

      const { data: settings } = await admin
        .from("mp_settings")
        .select("access_token")
        .eq("user_id", mpSub.admin_user_id)
        .maybeSingle();
      if (!settings) return new Response("no token", { status: 200 });

      const r = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
        headers: { Authorization: `Bearer ${settings.access_token}` },
      });
      const data = await r.json();

      const status = data.status; // pending|authorized|paused|cancelled
      const subStatus =
        status === "authorized" ? "pago" :
        status === "cancelled" ? "cancelado" :
        status === "paused" ? "cancelado" : "pendente";

      await admin
        .from("mp_subscriptions")
        .update({ status, raw: data, next_payment_date: data.next_payment_date })
        .eq("id", mpSub.id);

      if (mpSub.subscription_id) {
        await admin
          .from("subscriptions")
          .update({ status: subStatus })
          .eq("id", mpSub.subscription_id);
      }

      // When authorized for the first time, register payment in Financeiro
      if (status === "authorized") {
        const today = new Date().toISOString().slice(0, 10);
        const { data: existingTx } = await admin
          .from("transactions")
          .select("id")
          .eq("owner_id", mpSub.admin_user_id)
          .eq("notes", `MP Preapproval: ${id}`)
          .eq("transaction_date", today)
          .maybeSingle();
        if (!existingTx) {
          await admin.from("transactions").insert({
            description: `Assinatura recorrente${data.reason ? ` — ${data.reason}` : ""}`,
            type: "entrada",
            value: Number(mpSub.amount || data.auto_recurring?.transaction_amount || 0),
            category: "Assinatura",
            transaction_date: today,
            owner_id: mpSub.admin_user_id,
            notes: `MP Preapproval: ${id}`,
          });
        }
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("err", { status: 200 });
  }
});
