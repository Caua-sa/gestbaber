import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...body } = await req.json();

    if (action === "create") {
      const { email, password, full_name, role } = body;

      // Create user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Assign role, tracking which admin created this user
      if (role) {
        await adminClient.from("user_roles").insert({
          user_id: newUser.user.id,
          role,
          created_by: caller.id,
        });
      }

      return new Response(JSON.stringify({ user: newUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      // List only users created by the current admin (multi-tenant isolation)
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("user_id, role, created_by")
        .eq("created_by", caller.id);

      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, full_name, phone");

      const { data: { users } } = await adminClient.auth.admin.listUsers();

      const enriched = (roles || []).map((r) => {
        const profile = profiles?.find((p) => p.user_id === r.user_id);
        const authUser = users?.find((u) => u.id === r.user_id);
        return {
          user_id: r.user_id,
          role: r.role,
          full_name: profile?.full_name || "",
          email: authUser?.email || "",
          created_at: authUser?.created_at || "",
        };
      });

      return new Response(JSON.stringify({ users: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Não pode remover a si mesmo" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only allow deleting users created by this admin
      const { data: ownedRole } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("user_id", user_id)
        .eq("created_by", caller.id)
        .maybeSingle();

      if (!ownedRole) {
        return new Response(JSON.stringify({ error: "Você só pode remover usuários criados por você" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.auth.admin.deleteUser(user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { user_id, role } = body;
      // Delete existing roles and insert new one
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      if (role) {
        await adminClient.from("user_roles").insert({ user_id, role });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
