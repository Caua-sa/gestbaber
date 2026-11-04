// WhatsApp Bot Inbound — receives messages from Meta webhook or Baileys webhook
// and runs a stateful bot: menu + agendar + consultar + IA (Gemini).
//
// Body (Baileys forwards this):
//   { owner_id, phone, message }
// Meta webhook: standard Cloud API GET (verify) and POST (event).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const lovableKey = Deno.env.get("LOVABLE_API_KEY");

const admin = createClient(supabaseUrl, serviceKey);

async function sendReply(ownerId: string, phone: string, text: string) {
  const { data: s } = await admin
    .from("whatsapp_settings")
    .select("mode, phone_number_id, access_token, baileys_url, baileys_token")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!s) return;
  try {
    if (s.mode === "extension" && s.baileys_url) {
      await fetch(s.baileys_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(s.baileys_token ? { Authorization: `Bearer ${s.baileys_token}` } : {}),
        },
        body: JSON.stringify({ action: "send_message", phone: phone.replace(/\D/g, ""), message: text.slice(0, 4000) }),
      });
    } else if (s.mode === "baileys" && s.baileys_url) {
      await fetch(s.baileys_url.replace(/\/$/, "") + "/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(s.baileys_token ? { Authorization: `Bearer ${s.baileys_token}` } : {}),
        },
        body: JSON.stringify({ to: phone.replace(/\D/g, ""), message: text.slice(0, 4000) }),
      });
    } else if (s.phone_number_id && s.access_token) {
      await fetch(`https://graph.facebook.com/v20.0/${s.phone_number_id}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${s.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/\D/g, ""),
          type: "text",
          text: { body: text.slice(0, 4000) },
        }),
      });
    }
  } catch (e) {
    console.error("sendReply error", e);
  }
  await admin.from("whatsapp_messages").insert({
    owner_id: ownerId,
    phone,
    direction: "out",
    body: text,
  });
}

const MENU = `Olá! 👋 Como posso ajudar?

1️⃣ Agendar horário
2️⃣ Meu plano / assinatura
3️⃣ Meus horários
4️⃣ Endereço da barbearia
5️⃣ Falar com atendente
6️⃣ Perguntar qualquer coisa (IA)

Digite o *número* da opção.`;

async function askAI(shopName: string, question: string, ctx: string) {
  if (!lovableKey) return "IA indisponível no momento.";
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `Você é a assistente virtual da barbearia ${shopName}. Responda de forma curta, cordial e útil (máx 500 chars). Contexto: ${ctx}` },
          { role: "user", content: question },
        ],
      }),
    });
    const j = await r.json();
    return j?.choices?.[0]?.message?.content?.trim() || "Não consegui responder agora.";
  } catch {
    return "Não consegui responder agora.";
  }
}

async function findUserByPhone(phone: string) {
  const clean = phone.replace(/\D/g, "");
  const { data } = await admin.from("profiles").select("user_id, full_name").ilike("phone", `%${clean.slice(-8)}%`).limit(1);
  return data?.[0] || null;
}

async function handleMessage(ownerId: string, phone: string, message: string) {
  const text = message.trim();
  await admin.from("whatsapp_messages").insert({ owner_id: ownerId, phone, direction: "in", body: text });

  // Get or create conversation
  const { data: existing } = await admin
    .from("whatsapp_conversations")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("phone", phone)
    .maybeSingle();

  let conv = existing;
  if (!conv) {
    const { data } = await admin
      .from("whatsapp_conversations")
      .insert({ owner_id: ownerId, phone, state: "menu", context: {} })
      .select()
      .single();
    conv = data!;
  }
  if (conv.escalated) return; // human is handling

  const { data: shop } = await admin.from("barbershops").select("*").eq("owner_id", ownerId).maybeSingle();
  const shopName = shop?.name || "a barbearia";

  const setState = (state: string, context: Record<string, unknown> = {}) =>
    admin.from("whatsapp_conversations")
      .update({ state, context, last_message_at: new Date().toISOString() })
      .eq("id", conv!.id);

  const lower = text.toLowerCase();
  if (["menu", "oi", "olá", "ola", "start", "início", "inicio", "0"].includes(lower)) {
    await setState("menu");
    return sendReply(ownerId, phone, MENU);
  }

  const state = conv.state || "menu";

  if (state === "menu") {
    if (text === "1") {
      // list services
      const { data: services } = await admin
        .from("services").select("id,name,price,duration_min").eq("owner_id", ownerId).eq("active", true).order("price").limit(15);
      if (!services?.length) return sendReply(ownerId, phone, "Nenhum serviço cadastrado ainda.");
      const list = services.map((s, i) => `${i + 1}) ${s.name} — R$ ${Number(s.price).toFixed(2)}`).join("\n");
      await setState("agendar_servico", { services });
      return sendReply(ownerId, phone, `Escolha o serviço:\n\n${list}\n\nDigite o número.`);
    }
    if (text === "2") {
      const u = await findUserByPhone(phone);
      if (!u) return sendReply(ownerId, phone, "Não encontrei seu cadastro. Faça login pelo site primeiro.");
      const { data: sub } = await admin
        .from("subscriptions")
        .select("status, expires_at, plans(name, price)")
        .eq("user_id", u.user_id)
        .in("status", ["ativo", "cancelando"])
        .maybeSingle();
      if (!sub) return sendReply(ownerId, phone, "Você não tem assinatura ativa. Digite *menu* pra voltar.");
      return sendReply(ownerId, phone, `📋 Plano: ${(sub as any).plans?.name}\nStatus: ${sub.status}\nVálido até: ${sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("pt-BR") : "-"}\n\nDigite *menu* pra voltar.`);
    }
    if (text === "3") {
      const u = await findUserByPhone(phone);
      if (!u) return sendReply(ownerId, phone, "Não encontrei seu cadastro. Faça login pelo site primeiro.");
      const { data: appts } = await admin
        .from("appointments")
        .select("appointment_date, appointment_time, status, services(name)")
        .eq("owner_id", ownerId).eq("user_id", u.user_id)
        .gte("appointment_date", new Date().toISOString().slice(0, 10))
        .in("status", ["agendado", "confirmado"])
        .order("appointment_date").limit(5);
      if (!appts?.length) return sendReply(ownerId, phone, "Nenhum horário futuro. Digite 1 pra agendar.");
      return sendReply(ownerId, phone, "📅 Seus próximos horários:\n\n" + appts.map(a => `• ${a.appointment_date} ${(a.appointment_time || "").slice(0,5)} — ${(a as any).services?.name || ""}`).join("\n") + "\n\nDigite *menu* pra voltar.");
    }
    if (text === "4") {
      return sendReply(ownerId, phone, `📍 ${shopName}\n${shop?.address || "Endereço não cadastrado"}\n📞 ${shop?.phone || ""}\n\nDigite *menu* pra voltar.`);
    }
    if (text === "5") {
      await admin.from("whatsapp_conversations").update({ escalated: true }).eq("id", conv.id);
      return sendReply(ownerId, phone, "Ok! Um atendente vai te responder em breve. 🙋");
    }
    if (text === "6") {
      await setState("ia");
      return sendReply(ownerId, phone, "Pode perguntar! Vou responder com IA. (Digite *menu* pra voltar)");
    }
    return sendReply(ownerId, phone, MENU);
  }

  if (state === "agendar_servico") {
    const idx = parseInt(text, 10) - 1;
    const services = (conv.context as any)?.services || [];
    const svc = services[idx];
    if (!svc) return sendReply(ownerId, phone, "Opção inválida. Digite o número do serviço.");
    await setState("agendar_data", { service: svc });
    return sendReply(ownerId, phone, `Ótimo, *${svc.name}*.\nDigite a data desejada (AAAA-MM-DD, ex: ${new Date(Date.now()+86400000).toISOString().slice(0,10)}).`);
  }

  if (state === "agendar_data") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return sendReply(ownerId, phone, "Formato inválido. Use AAAA-MM-DD.");
    const svc = (conv.context as any)?.service;
    const { data: taken } = await admin
      .from("appointments").select("appointment_time")
      .eq("owner_id", ownerId).eq("appointment_date", text)
      .in("status", ["agendado", "confirmado"]);
    const takenSet = new Set((taken || []).map(t => (t.appointment_time || "").slice(0, 5)));
    const slots: string[] = [];
    for (let h = 9; h < 19; h++) for (const m of [0, 30]) {
      const s = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      if (!takenSet.has(s)) slots.push(s);
    }
    if (!slots.length) return sendReply(ownerId, phone, "Sem horários livres nesse dia. Tente outra data.");
    const showing = slots.slice(0, 12);
    await setState("agendar_hora", { service: svc, date: text, slots: showing });
    return sendReply(ownerId, phone, `Horários livres em ${text}:\n\n${showing.map((s,i)=>`${i+1}) ${s}`).join("\n")}\n\nDigite o número.`);
  }

  if (state === "agendar_hora") {
    const idx = parseInt(text, 10) - 1;
    const ctx = conv.context as any;
    const hour = ctx?.slots?.[idx];
    if (!hour) return sendReply(ownerId, phone, "Opção inválida.");
    const u = await findUserByPhone(phone);
    const { error } = await admin.from("appointments").insert({
      owner_id: ownerId,
      user_id: u?.user_id || null,
      client_name: u?.full_name || null,
      client_phone: phone,
      service_id: ctx.service.id,
      appointment_date: ctx.date,
      appointment_time: hour + ":00",
      status: "agendado",
    });
    if (error) return sendReply(ownerId, phone, "Erro ao agendar: " + error.message);
    await setState("menu");
    return sendReply(ownerId, phone, `✅ Agendado: *${ctx.service.name}* em ${ctx.date} às ${hour}.\n\nDigite *menu* pra voltar.`);
  }

  if (state === "ia") {
    const answer = await askAI(shopName, text, `Endereço: ${shop?.address || "-"}. Telefone: ${shop?.phone || "-"}.`);
    return sendReply(ownerId, phone, answer + "\n\n(Digite *menu* pra voltar)");
  }

  await setState("menu");
  return sendReply(ownerId, phone, MENU);
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

async function freeSlots(ownerId: string, date: string, barberName?: string | null) {
  let q = admin.from("appointments").select("appointment_time, barber")
    .eq("owner_id", ownerId).eq("appointment_date", date)
    .in("status", ["agendado", "confirmado", "pendente"]);
  const { data: taken } = await q;
  const takenSet = new Set((taken || [])
    .filter((t) => !barberName || norm(t.barber || "") === norm(barberName))
    .map((t) => (t.appointment_time || "").slice(0, 5)));
  const slots: string[] = [];
  for (let h = 9; h < 19; h++) for (const m of [0, 30]) {
    const s = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    if (!takenSet.has(s)) slots.push(s);
  }
  return slots;
}

async function handleAction(ownerId: string, b: Record<string, any>): Promise<{ status: number; body: unknown }> {
  const { data: settings } = await admin.from("whatsapp_settings")
    .select("baileys_token, mode").eq("owner_id", ownerId).maybeSingle();
  if (!settings) return { status: 404, body: { error: "Barbearia não encontrada ou WhatsApp não configurado" } };
  if (settings.mode === "extension" && settings.baileys_token && b.token !== settings.baileys_token) {
    return { status: 401, body: { error: "Token inválido" } };
  }
  const { data: shop } = await admin.from("barbershops").select("id, name").eq("owner_id", ownerId).maybeSingle();
  if (!shop) return { status: 404, body: { error: "Barbearia não encontrada" } };

  const action = String(b.action);
  const date = String(b.date || "");
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);

  if (action === "check_availability" || action === "consultar_horarios") {
    if (!validDate) return { status: 400, body: { error: "date obrigatório (AAAA-MM-DD)" } };
    const slots = await freeSlots(ownerId, date, b.barber || null);
    return { status: 200, body: { ok: true, date, barber: b.barber || null, available: slots } };
  }

  if (action === "create_appointment" || action === "criar_agendamento") {
    const name = String(b.clientName || "").trim().slice(0, 120);
    const phone = String(b.clientPhone || "").replace(/\D/g, "").slice(0, 20);
    const time = String(b.time || "").slice(0, 5);
    if (!name || !validDate || !/^\d{2}:\d{2}$/.test(time) || !b.service) {
      return { status: 400, body: { error: "clientName, service, date (AAAA-MM-DD) e time (HH:MM) são obrigatórios" } };
    }
    const { data: services } = await admin.from("services").select("id, name").eq("owner_id", ownerId).eq("active", true);
    const wanted = String(b.service).split(/[+,]/).map(norm).filter(Boolean);
    const matched = (services || []).filter((s) => wanted.some((w) => norm(s.name).includes(w) || w.includes(norm(s.name))));
    if (!matched.length) {
      return { status: 400, body: { error: "Serviço não encontrado", services: (services || []).map((s) => s.name) } };
    }
    const { data: barbers } = await admin.from("barbers").select("name").eq("owner_id", ownerId).eq("active", true);
    let barber = (barbers || []).find((x) => b.barber && norm(x.name) === norm(String(b.barber)))?.name;
    if (!barber) {
      for (const x of barbers || []) {
        if ((await freeSlots(ownerId, date, x.name)).includes(time)) { barber = x.name; break; }
      }
    }
    if (!barber) return { status: 409, body: { error: "Nenhum barbeiro livre nesse horário" } };
    if (!(await freeSlots(ownerId, date, barber)).includes(time)) {
      return { status: 409, body: { error: "Horário indisponível", available: await freeSlots(ownerId, date, barber) } };
    }
    const { data: row, error } = await admin.from("guest_bookings").insert({
      barbershop_id: shop.id, owner_id: ownerId, name, phone: phone || null,
      service: matched.map((s) => s.name).join(" + "), service_ids: matched.map((s) => s.id),
      barber, preferred_date: date, preferred_time: time,
      notes: String(b.notes || "Agendamento via WhatsApp").slice(0, 500),
    }).select("id").single();
    if (error) return { status: 409, body: { error: error.message } };
    return { status: 200, body: { ok: true, id: row.id, barbershop: shop.name, service: matched.map((s) => s.name).join(" + "), barber, date, time, status: "confirmado" } };
  }

  if (action === "send_reminder" || action === "aviso_horario" || action === "list_appointments") {
    const day = validDate ? date : new Date().toISOString().slice(0, 10);
    const { data: appts } = await admin.from("appointments")
      .select("id, appointment_date, appointment_time, service, barber, notes, user_id, status")
      .eq("owner_id", ownerId).eq("appointment_date", day)
      .in("status", ["agendado", "confirmado"]).order("appointment_time");
    const ids = [...new Set((appts || []).map((a) => a.user_id).filter(Boolean))];
    const { data: profs } = ids.length
      ? await admin.from("profiles").select("user_id, full_name, phone").in("user_id", ids)
      : { data: [] as any[] };
    const list = (appts || []).map((a) => {
      const p = (profs || []).find((x: any) => x.user_id === a.user_id);
      const parts = String(a.notes || "").split("||");
      const clientName = parts.length >= 2 && parts[0] ? parts[0] : p?.full_name || "Cliente";
      const clientPhone = (parts.length >= 2 && parts[1] ? parts[1] : p?.phone || "").replace(/\D/g, "");
      const time = (a.appointment_time || "").slice(0, 5);
      return {
        id: a.id, clientName, clientPhone, service: a.service, barber: a.barber, date: a.appointment_date, time,
        message: `Olá ${clientName}! ⏰ Lembrete: seu horário em *${shop.name}* é ${a.appointment_date.split("-").reverse().join("/")} às ${time} (${a.service} com ${a.barber}).`,
      };
    });
    return { status: 200, body: { ok: true, date: day, appointments: list } };
  }

  return { status: 400, body: { error: "Ação desconhecida", actions: ["create_appointment", "check_availability", "send_reminder"] } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Meta webhook verification
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && challenge) return new Response(challenge, { status: 200 });
    return new Response("ok");
  }

  try {
    const body = await req.json();

    // BarberBot / extension structured actions
    if (body.action && body.owner_id) {
      const result = await handleAction(String(body.owner_id), body);
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Baileys shape
    if (body.owner_id && body.phone && body.message) {
      await handleMessage(body.owner_id, String(body.phone), String(body.message));
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Meta Cloud API shape
    if (body.entry) {
      for (const e of body.entry || []) {
        for (const ch of e.changes || []) {
          const value = ch.value;
          const phoneNumberId = value?.metadata?.phone_number_id;
          if (!phoneNumberId) continue;
          const { data: settings } = await admin
            .from("whatsapp_settings").select("owner_id").eq("phone_number_id", phoneNumberId).maybeSingle();
          if (!settings) continue;
          for (const m of value.messages || []) {
            const from = m.from;
            const txt = m.text?.body || m.button?.text || "";
            if (from && txt) await handleMessage(settings.owner_id, from, txt);
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
