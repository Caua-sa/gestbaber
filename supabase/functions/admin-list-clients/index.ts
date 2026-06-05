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
    const adminId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: role } = await admin
      .from("user_roles")
      .select("created_by, role")
      .eq("user_id", adminId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Acesso negado");
    const accountOwnerId = role.created_by || adminId;

    const { data: shop } = await admin
      .from("barbershops")
      .select("id")
      .eq("owner_id", accountOwnerId)
      .maybeSingle();

    const shopId = shop?.id || null;

    // Gather user ids from subscriptions (admin's plans/shops) and appointments
    const [{ data: subs }, { data: appts }] = await Promise.all([
      admin.from("subscriptions").select("user_id, plan_id, status, started_at, expires_at, barbershop_id, created_at"),
      admin.from("appointments").select("user_id, appointment_date, appointment_time, service, status, owner_id, barbershop_id").or(`owner_id.eq.${accountOwnerId}${shopId ? `,barbershop_id.eq.${shopId}` : ""}`),
    ]);

    // Filter subs to admin's plans/shops
    const { data: ownedPlans } = await admin.from("plans").select("id").eq("owner_id", accountOwnerId);
    const ownedPlanIds = new Set((ownedPlans || []).map((p) => p.id));
    const filteredSubs = (subs || []).filter(
      (s) => (shopId && s.barbershop_id === shopId) || ownedPlanIds.has(s.plan_id),
    );

    const { data: ownedClientRoles } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("created_by", accountOwnerId)
      .eq("role", "user");

    const userIds = new Set<string>([
      ...filteredSubs.map((s) => s.user_id),
      ...(appts || []).map((a) => a.user_id),
      ...((ownedClientRoles || []) as any[]).map((r) => r.user_id),
    ]);
    if (userIds.size === 0) {
      return new Response(JSON.stringify({ clients: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ids = [...userIds];

    const [{ data: profiles }, { data: planRows }] = await Promise.all([
      admin.from("profiles").select("user_id, full_name, phone").in("user_id", ids),
      admin.from("plans").select("id, name, price").in("id", filteredSubs.map((s) => s.plan_id).filter(Boolean) as string[]),
    ]);
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const planMap = new Map((planRows || []).map((p: any) => [p.id, p]));

    // Fetch emails via auth admin
    const emailMap = new Map<string, string>();
    await Promise.all(
      ids.map(async (uid) => {
        try {
          const { data } = await admin.auth.admin.getUserById(uid);
          if (data?.user?.email) emailMap.set(uid, data.user.email);
        } catch { /* ignore */ }
      }),
    );

    const clients = ids.map((uid) => {
      const userSubs = filteredSubs
        .filter((s) => s.user_id === uid)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const activeSub = userSubs.find((s) => s.status === "ativo") || userSubs[0];
      const userAppts = (appts || [])
        .filter((a) => a.user_id === uid)
        .sort((a, b) => `${b.appointment_date} ${b.appointment_time}`.localeCompare(`${a.appointment_date} ${a.appointment_time}`));
      const lastAppt = userAppts[0];
      const plan = activeSub ? planMap.get(activeSub.plan_id) as any : null;
      const profile = profileMap.get(uid) as any;
      return {
        user_id: uid,
        full_name: profile?.full_name || "Cliente",
        phone: profile?.phone || null,
        email: emailMap.get(uid) || null,
        subscription: activeSub
          ? {
              status: activeSub.status,
              started_at: activeSub.started_at,
              expires_at: activeSub.expires_at,
              plan_name: plan?.name || "—",
              plan_price: Number(plan?.price || 0),
            }
          : null,
        last_appointment: lastAppt
          ? {
              date: lastAppt.appointment_date,
              time: lastAppt.appointment_time,
              service: lastAppt.service,
              status: lastAppt.status,
            }
          : null,
      };
    });

    clients.sort((a, b) => a.full_name.localeCompare(b.full_name));

    return new Response(JSON.stringify({ clients }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    console.error("admin-list-clients error:", msg);
    return new Response(JSON.stringify({ error: msg, clients: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
