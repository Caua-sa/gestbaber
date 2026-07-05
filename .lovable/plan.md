# Plano de Implementação

## 1. WhatsApp — QR Code + Servidor Baileys externo
Como o Lovable Cloud não roda processo Node 24/7, o QR precisa vir de um servidor externo (Railway/Render/VPS). Vou entregar tudo pronto:

- **Nova aba "Conectar via QR" em `AdminWhatsApp.tsx`**:
  - Campo pra colar a URL do servidor Baileys + token compartilhado.
  - Botão "Gerar QR" chama `GET {url}/qr` e renderiza a imagem.
  - Botão "Abrir WhatsApp Web" (link `https://web.whatsapp.com`).
  - Status da sessão (conectado / desconectado / aguardando).
- **Edge function `whatsapp-bridge`**: proxy autenticado entre o app e o servidor externo (envio de mensagem, status, QR). Passa a ser o único ponto de saída — a `whatsapp-send` e o cron passam a chamar essa bridge quando o modo for `baileys`.
- **Coluna nova `whatsapp_settings.mode`** (`cloud` | `baileys`) + `baileys_url` + `baileys_token`. O usuário escolhe qual usar.
- **Pasta `baileys-server/`** no repo com `package.json`, `server.js` (Express + `@whiskeysockets/baileys` + `qrcode`) e `README.md` com passo a passo pra subir no Railway em 3 cliques. Também expõe `POST /webhook-in` que encaminha mensagens recebidas pro Lovable, onde o bot vai processar.

## 2. Bot conversacional (menu + agendar + consultar + IA)
- **Edge function `whatsapp-bot-inbound`**: recebe mensagens do cliente (via Meta webhook OU Baileys webhook), identifica o cliente pelo telefone, e roda a máquina de estados:
  - `menu` → 1️⃣ Agendar 2️⃣ Meu plano 3️⃣ Meus horários 4️⃣ Endereço 5️⃣ Falar com humano 6️⃣ Perguntar à IA
  - `agendar` → lista serviços numerados → pede data → mostra horários livres → confirma e grava em `appointments`.
  - `plano` / `horarios` → consulta `subscriptions` / `appointments` do `user_id` do telefone.
  - `humano` → marca conversa como escalada (aparece pra admin numa aba nova).
  - `ia` → chama Lovable AI Gateway (Gemini) com contexto da barbearia (já existe padrão no `cliente-chat`).
- Tabelas novas: `whatsapp_conversations` (estado, contexto JSON, escalated) e `whatsapp_messages` (log in/out) — com RLS pro owner ver as próprias.

## 3. Lembrete 1h antes (soma ao de 24h)
- Migration: `whatsapp_settings` ganha `reminder_1h_enabled` + `template_reminder_1h`. `appointments` ganha `reminder_1h_sent_at`.
- No `whatsapp-bot-cron`: novo bloco que busca agendamentos daqui a ~60min (janela 55–75min) e envia o template curto ("Faltam ~1h pro seu horário na {barbearia}").
- Cron continua rodando a cada 15min (janela 55–75 cobre tranquilo).

## 4. Cancelamento de assinatura (cliente e admin)
- **Cliente** em `ClientePlanos.tsx`: botão "Cancelar assinatura" (com confirm modal) só quando `status='ativo'`. Chama a edge function `mp-cancel-subscription` já existente e atualiza `subscriptions.status='cancelado'`. Mostra aviso: "Você continua com acesso até {expires_at}".
- **Admin** em `Financeiro.tsx` (na tabela nova de Assinaturas): botão de cancelar por linha, mesma função.
- A assinatura fica válida até `expires_at` (mês vigente) — só o auto-renew é bloqueado. Isso já é o comportamento MP.

## 5. PWA — nome + logo ao adicionar à tela inicial
- `public/manifest.webmanifest` com `name`, `short_name`, `theme_color`, `background_color` e `icons` (192/512).
- Gerar dois ícones (logo barber dourado/preto) via imagegen e subir via lovable-assets, referenciados no manifest.
- `index.html`: `<link rel="manifest">`, `<meta name="theme-color">`, `<link rel="apple-touch-icon">`, og:image apontando pro ícone 512.
- Como o nome/logo variam por barbearia, o manifest usa a marca padrão do sistema; a página `BarbershopPublic.tsx` já sobrescreve `<title>` e og por barbearia via `siteBranding.ts`.

## 6. Foto opcional do barbeiro
- Migration: `barbers.photo_url TEXT`.
- Reaproveita o bucket público `barbershop-logos` (já existe) com prefixo `barbers/`.
- `AdminBarbeiros.tsx`: input de upload (opcional) → `supabase.storage.upload` → salva URL. Preview na listagem com Avatar circular.
- `LandingPage.tsx` seção barbeiros já renderiza; passa a exibir a foto quando existir.

## 7. Config de aniversário (prêmio + mensagem)
- Migration em `whatsapp_settings`: `birthday_discount_percent INT DEFAULT 10`, `birthday_valid_days INT DEFAULT 1` (1 = só no dia).
- Na aba "Bot Automático" > card Aniversário: dois inputs a mais (% desconto e dias de validade) além do template.
- `ClienteLoja.tsx` (já aplica 10% fixo hoje) passa a ler `whatsapp_settings.birthday_discount_percent` do owner da barbearia.
- Variáveis do template ganham `{desconto}` e `{validade}`.

---

## Estrutura técnica resumida
```text
supabase/functions/
  whatsapp-bridge/           (proxy pro Baileys externo — send/qr/status)
  whatsapp-bot-inbound/      (webhook: menu, agendar, IA)
  whatsapp-bot-cron/         (+ bloco lembrete 1h)
  mp-cancel-subscription/    (já existe — reusar)

baileys-server/              (código pra o usuário hospedar)
  server.js, package.json, README.md

src/pages/admin/
  AdminWhatsApp.tsx          (aba QR + config aniversário)
  AdminBarbeiros.tsx         (upload foto)

src/pages/
  Financeiro.tsx             (botão cancelar por assinatura)

src/components/cliente/
  ClientePlanos.tsx          (botão cancelar)
  ClienteLoja.tsx            (% aniversário dinâmico)

public/manifest.webmanifest  (PWA)
index.html                   (manifest + theme-color + apple-touch-icon)
```

## Migrations (uma só)
- `whatsapp_settings`: `+ mode, baileys_url, baileys_token, reminder_1h_enabled, template_reminder_1h, birthday_discount_percent, birthday_valid_days`
- `appointments`: `+ reminder_1h_sent_at`
- `barbers`: `+ photo_url`
- `whatsapp_conversations` (nova) e `whatsapp_messages` (nova) com RLS por owner
- Grants padrão em todas as novas tabelas

## Ordem de execução
1. Migration única com todas as colunas/tabelas.
2. Edge functions (`whatsapp-bridge`, `whatsapp-bot-inbound`, update no `-cron`).
3. Servidor Baileys (`baileys-server/`) + README de deploy.
4. UI admin (WhatsApp QR + aniversário + foto barbeiro + cancelar assinatura no Financeiro).
5. UI cliente (cancelar plano).
6. PWA (manifest + ícones + tags).
7. Testes: enviar mensagem teste, executar cron manual, validar cancelamento, adicionar à tela inicial no mobile.

## Observações
- O servidor Baileys precisa ficar rodando 24/7 — vou deixar um botão "Deploy no Railway" no README com o template pronto. Custo típico: US$ 5/mês.
- Se o WhatsApp desconectar (limpou sessão no celular), o admin precisa gerar novo QR — a UI mostra o estado em tempo real.
- Cancelamento no Mercado Pago só interrompe a próxima cobrança; o acesso do mês pago continua até `expires_at` — deixo isso claro na UI.
