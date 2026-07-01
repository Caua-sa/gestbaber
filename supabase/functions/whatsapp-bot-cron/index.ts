// WhatsApp Bot Cron — runs periodically to send confirmations, reminders,
// expiration notices and birthday greetings for every barbershop.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fill(tpl: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v ?? "")),
    tpl,
  );
}

async function sendWA(pnid: string, token: string, to: string, msg: string) {
  const clean = String(to).replace(/\D/g, "");
  if (!clean) return { ok: false, error: "invalid phone" };
  const r = await fetch(`https://graph.facebook.com/v20.0/${pnid}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: clean,
      type: "text",
      text: { body: String(msg).slice(0, 4000) },
    }),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const filterOwner = body?.owner_id as string | undefined;

    let q = admin.from("whatsapp_settings").select("*").eq("bot_enabled", true);
    if (filterOwner) q = q.eq("owner_id", filterOwner);
    const { data: shops } = await q;
    if (!shops?.length) {
      return new Response(JSON.stringify({ sent: 0, note: "no shops" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const todayMD = todayStr.slice(5);
    const year = now.getUTCFullYear();
    let totalSent = 0;

    for (const s of shops) {
      if (!s.phone_number_id || !s.access_token) continue;

      const { data: shop } = await admin
        .from("barbershops")
        .select("id,name")
        .eq("owner_id", s.owner_id)
        .maybeSingle();
      const shopName = shop?.name || "Barbearia";
      const link = `${Deno.env.get("SUPABASE_URL")?.replace(/\.supabase\.co.*/, "") || ""}`;

      // 1) Confirmation
      if (s.confirmation_enabled) {
        const { data: appts } = await admin
          .from("appointments")
          .select("id,user_id,client_name,appointment_date,appointment_time,services(name)")
          .eq("owner_id", s.owner_id)
          .is("confirmation_sent_at", null)
          .gte("appointment_date", todayStr)
          .in("status", ["agendado", "confirmado"])
          .limit(50);
        for (const a of appts || []) {
          let phone: string | null = null;
          let name = a.client_name || "cliente";
          if (a.user_id) {
            const { data: p } = await admin.from("profiles").select("phone,full_name").eq("user_id", a.user_id).maybeSingle();
            phone = p?.phone || null;
            name = p?.full_name || name;
          }
          if (!phone) continue;
          const msg = fill(s.template_confirmation, {
            nome: name, barbearia: shopName,
            data: a.appointment_date, hora: (a.appointment_time || "").slice(0, 5),
            servico: (a as any).services?.name || "atendimento",
          });
          const r = await sendWA(s.phone_number_id, s.access_token, phone, msg);
          if (r.ok) {
            await admin.from("appointments").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", a.id);
            totalSent++;
          }
        }
      }

      // 2) Reminder (window)
      if (s.reminder_enabled) {
        const lead = Number(s.reminder_lead_hours || 24);
        const target = new Date(now.getTime() + lead * 3600 * 1000);
        const targetDate = target.toISOString().slice(0, 10);
        const { data: appts } = await admin
          .from("appointments")
          .select("id,user_id,client_name,appointment_date,appointment_time,services(name)")
          .eq("owner_id", s.owner_id)
          .is("reminder_sent_at", null)
          .eq("appointment_date", targetDate)
          .in("status", ["agendado", "confirmado"])
          .limit(50);
        for (const a of appts || []) {
          let phone: string | null = null;
          let name = a.client_name || "cliente";
          if (a.user_id) {
            const { data: p } = await admin.from("profiles").select("phone,full_name").eq("user_id", a.user_id).maybeSingle();
            phone = p?.phone || null;
            name = p?.full_name || name;
          }
          if (!phone) continue;
          const msg = fill(s.template_reminder, {
            nome: name, barbearia: shopName,
            hora: (a.appointment_time || "").slice(0, 5),
            servico: (a as any).services?.name || "atendimento",
          });
          const r = await sendWA(s.phone_number_id, s.access_token, phone, msg);
          if (r.ok) {
            await admin.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", a.id);
            totalSent++;
          }
        }
      }

      // 3) Subscription expiration
      if (s.expiration_enabled) {
        const days = Number(s.expiration_lead_days || 3);
        const until = new Date(now.getTime() + days * 86400 * 1000).toISOString();
        const { data: subs } = await admin
          .from("subscriptions")
          .select("id,user_id,expires_at,plans(name,barbershop_id)")
          .eq("status", "ativo")
          .is("renewal_notified_at", null)
          .lte("expires_at", until)
          .gte("expires_at", now.toISOString())
          .limit(100);
        for (const sub of subs || []) {
          const planShop = (sub as any).plans?.barbershop_id;
          if (planShop && shop?.id && planShop !== shop.id) continue;
          const { data: p } = await admin.from("profiles").select("phone,full_name").eq("user_id", sub.user_id).maybeSingle();
          if (!p?.phone) continue;
          const diff = Math.max(0, Math.ceil((new Date(sub.expires_at as any).getTime() - now.getTime()) / 86400000));
          const msg = fill(s.template_expiration, {
            nome: p.full_name || "cliente",
            plano: (sub as any).plans?.name || "assinatura",
            dias: diff,
            link,
          });
          const r = await sendWA(s.phone_number_id, s.access_token, p.phone, msg);
          if (r.ok) {
            await admin.from("subscriptions").update({ renewal_notified_at: new Date().toISOString() }).eq("id", sub.id);
            totalSent++;
          }
        }
      }

      // 4) Birthday
      if (s.birthday_enabled) {
        // profiles doesn't have owner scoping; scope by clients with appointments/subs at this shop
        const { data: profs } = await admin
          .from("profiles")
          .select("user_id, full_name, phone, birthday, birthday_greeted_year")
          .not("birthday", "is", null)
          .not("phone", "is", null)
          .limit(500);
        for (const p of profs || []) {
          if (!p.birthday) continue;
          if (String(p.birthday).slice(5) !== todayMD) continue;
          if (p.birthday_greeted_year === year) continue;
          // ensure this client belongs to this barbershop
          const { count } = await admin
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", s.owner_id)
            .eq("user_id", p.user_id);
          if (!count) continue;
          const msg = fill(s.template_birthday, { nome: p.full_name || "cliente", barbearia: shopName });
          const r = await sendWA(s.phone_number_id, s.access_token, p.phone!, msg);
          if (r.ok) {
            await admin.from("profiles").update({ birthday_greeted_year: year }).eq("user_id", p.user_id);
            totalSent++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ sent: totalSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
