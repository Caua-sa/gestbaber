import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("register"), token: z.string().min(20).max(4096) }),
  z.object({ action: z.literal("unregister"), token: z.string().min(20).max(4096) }),
  z.object({ action: z.literal("dispatch"), jobId: z.string().uuid(), secret: z.string().uuid() }),
]);
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return reply({ error: "Invalid request" }, 400);
    const body = parsed.data;
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    if (body.action !== "dispatch") {
      const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
      if (!bearer) return reply({ error: "Unauthorized" }, 401);
      const { data: auth, error: authError } = await db.auth.getUser(bearer);
      if (authError || !auth.user) return reply({ error: "Unauthorized" }, 401);
      if (body.action === "unregister") {
        const { error } = await db.from("admin_push_devices").delete().eq("user_id", auth.user.id).eq("token", body.token);
        if (error) throw error;
        return reply({ ok: true });
      }
      const { data: role, error: roleError } = await db.from("user_roles").select("created_by").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle();
      if (roleError || !role) return reply({ error: "Acesso exclusivo ao painel da barbearia." }, 403);
      const ownerId = role.created_by || auth.user.id;
      const { data: shop } = await db.from("barbershops").select("id").eq("owner_id", ownerId).eq("active", true).eq("banned", false).maybeSingle();
      if (!shop) return reply({ error: "Barbearia sem acesso ativo." }, 403);
      const { error } = await db.from("admin_push_devices").upsert({ user_id: auth.user.id, owner_id: ownerId, token: body.token }, { onConflict: "token" });
      if (error) throw error;
      return reply({ ok: true });
    }
    // Per-job unguessable credential: no owner or appointment supplied by a public caller is trusted.
    const { data: job } = await db.from("appointment_push_jobs").select("*").eq("id", body.jobId).eq("secret", body.secret).maybeSingle();
    if (!job) return reply({ error: "Unauthorized" }, 401);
    if (job.completed_at) return reply({ ok: true });
    const { data: appt } = await db.from("appointments").select("*").eq("id", job.appointment_id).maybeSingle();
    if (!appt?.owner_id || ["bloqueado", "cancelado", "concluido"].includes(appt.status)) return reply({ ok: true, skipped: true });
    const { data: devices, error: deviceError } = await db.from("admin_push_devices").select("id,user_id,token").eq("owner_id", appt.owner_id);
    if (deviceError) throw deviceError;
    const delivered: string[] = job.delivered_tokens || [];
    const failures: { status: number; details: string }[] = [];
    for (const device of devices || []) {
      if (delivered.includes(device.token)) continue;
      const { data: role } = await db.from("user_roles").select("created_by").eq("user_id", device.user_id).eq("role", "admin").maybeSingle();
      if (!role || (role.created_by || device.user_id) !== appt.owner_id) continue;
      const key = Deno.env.get("LOVABLE_API_KEY");
      const connectionKey = Deno.env.get("FIREBASE_MESSAGING_API_KEY");
      if (!key || !connectionKey) return reply({ error: "Notificações não configuradas." }, 503);
      const response = await fetch("https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": connectionKey, "Content-Type": "application/json" },
        body: JSON.stringify({ message: { token: device.token, notification: { title: "Novo agendamento · GestBarber", body: `${appt.service} · ${appt.barber} · ${appt.appointment_date.split("-").reverse().join("/")} às ${appt.appointment_time.slice(0, 5)}` }, webpush: { fcm_options: { link: "https://gestbarberapp.app/agendamento" }, notification: { tag: `appointment-${appt.id}`, icon: "/favicon.ico" } }, data: { appointmentId: appt.id, path: "/agendamento" } } }),
      });
      if (!response.ok) {
        const details = await response.text();
        console.error(`Push failed [${response.status}]: ${details}`);
        if ((response.status === 404 && details.includes("UNREGISTERED")) || (response.status === 400 && details.includes("INVALID_ARGUMENT"))) {
          await db.from("admin_push_devices").delete().eq("id", device.id);
        } else failures.push({ status: response.status, details });
        continue;
      }
      delivered.push(device.token);
      const { error } = await db.from("appointment_push_jobs").update({ delivered_tokens: delivered }).eq("id", job.id);
      if (error) throw error;
    }
    if (failures.length) return reply({ error: "Provider request failed", ...failures[0] }, failures[0].status);
    const { error } = await db.from("appointment_push_jobs").update({ completed_at: new Date().toISOString() }).eq("id", job.id);
    if (error) throw error;
    return reply({ ok: true, accepted: delivered.length });
  } catch (error) {
    console.error("admin-appointment-push:", error instanceof Error ? error.message : "Unexpected failure");
    return reply({ error: "Não foi possível processar as notificações." }, 500);
  }
});