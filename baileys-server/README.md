# Servidor Baileys — Barber Pro

Servidor Node.js que conecta o WhatsApp Web (via QR Code) ao Barber Pro. Precisa rodar **24/7** em um servidor externo — o Lovable Cloud não roda processos persistentes.

## Deploy rápido no Railway (recomendado)

1. Crie uma conta em https://railway.app (US$ 5/mês)
2. **New Project → Deploy from GitHub repo** e aponte pra este diretório (`baileys-server/`)
3. Em **Variables** adicione:
   - `SHARED_TOKEN` — invente uma senha longa e aleatória (guarde essa mesma no Barber Pro)
   - `WEBHOOK_URL` — `https://SEU_PROJECT_REF.functions.supabase.co/whatsapp-bot-inbound`
   - `WEBHOOK_OWNER_ID` — seu `user_id` de dono no Barber Pro
4. Deploy. Copie a URL pública (ex: `https://barber-baileys.up.railway.app`)

## Configurar no Barber Pro

Painel **Admin > WhatsApp > Conectar via QR**:
- **URL do servidor**: cole a URL do Railway
- **Token**: cole o `SHARED_TOKEN`
- Clique **Gerar QR** e escaneie com o WhatsApp do celular (Aparelhos conectados → Conectar aparelho)

Pronto — todo envio automático (confirmações, lembretes, aniversário) e as respostas do bot passam a sair pelo seu número.

## Rodar local (teste)

```bash
cd baileys-server
npm install
SHARED_TOKEN=teste123 node server.js
```

Abra `http://localhost:3000/qr` (com header `Authorization: Bearer teste123`) e escaneie.

## Alternativas de hosting

Qualquer VPS/Render/Fly.io funciona. Só precisa: Node 18+, porta pública HTTP, disco persistente pra pasta `./auth` (senão precisa escanear o QR a cada reboot).
