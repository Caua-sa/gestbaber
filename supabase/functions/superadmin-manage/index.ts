import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return json({ error: "Não autorizado" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // check superadmin
    const { data: srole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (!srole) return json({ error: "Acesso negado — somente superadmin" }, 403);

    const { action, ...body } = await req.json().catch(() => ({ action: "" }));

    if (action === "list_barbershops") {
      const { data: shops } = await admin.from("barbershops").select("*").order("created_at", { ascending: false });
      const { data: { users } } = await admin.auth.admin.listUsers();
      const enriched = (shops || []).map((s: any) => {
        const u = users?.find((x: any) => x.id === s.owner_id);
        return { ...s, owner_email: u?.email || null, owner_last_sign_in: u?.last_sign_in_at || null };
      });
      return json({ shops: enriched });
    }

    if (action === "set_banned") {
      const { barbershop_id, banned } = body;
      await admin.from("barbershops").update({ banned }).eq("id", barbershop_id);
      return json({ ok: true });
    }

    if (action === "set_active") {
      const { barbershop_id, active } = body;
      await admin.from("barbershops").update({ active }).eq("id", barbershop_id);
      return json({ ok: true });
    }

    if (action === "delete_barbershop") {
      const { barbershop_id } = body;
      await admin.from("barbershops").delete().eq("id", barbershop_id);
      return json({ ok: true });
    }

    if (action === "update_barbershop") {
      const { barbershop_id, ...fields } = body;
      await admin.from("barbershops").update(fields).eq("id", barbershop_id);
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { user_id, password } = body;
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "set_owner_email") {
      const { user_id, email } = body;
      const { error } = await admin.auth.admin.updateUserById(user_id, { email });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "ban_owner_login") {
      const { user_id, ban } = body;
      const { error } = await admin.auth.admin.updateUserById(user_id, ban ? { ban_duration: "876000h" } : { ban_duration: "none" });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete_user") {
      const { user_id } = body;
      await admin.from("user_roles").delete().eq("user_id", user_id);
      await admin.auth.admin.deleteUser(user_id);
      return json({ ok: true });
    }

    if (action === "promote_superadmin") {
      const { email } = body;
      const { data: { users } } = await admin.auth.admin.listUsers();
      const target = users?.find((u: any) => (u.email || "").toLowerCase() === (email || "").toLowerCase());
      if (!target) return json({ error: "Usuário não encontrado" }, 404);
      await admin.from("user_roles").insert({ user_id: target.id, role: "superadmin", created_by: caller.id }).select();
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
