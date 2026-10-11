// Login por WhatsApp usando a extensão externa (envia e valida código).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const BASE = Deno.env.get("WA_EXTENSION_URL") ||
  "https://ais-dev-ajwrikbk7f2dql6n563ykz-185386907795.us-west2.run.app";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function normalize(raw: string) {
  const d = String(raw || "").replace(/\D/g, "");
  return d.startsWith("55") ? d : `55${d}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { action, phone, code, name } = await req.json();
    const p = normalize(phone);
    if (p.length < 12) return json({ error: "Informe o WhatsApp com DDD" }, 400);

    if (action === "send") {
      const r = await fetch(`${BASE}/api/lovable/codes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, customerName: name || "Cliente" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.success === false) return json({ error: d?.error || d?.message || "A extensão não enviou o código" }, 400);
      return json({ ok: true });
    }

    if (action === "verify") {
      if (!code) return json({ error: "Informe o código" }, 400);
      const r = await fetch(`${BASE}/api/lovable/verify-code`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, code: String(code).trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d?.success) return json({ error: d?.error || d?.message || "Código inválido" }, 400);

      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const email = `wa_${p}@barberpro.local`;
      const password = crypto.randomUUID().replace(/-/g, "") + "Aa1!";
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name: name || "" },
      });
      let userId = created?.user?.id;
      if (cErr) {
        const { data: prof } = await admin.from("profiles").select("user_id").eq("email", email).maybeSingle();
        userId = prof?.user_id;
        if (!userId) {
          for (let page = 1; page <= 20 && !userId; page++) {
            const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
            userId = list?.users?.find((u: any) => u.email === email)?.id;
            if (!list?.users?.length) break;
          }
        }
        if (!userId) throw cErr;
        await admin.auth.admin.updateUserById(userId, { password });
      } else if (userId) {
        await admin.from("profiles").upsert({ user_id: userId, full_name: name || "", phone: p, email }, { onConflict: "user_id" });
      }
      return json({ ok: true, email, password });
    }
    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "erro" }, 400);
  }
});
