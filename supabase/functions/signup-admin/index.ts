import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, password, full_name, barbershop_name } = await req.json();

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create user (auto-confirm)
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

    const userId = newUser.user.id;

    // Assign admin role
    await adminClient.from("user_roles").insert({ user_id: userId, role: "admin" });

    // Create barbershop with slug
    const baseSlug = (barbershop_name || full_name)
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "barbearia";

    let slug = baseSlug;
    let n = 1;
    while (true) {
      const { data: existing } = await adminClient
        .from("barbershops")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      n++;
      slug = `${baseSlug}-${n}`;
    }

    await adminClient.from("barbershops").insert({
      owner_id: userId,
      name: barbershop_name || `Barbearia de ${full_name}`,
      slug,
      active: true,
    });

    return new Response(JSON.stringify({ success: true, user_id: userId, slug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
