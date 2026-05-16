## Plano de implementação

### 1. Planos — mostrar apenas os do domínio
- `ClientePlanos.tsx`: usar `useClientBarbershop` para travar a barbearia atual (a do domínio/contexto), removendo o seletor de múltiplas barbearias. Só carrega `plans` daquela `barbershop_id`.

### 2. Barbeiros (nova área no admin)
- Nova tabela `barbers`: `id, owner_id, barbershop_id, name, commission_pct (0-100), active, created_at, updated_at`.
- RLS: admin gerencia os próprios (`owner_id = auth.uid()`); leitura pública dos ativos para aparecer no agendamento.
- Nova página `src/pages/admin/AdminBarbeiros.tsx` com CRUD (nome + % de comissão + ativo).
- Item no `AppSidebar` ("Barbeiros") e rota em `App.tsx`.
- Substituir o `barber` (texto livre) no agendamento por seleção dos barbeiros cadastrados da barbearia.

### 3. Serviços/Cortes (nova área no admin)
- Nova tabela `services`: `id, owner_id, barbershop_id, name, price, duration_min, active`.
- RLS análoga (admin do dono gerencia; público lê ativos).
- Nova página `src/pages/admin/AdminServicos.tsx` (CRUD nome/preço/duração).
- Item no sidebar ("Cortes & Preços") + rota.
- `ClienteAgendamento.tsx` e `Agendamento.tsx`: trocar lista hardcoded de serviços por consulta a `services` da barbearia, mantendo preço para uso no financeiro.

### 4. Confirmar atendimentos avulsos + concluídos no Dashboard
- Adicionar coluna `price numeric` em `appointments` (default 0) para guardar valor do corte.
- Ao concluir um agendamento (status `concluido`) no admin (`Agendamento.tsx`), abrir confirmação e lançar automaticamente uma `transactions` (tipo `entrada`, descrição "Corte - {serviço}", `value = price`, `owner_id`), evitando duplicar se já existir lançamento para o appointment (campo `notes` com tag `appt:{id}`).
- Botão "Atendimento avulso" no admin Agendamento para registrar um corte fora de plano: cria appointment já como `concluido` + transação.
- `Dashboard.tsx`: passar a calcular dados reais:
  - Cortes Hoje: count de appointments `concluido` hoje do owner.
  - Receita do Dia: sum de `transactions` (entrada) de hoje.
  - Clientes Ativos: count distinct user_id em subscriptions ativas da barbearia.
  - Ticket Médio: receita/cortes.
  - Gráfico semanal: cortes concluídos por dia da semana atual.
  - Últimos cortes: últimos appointments `concluido`.

### Detalhes técnicos
- Migração única cobrindo: criar `barbers`, `services`, adicionar `price` em `appointments`, RLS de todas.
- Edge functions não precisam alteração.
- Atualizar `useClientBarbershop` se necessário (já resolve por slug/contexto).

Confirma que sigo nessa direção?
