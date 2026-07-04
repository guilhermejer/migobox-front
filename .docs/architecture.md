# Arquitetura — migobox-front

Anotações sobre a estrutura, stack e padrões do repositório. Referência cruzada:
- `.docs/swagger.yaml` — contrato do backend.
- `.github/copilot-instructions.md` — design system e fluxo de trabalho.
- `MigoBox/.docs/api-todos.md` — TODOs de API por tela.

## Visão geral do workspace

```
migobox-front/
├── figma_proto/      # Protótipo web (Vite + React + shadcn/Radix + Tailwind v4). REFERÊNCIA VISUAL apenas.
├── MigoBox/          # App real em React Native (Expo). TODO o código vai aqui.
├── .docs/            # Documentação + swagger do backend. Manter atualizado.
└── .github/          # copilot-instructions.md (design system + regras).
```

### figma_proto (não é o produto)
- Stack: Vite 6, React 18, Tailwind v4, Radix UI/shadcn, MUI, lucide-react, motion, sonner.
- Fonte original do design: https://www.figma.com/design/tzA0W1gQhAAm0fiI5g8td2/MigoBox-Responsive-Web-UI
- Telas em `src/app/components/`: HomeDashboard, AddFriend, ChatBuilder, FriendProfile.
- **Aviso**: `figma_proto/src/app/api.ts` usa payloads **snake_case** (`friend_id`, `occasion_details`) que estão **desatualizados** em relação ao swagger/backend (camelCase). **Não copiar** a camada de API do figma; use `MigoBox/src/api/api-client.ts` como fonte da verdade.
- Use o figma só para cores, tamanhos, espaçamentos e composição visual.

### MigoBox (o app)
- Framework: **Expo 57** (`expo-router` 57, file-based routing), **React 19.2.3**, **React Native 0.86**.
- Linguagem: **TypeScript strict** (`tsconfig.json` estende `expo/tsconfig.base`).
- Path alias: `@/* → ./src/*` e `@/assets/* → ./assets/*`.
- Fonte: **Nunito** via `@expo-google-fonts/nunito` (400/700/800/900).
- Experimentos habilitados em `app.json`: `typedRoutes: true` e `reactCompiler: true`.
  - `typedRoutes` exige casts `as never` ao navegar com `router.push/replace` quando params não estão tipados estaticamente (padrão já adotado no app).
- Plugins: expo-router, expo-splash-screen, expo-image-picker.
- Plataforma-alvo: Android (emulador Android Studio). iOS configurado mas fluxo de testes é Android.
- `AGENTS.md` orienta ler docs versionados da Expo 57 antes de escrever código: https://docs.expo.dev/versions/v57.0.0/

## Estrutura de `MigoBox/src`

```
src/
├── app/                 # Telas (expo-router, file-based)
│   ├── _layout.tsx      # Root: ThemeProvider + UserProvider + Stack (headerShown: false)
│   ├── index.tsx        # Login por e-mail (findUserByEmail) → /home
│   ├── home.tsx         # Dashboard: lembretes próximos + lista de amigos + FAB + bottom nav
│   ├── add-friend.tsx   # Wizard 2 passos: avatar/foto+nome+relação → cidade/nascimento/gênero
│   ├── chat-builder.tsx # Chat IA de perfil (agentChat/agentFinalize)
│   └── friend-profile.tsx # Raio-X: perfil + tags filtráveis + gerar/listar presentes
├── api/
│   └── api-client.ts    # Único ponto de saída para o backend. Ver backend-api.md.
├── context/
│   └── user-context.tsx # UserProvider: user + welcomeMessage
├── types/
│   └── domain.ts        # Tipos de domínio (domain.User/Friend/Profile/Gift/Reminder/Gender)
└── components/
    └── chunky-button.tsx # Botão tátil do design system
```

### Papel de cada arquivo-chave

**`app/_layout.tsx`** — bootstrap:
- Carrega fontes Nunito e segura o splash screen até pronto.
- `ThemeProvider` (dark/light por `useColorScheme`) envolvendo `UserProvider` envolvendo `Stack`.
- Declara explicitamente cada `Stack.Screen` (index, home, add-friend, chat-builder, friend-profile).
- `headerShown: false` em todas — cada tela desenha seu próprio cabeçalho.

**`context/user-context.tsx`** — sessão mínima:
- `UserProvider` mantém `user: domain.User | null` e `welcomeMessage: string`.
- `useUserContext()` lança se usado fora do provider.
- Não persiste nada (sem token/sessão real — ver product-roadmap.md).

**`api/api-client.ts`** — camada de rede (ver detalhes em backend-api.md):
- `API_BASE_URL` via `EXPO_PUBLIC_API_BASE_URL` (fallback `10.0.2.2:8080` Android / `localhost:8080`).
- `API_DEBUG_ENABLED` via `EXPO_PUBLIC_API_DEBUG === 'true'` ou `__DEV__`.
- `requestJson<T>` central: injeta `Content-Type`, serializa body, loga `#seq` início/fim/duração, normaliza erros em `ApiError { status, message }` (lê primeira mensagem do objeto de erro).
- `executeSignedRequest` para operações diretas no bucket (PUT/DELETE na signed URL da foto).
- `apiClient` expõe métodos por recurso: users, friends, profile, gifts, suggestions, agent, profile-photo.

**`types/domain.ts`** — tipos espelham o swagger (`domain.*`), todos opcionais para tolerar respostas parciais. `domain.Gender = 'male' | 'female' | 'other'`.

**`components/chunky-button.tsx`** — botão tátil: `primary` (largura total, raio 20, sombra inferior 6px) e `fab` (64x64, raio 32). Props `color`/`shadowColor` permitem customizar. Estado pressed desloca 1px e reduz borda.

## Padrões de código

- **Roteamento**: file-based via expo-router. Navegação imperativa com `router.push/replace({ pathname, params } as never)`. Params lidos com `useLocalSearchParams<{...}>()`.
- **Estilo**: `StyleSheet.create` em cada tela, estilos nomeados por seção (header, card, input, etc.). Sem libs de estilo externas.
- **Layout**: `SafeAreaView` (react-native-safe-area-context) com `edges` explícito; `KeyboardAvoidingView` com `behavior` por plataforma; `ScrollView`/`FlatList` com `RefreshControl`.
- **Estado de tela**: loading/refreshing/friendlyError por tela; loaders com `ActivityIndicator` + mensagem; erros amigáveis em PT-BR.
- **Erros de API**: `catch (error) { const apiError = error as ApiError; ... }` — `ApiError` importado de `api-client`.
- **Nomenclatura**: camelCase no app; payloads do backend em camelCase (alinhado ao swagger). **Não usar** snake_case (o figma_proto está errado).
- **Comentários**: não adicionar comentários salvo solicitação explícita (regra geral do projeto). TODOs existentes ficam no código e em `MigoBox/.docs/api-todos.md`.
- **Componentização**: extrair componentes repetitivos (ex.: chunky-button). Tags de personalidade e cards de amigo são candidatos a extração.

## Fluxo de telas

```
index (login e-mail)
  └─→ home (dashboard)
        ├─→ add-friend (wizard 2 passos)
        │     └─→ chat-builder (cria perfil com IA)
        │           └─→ friend-profile (finalize → raio-X)
        └─→ friend-profile (abre migo existente)
              └─→ chat-builder (conversar mais com a IA)
```

## Configuração / ambiente

- `app.json`: slug `MigoBox`, scheme `migobox`, `userInterfaceStyle: automatic`, adaptive icon Android (#E6F4FE), package `com.anonymous.MigoBox`, `typedRoutes` + `reactCompiler`.
- `tsconfig.json`: strict, paths `@/*` e `@/assets/*`, inclui `.expo/types`.
- Variáveis de ambiente (Expo public):
  - `EXPO_PUBLIC_API_BASE_URL` — base do backend.
  - `EXPO_PUBLIC_API_DEBUG` — `'true'` liga logs mesmo fora de `__DEV__`.
- Scripts: `start` (expo start), `android`, `ios`, `web`, `lint` (expo lint).
- Sem testes configurados ainda.
