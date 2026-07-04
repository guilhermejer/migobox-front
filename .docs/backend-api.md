# Backend API — MigoBox

Backend em **Go** com agente LLM em **Python**, rodando em `http://localhost:8080` (dev).
Contrato: `.docs/swagger.yaml` (Swagger 2.0). Fonte da verdade no app: `MigoBox/src/api/api-client.ts`.

## Ambiente

- `API_BASE_URL` = `EXPO_PUBLIC_API_BASE_URL` ?? (`10.0.2.2:8080` no Android / `localhost:8080`).
- Logs de rede via `EXPO_PUBLIC_API_DEBUG=true` ou `__DEV__`.
- Erro padronizado pelo app em `ApiError { status: number; message: string }`:
  - em `!response.ok`, lê o body como objeto e pega o **primeiro valor** de string como mensagem;
  - falha de rede → `{ status: 0, message: 'Falha de rede ao chamar a API.' }`.
- Modelo de erro do backend: `http.ErrorResponse { error: string }` (ex.: `"birthDate must be in format YYYY-MM-DD"`).

## Convenção de nomes

- **camelCase** em todos os payloads/corpos do swagger (ex.: `friendID`, `birthDate`, `occasionDetails`, `reminderID`, `priceRange`).
- Paths usam `{friendId}`, `{userId}`, `{giftId}`, `{reminderId}` (camel, `Id` minúsculo).
- ⚠️ `figma_proto/src/app/api.ts` usa **snake_case** (`friend_id`, `occasion_details`, `friend_id`) — **desatualizado**. Não usar como referência de contrato.

## Modelos (definitions do swagger)

`domain.User`: `userID, fullName, email, birthDate(date-time), city, active, planID`
`domain.Friend`: `friendID, userID, name, birthDate(date-time), city, gender, userRelation, avatar, profile?` (perfil **embutido**)
`domain.Gender`: enum `male | female | other`
`domain.Profile`: `friendID, likes[], dislikes[], personality[], embedding[]`
`domain.Gift`: `giftID, friendID, title, description, priceRange, tags[], occasionDetails, reminderID`
`domain.Reminder`: `reminderID, userID, friendID, type, message, triggerAt(date-time)`

Shapes de request (`http.*UpsertRequest`) usam campos opcionais + datas em `format: date` (`YYYY-MM-DD`):
- `FriendUpsertRequest`: `avatar, birthDate(date), city, gender, name, userRelation`
- `ProfileUpsertRequest`: `friendID, likes[], dislikes[], personality[], embedding[]`
- `GiftUpsertRequest`: `description, friendID, occasionDetails, priceRange, reminderID, tags[], title`
- `ReminderUpsertRequest`: `friendID, message, triggerAt(date), type, userID`
- `UserUpsertRequest`: `active, birthDate(date), city, email, fullName, planId`
- `AgentChatRequest`: `friendID, message`
- `AgentFinalizeRequest`: `friendID`
- `SuggestionCreateRequest`: `occasionDetails, reminderID`
- `SuggestionChatRequest`: `giftID, message`
- `SuggestionFinalizeRequest`: `giftID`
- `ProfilePhotoSignedURLRequest`: `contentType, objectName`
- `ProfilePhotoSignedURLResponse`: `url, objectName, method(PUT|GET|DELETE), expiresAt, friendId`

## Endpoints por tag

### users
| Método | Path | Resumo | Request | Response |
|---|---|---|---|---|
| PUT | `/users` | Criar usuário | `UserUpsertRequest` | 201 `domain.User` |
| GET | `/users/{userId}` | Buscar usuário | — | 200 `domain.User` |
| POST | `/users/{userId}` | Atualizar usuário | `UserUpsertRequest` | 200 `domain.User` |
| GET | `/users/email?email=` | Buscar usuário por email | query `email` | 200 `domain.User` |

### friends
| Método | Path | Resumo | Request | Response |
|---|---|---|---|---|
| GET | `/users/{userId}/friends` | Listar amigos | — | 200 `domain.Friend[]` |
| PUT | `/users/{userId}/friends` | Criar amigo | `FriendUpsertRequest` | 201 `domain.Friend` |
| GET | `/friends/{friendId}` | Buscar amigo | — | 200 `domain.Friend` |
| POST | `/friends/{friendId}` | Atualizar amigo | `FriendUpsertRequest` | 200 `domain.Friend` |

### profiles
| Método | Path | Resumo | Request | Response |
|---|---|---|---|---|
| GET | `/friends/{friendId}/profile` | Buscar perfil | — | 200 `domain.Profile` |
| PUT | `/friends/{friendId}/profile` | Criar/atualizar perfil | `ProfileUpsertRequest` | 200 `domain.Profile` |

### profile-photos (signed URLs)
| Método | Path | Resumo | Request | Response |
|---|---|---|---|---|
| POST | `/friends/{friendId}/profile-photo/upload-url` | URL p/ PUT de upload | `ProfilePhotoSignedURLRequest` | 200 `...Response` (method=PUT) |
| POST | `/friends/{friendId}/profile-photo/update-url` | URL p/ PUT de atualização | `ProfilePhotoSignedURLRequest` | 200 `...Response` (method=PUT) |
| POST | `/friends/{friendId}/profile-photo/get-url` | URL p/ GET de leitura | `ProfilePhotoSignedURLRequest` (opcional) | 200 `...Response` (method=GET) |
| POST | `/friends/{friendId}/profile-photo/delete-url` | URL p/ DELETE | — | 200 `...Response` (method=DELETE) |

O app executa a operação no bucket diretamente com a `url` assinada (não chama o backend de novo):
- upload/update → `FileSystem.uploadAsync(url, fileUri, { httpMethod:'PUT', headers:{'Content-Type'}, uploadType: BINARY_CONTENT })`
- delete → `fetch(url, { method:'DELETE' })` via `executeSignedProfilePhotoRequest`
- get → a `url` é usada como `source.uri` do `<Image>` (com header `Content-Type`).

### profile-agent
| Método | Path | Resumo | Request | Response |
|---|---|---|---|---|
| POST | `/profiles/agent/chat` | Conversar com profile agent | `AgentChatRequest` | 200 objeto livre |
| POST | `/profiles/agent/finalize` | Finalizar sessão do profile agent | `AgentFinalizeRequest` | 200 objeto livre |
| DELETE | `/profiles/agent/session/{friendId}` | Remover sessão do profile agent | — | 200 objeto livre |

Respostas do agente **não são tipadas** no swagger (`additionalProperties: true`). O app declara `AgentResponse { message?, response?, reply?, tags?, [k]: unknown }` e o `chat-builder` lê `response.assistantMessage` (fallback: `'Entendi! Me conta mais sobre isso 💭'`) e `response.tags[]`.

### suggestion-agent
| Método | Path | Resumo | Request | Response |
|---|---|---|---|---|
| POST | `/profiles/{friendId}/suggestions` | Criar sugestão inicial | `SuggestionCreateRequest` | 200 objeto livre |
| POST | `/suggestions/agent/chat` | Refinar sugestão por gift | `SuggestionChatRequest` | 200 objeto livre |
| POST | `/suggestions/agent/finalize` | Finalizar refinamento por gift | `SuggestionFinalizeRequest` | 200 objeto livre |

⚠️ **Sugestão por gift (`/suggestions/agent/chat` e `/finalize`) ainda não está implementada no app mobile** — só existe no `figma_proto/src/app/api.ts`. Ver product-roadmap.md.

### gifts
| Método | Path | Resumo | Request | Response |
|---|---|---|---|---|
| GET | `/friends/{friendId}/gifts` | Listar presentes | — | 200 `domain.Gift[]` |
| PUT | `/friends/{friendId}/gifts` | Criar presente | `GiftUpsertRequest` | 201 `domain.Gift` |
| POST | `/gifts/{giftId}` | Atualizar presente | `GiftUpsertRequest` | 200 `domain.Gift` |

### reminders
| Método | Path | Resumo | Request | Response |
|---|---|---|---|---|
| GET | `/users/{userId}/reminders` | Listar lembretes | — | 200 `domain.Reminder[]` |
| PUT | `/users/{userId}/reminders` | Criar lembrete | `ReminderUpsertRequest` | 201 `domain.Reminder` |
| POST | `/reminders/{reminderId}` | Atualizar lembrete | `ReminderUpsertRequest` | 200 `domain.Reminder` |

## Fluxos do app

**Login** — `findUserByEmail(email)` → `GET /users/email?email=`. Se 404, "E-mail não encontrado".

**Home** — `Promise.all([listFriendsByUserId, listRemindersByUserId])` +, por amigo, `requestFriendProfilePhotoGetUrl` para o avatar.

**Add Friend** — `createFriend(userId, FriendUpsertRequest)` (PUT); se modo foto, pega signed upload-url e faz `FileSystem.uploadAsync` PUT no bucket. Depois navega para o chat.

**Chat Builder** — `agentChat(friendId, message)` (POST `/profiles/agent/chat`) a cada envio; `agentFinalize(friendId)` (POST `/profiles/agent/finalize`) → vai para o perfil.

**Friend Profile** — `Promise.all([getFriendById, getFriendProfile(±), listGiftsByFriendId(±), requestFriendProfilePhotoGetUrl(±)])`. `createSuggestions(friendId, { occasionDetails, reminderID })` (POST `/profiles/{friendId}/suggestions`) seguido de `listGiftsByFriendId` para recarregar.

## Mapeamento `apiClient.*` → endpoint

| Método `apiClient` | Endpoint |
|---|---|
| `findUserByEmail(email)` | GET `/users/email?email=` |
| `listFriendsByUserId(userId)` | GET `/users/{userId}/friends` |
| `listRemindersByUserId(userId)` | GET `/users/{userId}/reminders` |
| `createFriend(userId, body)` | PUT `/users/{userId}/friends` |
| `getFriendById(friendId)` | GET `/friends/{friendId}` |
| `getFriendProfile(friendId)` | GET `/friends/{friendId}/profile` |
| `listGiftsByFriendId(friendId)` | GET `/friends/{friendId}/gifts` |
| `createSuggestions(friendId, body)` | POST `/profiles/{friendId}/suggestions` |
| `agentChat(friendId, message)` | POST `/profiles/agent/chat` |
| `agentFinalize(friendId)` | POST `/profiles/agent/finalize` |
| `requestFriendProfilePhotoUploadUrl` | POST `/friends/{friendId}/profile-photo/upload-url` |
| `requestFriendProfilePhotoUpdateUrl` | POST `/friends/{friendId}/profile-photo/update-url` |
| `requestFriendProfilePhotoGetUrl` | POST `/friends/{friendId}/profile-photo/get-url` |
| `requestFriendProfilePhotoDeleteUrl` | POST `/friends/{friendId}/profile-photo/delete-url` |
| `executeSignedProfilePhotoRequest` | operação direta no bucket (PUT/DELETE na signed url) |

## Endpoints do swagger ainda NÃO usados pelo app

- PUT `/users` (criar usuário) — sem fluxo de cadastro no app.
- GET/POST `/users/{userId}` (buscar/atualizar usuário) — sem tela de perfil/conta.
- POST `/friends/{friendId}` (atualizar amigo) — sem tela de edição de amigo.
- PUT/GET/PUT `/friends/{friendId}/profile` (upsert perfil) — o perfil é construído só via agente.
- PUT `/friends/{friendId}/gifts` (criar presente manualmente) — só gera via agente.
- POST `/gifts/{giftId}` (atualizar presente) — sem edição de presente na UI.
- PUT `/users/{userId}/reminders` (criar lembrete) — sem tela de criar lembrete.
- POST `/reminders/{reminderId}` (atualizar lembrete) — sem edição de lembrete.
- DELETE `/profiles/agent/session/{friendId}` (resetar sessão do agente) — não chamado.

Esses candidatos estão relacionados em `product-roadmap.md` e `MigoBox/.docs/api-todos.md`.
