// Baileys server for Barber Pro — expõe QR e envio de mensagem via HTTP.
// Endpoints:
//   GET  /qr          -> { qr: "data:image/png;...", status }
//   GET  /status      -> { status, phone }
//   POST /send        -> { to, message }
//   POST /logout      -> derruba a sessão
// Todas as rotas exigem header Authorization: Bearer <SHARED_TOKEN> quando definido.
//
// Env:
//   PORT            (default 3000)
//   SHARED_TOKEN    (opcional — trave contra chamadas externas)
//   WEBHOOK_URL     (opcional — encaminha mensagens recebidas)
//   WEBHOOK_OWNER_ID(uuid do dono no Barber Pro; enviado ao webhook)

import express from "express";
import qrcode from "qrcode";
import pino from "pino";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.SHARED_TOKEN || "";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const WEBHOOK_OWNER_ID = process.env.WEBHOOK_OWNER_ID || "";

let sock = null;
let latestQR = null;
let status = "disconnected";
let me = null;
const logger = pino({ level: "warn" });

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth");
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({ version, auth: state, printQRInTerminal: false, logger });
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) {
      latestQR = await qrcode.toDataURL(qr);
      status = "waiting_qr";
    }
    if (connection === "open") {
      status = "connected";
      latestQR = null;
      me = sock.user?.id?.split(":")[0] || null;
      console.log("✅ WhatsApp conectado:", me);
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      status = "disconnected";
      if (code !== DisconnectReason.loggedOut) setTimeout(start, 2000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    if (!WEBHOOK_URL) return;
    for (const m of messages) {
      if (m.key.fromMe) continue;
      const from = m.key.remoteJid?.split("@")[0];
      const body =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.buttonsResponseMessage?.selectedButtonId ||
        "";
      if (!from || !body) continue;
      try {
        await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner_id: WEBHOOK_OWNER_ID, phone: from, message: body }),
        });
      } catch (e) {
        console.error("webhook error:", e.message);
      }
    }
  });
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  if (!TOKEN) return next();
  const h = req.headers.authorization || "";
  if (h === `Bearer ${TOKEN}`) return next();
  return res.status(401).json({ error: "unauthorized" });
});

app.get("/qr", (_req, res) => res.json({ qr: latestQR, status }));
app.get("/status", (_req, res) => res.json({ status, phone: me }));

app.post("/send", async (req, res) => {
  try {
    if (status !== "connected") return res.status(400).json({ error: "não conectado" });
    const { to, message } = req.body || {};
    if (!to || !message) return res.status(400).json({ error: "to e message obrigatórios" });
    const jid = String(to).replace(/\D/g, "") + "@s.whatsapp.net";
    await sock.sendMessage(jid, { text: String(message) });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/logout", async (_req, res) => {
  try {
    await sock?.logout();
    status = "disconnected";
    me = null;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Baileys server rodando na porta ${PORT}`);
  start().catch(console.error);
});
