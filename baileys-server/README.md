# Servidor Baileys — Barber Pro

Servidor Node.js que conecta o WhatsApp Web (via QR Code) ao Barber Pro. **Custo de API: R$ 0** — não usa a API paga da Meta. Só precisa de um lugar pra rodar 24/7 (o Lovable Cloud não roda processos persistentes).

## Modo 100% grátis: PC da barbearia + Cloudflare Tunnel

1. Instale o [Node.js 18+](https://nodejs.org) no computador que já fica ligado na barbearia.
2. Nesta pasta, rode: `npm install` e depois `node server.js` com a variável `SHARED_TOKEN` (ex.: `set SHARED_TOKEN=senha_longa` no Windows, ou `SHARED_TOKEN=senha_longa node server.js` no Mac/Linux).
3. Baixe o [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (grátis) e rode: `cloudflared tunnel --url http://localhost:3000`.
4. Copie a URL `https://....trycloudflare.com` gerada e cole no painel **Admin > WhatsApp > Conectar via QR**, junto com o mesmo `SHARED_TOKEN`.
5. Deixe as duas janelas abertas. A URL muda a cada reinício do cloudflared — para URL fixa grátis, crie conta gratuita na Cloudflare e use um *named tunnel*.

## Deploy na nuvem (24/7 sem PC ligado) — Railway

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
