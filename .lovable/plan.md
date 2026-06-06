## Resumo
Implementar 8 melhorias agrupadas em backend (migrações + edge functions) e frontend (admin + portal cliente).

## Backend / Banco

1. **profiles**: adicionar coluna `birthday DATE` (nullable) e `email TEXT` (sincronizado).
2. **subscriptions**: garantir status `pago` ao confirmar pagamento. Atualizar enum/check para aceitar `pago`. Webhook `mp-subscription-webhook` atualiza status para `pago` quando MP retornar `authorized/approved` e cria transação no Financeiro automaticamente.
3. **mp-create-payment webhook**: ao receber pagamento `approved` da loja, marcar `orders.status='pago'` e inserir linha em `transactions` (categoria "Loja", tipo "entrada").
4. **whatsapp_settings** (nova tabela): `owner_id`, `phone_number_id`, `access_token` (criptografado via secret reference), `business_account_id`, `display_number`. RLS apenas para o owner. Grants padrão.
5. **birthday_discount_percent** em `barbershops` (default 10).
6. Função SQL `has_birthday_today(uuid)` reutilizável.

## Edge Functions

- **mp-subscription-webhook**: setar `status='pago'`, registrar transação.
- **mp-create-payment / novo mp-payment-webhook**: idem para a loja.
- **whatsapp-send** (nova): usa Meta Cloud API com token salvo em `whatsapp_settings` para mandar lembretes de vencimento (substitui wa.me).

## Autenticação Cliente (WhatsApp OTP)

- Habilitar **Supabase Phone Auth** com Twilio (connector).
- Nova tela `/cliente/login` com duas etapas:
  1. Digite WhatsApp → enviar OTP (`supabase.auth.signInWithOtp({ phone })`)
  2. Confirma código → se primeiro login, formulário pede nome, e-mail, data de nascimento e salva no `profiles`.
- Mantém login por e-mail/senha como alternativa.

## Frontend Admin

- **AdminClientes**:
  - Form ganha campo "Data de nascimento" (date picker).
  - Filtro: "Todos / Vencimento ≤ 7 dias / Aniversariantes do dia".
  - Indicador 🎂 quando hoje é aniversário.
- **AdminInsumos**:
  - Barra de busca por nome/fornecedor.
  - Em cada linha, botões `-1`, `-5` e input rápido para baixa de estoque (com `updated_at`).
- **AdminWhatsApp** (nova rota oculta `/admin/whatsapp`, item na sidebar "WhatsApp"):
  - Campos: Phone Number ID, Access Token, Business Account ID, Número de exibição.
  - Botão "Testar envio" chama `whatsapp-send` com mensagem teste.
- **Dashboard**: trocar label "Cortes Hoje" → "Serviços Hoje".
- **Financeiro**: nada estrutural — já lê `transactions`; passa a mostrar pagamentos automáticos das assinaturas/loja.

## Frontend Cliente

- **ClienteLoja / ClientePlanos**: ao calcular total, se `profile.birthday` == hoje, aplica 10% e mostra badge "🎂 Feliz aniversário — 10% off aplicado".
- **Portal**: mostra próximo vencimento e flag de aniversário.

## Configuração Requerida

- Conectar **Twilio** (connector) para Phone Auth.
- Usuário precisa criar app Meta WhatsApp Business e colar credenciais na nova tela.

## Ordem de execução

1. Migração SQL (tabelas/colunas/check).
2. Edge functions atualizadas + nova whatsapp-send.
3. Conectar Twilio e habilitar phone auth.
4. Telas: AdminClientes, AdminInsumos, AdminWhatsApp, Dashboard label, Cliente Login OTP, Loja/Planos com desconto.
