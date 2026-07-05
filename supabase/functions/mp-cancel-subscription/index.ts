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
    const { mp_subscription_id, mode } = await req.json();
    // mode: "now" | "end_of_cycle"
    if (!mp_subscription_id) throw new Error("Assinatura não informada");
    const cancelMode = mode === "end_of_cycle" ? "end_of_cycle" : "now";

    // Check if caller is admin/owner of this shop (to cancel any client sub)
    const { data: role } = await admin
      .from("user_roles")
      .select("role, created_by")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    const callerOwnerId = role?.created_by || userData.user.id;
    const isAdmin = !!role;

    const q = admin.from("mp_subscriptions").select("*").eq("id", mp_subscription_id);
    const { data: mpSub } = isAdmin
      ? await q.eq("admin_user_id", callerOwnerId).maybeSingle()
      : await q.eq("user_id", userData.user.id).maybeSingle();
    if (!mpSub) throw new Error("Assinatura não encontrada");


    // Get admin MP token
    const { data: settings } = await admin
      .from("mp_settings")
      .select("access_token")
      .eq("user_id", mpSub.admin_user_id)
      .maybeSingle();
    if (!settings) throw new Error("Credenciais MP da barbearia não encontradas");

    // For both modes we tell MP to cancel at the end of cycle vs now via "status"
    // MP doesn't natively support "end of cycle"; we approximate:
    //  - "now": set status = "cancelled" at MP immediately
    //  - "end_of_cycle": set status = "paused" so no new charges, keep access until next_payment_date
    const newMpStatus = cancelMode === "now" ? "cancelled" : "paused";

    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${mpSub.mp_preapproval_id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${settings.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newMpStatus }),
    });
    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP cancel error", mpData);
      throw new Error(mpData.message || "Erro ao cancelar no MP");
    }

    // Update local
    await admin
      .from("mp_subscriptions")
      .update({ status: "cancelled", raw: mpData })
      .eq("id", mp_subscription_id);

    if (mpSub.subscription_id) {
      const newStatus = cancelMode === "now" ? "cancelado" : "cancelando";
      await admin
        .from("subscriptions")
        .update({ status: newStatus, cancel_mode: cancelMode, canceled_at: new Date().toISOString() })
        .eq("id", mpSub.subscription_id);
    }

    return new Response(JSON.stringify({ ok: true, mode: cancelMode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
