// Valida código, cria usuário (ou reaproveita) e devolve credenciais para login.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalize(raw: string) {
  const d = String(raw || "").replace(/\D/g, "");
  return d.startsWith("55") ? d : `55${d}`;
}
function rand() { return crypto.randomUUID().replace(/-/g, "") + "Aa1!"; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { phone, code } = await req.json();
    const p = normalize(phone);
    if (!p || !code) throw new Error("Dados incompletos");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: otp } = await admin
      .from("signup_otps")
      .select("*")
      .eq("phone", p)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) throw new Error("Código expirado ou inexistente");
    if (otp.attempts >= 5) throw new Error("Muitas tentativas. Peça um novo código");
    if (otp.code !== String(code).trim()) {
      await admin.from("signup_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      throw new Error("Código inválido");
    }
    await admin.from("signup_otps").update({ verified: true }).eq("id", otp.id);

    const email = `wa_${p}@barberpro.local`;
    const password = rand();

    // Try create; if exists, update password so we can sign in
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone: `+${p}`,
      phone_confirm: true,
      user_metadata: { full_name: otp.full_name || "" },
    });

    let userId = created?.user?.id;
    if (createErr) {
      // Existing user — find and reset password
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u: any) => u.email === email);
      if (!existing) throw createErr;
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, { password });
    }

    // Ensure profile
    if (userId) {
      await admin.from("profiles").upsert({
        user_id: userId,
        full_name: otp.full_name || "",
        phone: p,
      }, { onConflict: "user_id" });
    }

    return new Response(JSON.stringify({ ok: true, email, password }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
