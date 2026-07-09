# Roadmap do Produto — MigoBox

Visão → estado atual → lacunas, por prioridade. Cross-ref: `architecture.md`, `backend-api.md`, `design-system.md`, `MigoBox/.docs/api-todos.md`.

## Visão do produto

O MigoBox é uma "agenda" de amigos e familiares onde o usuário:
1. Cadastra seus migos (nome, relação, cidade, nascimento, gênero, foto/avatar).
2. Conversa com um **agente de IA** para refinar o **perfil** da pessoa (gostos, personalidade, dislikes).
3. Cria **lembretes** de datas importantes (aniversários, aniversário de casamento, datas festivas).
4. Gera **ideias de presente e passeios** com o "Migo", com base em **personalidade, gostos, idade, cidade e budget** — **automaticamente** (associado a lembretes/datas) e **sob demanda**.

Público-alvo: jovens de 15 a 35 anos. Tom: lúdico e acolhedor.

## Estado atual por tela

| Tela | Faz hoje | Gap vs visão |
|---|---|---|
| `index` (login) | Lookup por e-mail (`findUserByEmail`) | Sem auth real (token/JWT); sem cadastro de usuário. |
| `home` | Lista amigos + lembretes próximos (≤30d) + FAB | Progresso do perfil **0%** (não usa `profile` embutido); nav só 2 tabs; stats e notificações são TODO. |
| `add-friend` | Wizard 2 passos + upload de foto via signed URL | Sem edição posterior de amigo (POST `/friends/{friendId}` não usado). |
| `chat-builder` | `agentChat`/`agentFinalize` para construir perfil | Só perfil; sem reset de sessão (`DELETE .../session/{friendId}`). |
| `friend-profile` | Raio-X (tags filtráveis) + gerar/listar presentes via `createSuggestions` | Só **presentes**; sem **passeios**; sem **budget**; sem refinement por gift (`/suggestions/agent/*`); sem vincular lembrete. |

## Lacunas por prioridade

### P0 — núcleo da visão, bloqueia o "migo que presenteia/passeia" ✅ Done 

- **Budget não modelado.** Não há campo de orçamento em `domain`, em `SuggestionCreateRequest`, nem na UI. A visão exige sugestões por budget.
  - Proposta: adicionar `budget` (string range ou `{min, max, currency}`) em `SuggestionCreateRequest` e no `apiClient.createSuggestions`; expor input na tela de perfil/amigo; repassar ao gerar.
- **Passeios inexistentes.** Só existe `domain.Gift` (e endpoints de gift). A visão pede também **passeios**.
  - Propostas (a definir com backend):
    - (a) Reaproveitar `Gift` com `category: 'gift' | 'outing'` (+ talvez `duration`, `location`); ou
    - (b) Nova entidade `domain.Outing` + endpoints espelho dos gifts.
  - UI: separar/seção "Presentes" vs "Passeios" no perfil, com ícones distintos (🎁 / 🎟️ / 🗺️).
- **Profile embutido não consumido na Home.** O swagger traz `domain.Friend.profile` embutido, mas a Home chama só `listFriendsByUserId` e a barra de progresso fica `0%` (TODO no código). Implementar `calcProfileProgress` a partir do `friend.profile` retornado (likes+dislikes+personality / 12) — igual ao `figma_proto` e ao `friend-profile.tsx`.
- **Suggestion-agent não implementado no mobile.** `/suggestions/agent/chat` e `/suggestions/agent/finalize` existem no backend e no figma, mas o `api-client` não expõe. Adicionar `suggestionChat(giftId, message)` e `suggestionFinalize(giftId)` + UI de chat de refinement por presente (similar ao chat-builder).

### P1 — automação e confiança ✅ Done 

- **Sugestões automáticas.** Hoje só sob demanda (botão na tela do amigo). A visão exige geração **automática** atrelada a lembretes/datas.
  - Ideias: job no backend que, ao criar/atualizar um lembrete (ou X dias antes do `triggerAt`), dispare `createSuggestions` com `reminderID` + budget default; app recebe via push/notificação.
  - App: na Home, badge/alerta de "presente pronto para {migo}" e deep-link para o perfil/gift.
  - Requer **notificações** (ver P2) e definir budget default do usuário.
- **Autenticação/sessão real.** Hoje é só lookup por e-mail, sem persistência/token. Definir JWT/sessão + secure storage; `UserProvider` deixa de ser só em memória.


### P2 — completude de navegação e conta

- **Navegação 3 tabs** (Caixinha / Datas / Eu) conforme `figma_proto/App.tsx`. Hoje só 2 (Migos/Datas) e ambas stub.
  - Datas: Calendário marcando as datas dos lembretes atuais (Calcular recorrentes (max 5 anos))
  - Eu: perfil do usuário, preferências, budget default, plano.
- **Notificações e Configurações** (TODO no `api-todos.md`): endpoints de notificações não lidas + preferências.
- **Detalhe do lembrete** (TODO na Home): rota de detalhe/ação ao tocar num lembrete.
- **Reset de sessão do agente**: DELETE `/profiles/agent/session/{friendId}` (não chamado — útil para "recomeçar conversa").

## Recomendações de modelagem (a alinhar com backend)

- **Budget**: adicionar `budget?: string | { min?: number; max?: number; currency?: string }` em `SuggestionCreateRequest`. String range (`"R$ 100 - R$ 200"`) é mais simples e casa com `Gift.priceRange` já existente.
- **Passeio**: preferir **(a) `category` em `Gift`** para reusar endpoints e UI; se o domínio de passeio divergir muito (duração, local, agenda), seguir **(b)** entidade separada. Validar com backend antes de implementar.
- **Perfil pronto**: usar `friend.profile` embutido + regra `progress = min(100, round((likes+dislikes+personality)/12 * 100))` já existente em `friend-profile.tsx` e no `figma_proto`. Considerar mover essa função para um util compartilhado (`src/utils/profile.ts`) para reusar na Home.
- **Automático vs sob demanda**: manter `createSuggestions` como ponto único; a automação fica no backend (job) usando o mesmo endpoint com `reminderID` preenchido. O app só passa `reminderID` quando o usuário gera manualmente a partir de um lembrete.

## Reminders — status & backend spec

### Status

| Parte | Status |
|---|---|
| Frontend — UI de criar/editar lembrete | ✅ Done (`ReminderFormModal` + seção em `friend-profile.tsx`) |
| Frontend — tipos `domain.ReminderRecurrence` + `ReminderUpsertRequest` | ✅ Done |
| Frontend — `apiClient.createReminder` / `updateReminder` | ✅ Done |
| Swagger — enum `domain.ReminderRecurrence` + campo em `domain.Reminder` / `http.ReminderUpsertRequest` | ✅ Done (`.docs/swagger.yaml`) |
| Backend — modelo/entidade `Reminder` com coluna `recurrence` | ✅ Done |
| Backend — validação de `recurrence` no handler | ✅ Done |
| Backend — cálculo de próximas ocorrências (expansão de recorrência) | ✅ Done|
| Backend — migração de schema | ✅ Done|

> Nota: o backend em Go ignora campos desconhecidos por padrão (`json.Unmarshal`), então criar lembretes **pontuais** (`recurrence: "none"` ou omitido) já funciona hoje. O campo `recurrence` só passa a ser persistido/validado após a adaptação abaixo.
