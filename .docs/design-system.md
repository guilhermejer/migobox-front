# Design System — MigoBox

Estilo "Lúdico Acolhedor" inspirado no Duolingo: tátil, amigável e moderno.
Fonte de verdade das regras: `.github/copilot-instructions.md`. Referência visual: `figma_proto/`.

## Tokens de cor

| Uso | Token | Hex |
|---|---|---|
| Ação principal | Cobalt | `#1CB0F6` |
| Sombra do cobalt | — | `#1699D8` / `#0F8FC4` |
| Ação secundária/sucesso | Verde | `#58CC02` (sombra `#46A302`) |
| Alertas / datas | Laranja Fogo | `#FF9600` (sombra `#C97200`) |
| Texto principal | Cinza Chumbo | `#2D3436` |
| Texto secundário | — | `#717182` / `#7A868E` |
| Fundo app | — | `#F8FAFC` |
| Cartão / superfície | — | `#FFFFFF` |
| Borda clara | — | `#ECECEC` |
| Base reforçada de card | — | `#D8E0E8` |
| Erro | — | `#D64545` |
| Hero (profile) | — | `#E0F2FE` / texto `#0F172A`, meta `#0369A1` |
| Tip de IA | — | fundo `#E7F7FF` |

Acentos por amigo (card/badge): `#1CB0F6, #58CC02, #A855F7, #F43F5E, #FF9600, #EC4899, #10B981, #3B82F6` — usados cíclicos por índice.

Paletas de tag de personalidade (`friend-profile.tsx`):
- like → fundo `#D1FAE5` / texto `#065F46`
- dislike → fundo `#FFE4E6` / texto `#9F1239`
- trait → fundo `#E0E7FF` / texto `#3730A3`

## Tipografia

- Fonte: **Nunito** (carregada em `_layout.tsx`): `Nunito_400Regular`, `Nunito_700Bold`, `Nunito_800ExtraBold`, `Nunito_900Black`.
- **Não usar** `fontWeight` solto quando houver variante de fonte; use `fontFamily: 'Nunito_900Black'` etc.
- Escala típica observada:
  - Brand/hero name: 22–42px, Nunito_900Black.
  - Títulos de seção: 18–20px, Nunito_800/900.
  - Kicker/label: 11–13px, Nunito_700/800, às vezes `letterSpacing`/uppercase.
  - Corpo: 13–16px, Nunito_700.
  - Meta/time: 10–12px, Nunito_700.

## Chunky Button (`components/chunky-button.tsx`)

Botões "gordinhos" com efeito 3D físico (sem blur). Padrão obrigatório do design system.
- `borderRadius: 20` (primary) / `32` (fab).
- Sombra inferior **sólida** via `borderBottomWidth` (6px primary / 5px fab) + `borderBottomColor` em tom mais escuro.
- Variante `primary` (largura total, `minHeight: 56`) e `fab` (64x64).
- Props `color` + `shadowColor` para customizar a cor principal e a sombra.
- Estados: `disabled`/`loading` (opacity 0.75, mostra `ActivityIndicator` branco), `pressed` (`translateY: 1` + reduz `borderBottomWidth`).
- Atualmente o FAB da home **não** usa o `ChunkyButton` — implementa o padrão de 2 camadas manualmente (ver abaixo). Considerar unificar no componente futuramente.

## Padrão FAB (2 camadas) — Home

Para botões circulares/quadrados arredondados, **não** usar só `borderBottomWidth` no próprio botão. Usar **duas camadas** dentro de um wrapper absoluto:
- `shadow` (camada inferior, cor mais escura `#0F8FC4`), deslocada para baixo (~5–6px).
- `button` (camada superior, cor principal `#1CB0F6`), mesma largura/altura e mesmo `borderRadius` da shadow.
- Resultado: a sombra aparece também nas curvas inferiores laterais.
- Especificação da Home: wrapper `64x70`, ambos `64x64`, `borderRadius: 22`, posicionados `right: 20, bottom: 88`.

## Cards táteis

- Borda clara (`#ECECEC`, `borderWidth: 2`) + base reforçada via `borderBottomWidth: 4–5` e `borderBottomColor` em tom mais escuro (`#D8E0E8` para cards neutros; `#C97200` para laranja; `#0F8FC4` para cobalt).
- **Sem sombra com blur** (sem `elevation`/`shadowColor`+`shadowOffset` blur). O efeito vem do contraste da borda inferior.
- Cantos `borderRadius: 18–20`.
- Usado em: friend card, reminder card (laranja), gift card, empty states, preview card, tip box.

## Componentes por tela

**Login (`index.tsx`)** — brand central grande, input arredondado (`borderRadius: 20`), erro em vermelho, `ChunkyButton` primário.

**Home (`home.tsx`)** — header sticky com saudação + actions (sino/settings, 44x44 raio 14, badge laranja); seção "Próximos lembretes" com cards laranja (altura ~88, gap 10, emoji por tipo: birthday 🎂 / custom ⭐ / default 🔔); lista de amigos em `FlatList` com avatar (foto via signed URL ou emoji fallback), nome + badge de aniversário ≤7d (`🎂 Nd`), relação + idade, barra de progresso (TODO: 0% hoje), seta circular; FAB 2 camadas; bottom nav com 2 items (Migos/Datas).

**Add Friend (`add-friend.tsx`)** — wizard 2 passos com barra de progresso (2 segmentos); Passo 1: modo foto/emoji (segunda camada p/ foto via ImagePicker), nome, chips de relação (+ campo "Outro" custom); Passo 2: preview card, cidade, data (máscara `DD/MM/AAAA`), gênero (3 opções emoji+label); tip box azul-claro; footer com `ChunkyButton`.

**Chat Builder (`chat-builder.tsx`)** — header com avatar + kicker + nome + botão Finalizar (verde); bubbles AI (esquerda, branco, raio 18, canto inferior esquerdo 4) e user (direita, cobalt, canto inferior direito 4); avatar 🤖; indicador "•••" enquanto envia; strip horizontal de tags acumuladas; input + botão send (cobalt, raio 16).

**Friend Profile (`friend-profile.tsx`)** — hero azul-claro (`borderBottomRadius: 28`) com avatar 96 (foto ou emoji), nome, meta (📍cidade · 🎂idade · 💛relação), badge "Perfil X% completo"; filtros de tag (all/like/dislike/trait) com chip escuro quando selecionado; viewport de tags rolável com paletas por tipo; seção "Sugestões de presente" com input de ocasião + `ChunkyButton` azul + lista de gift cards (ícone colorido, título, priceRange laranja, descrição, tags).

## Tradução web → mobile

Ao usar `figma_proto` como referência, converter estritamente:
- `<div>` → `View`
- `<span>/<p>/<h1..>` → `Text`
- `<button>` → `TouchableOpacity` (ou `Pressable`)
- `<input>/<textarea>` → `TextInput`
- CSS → `StyleSheet.create`
- `onClick` → `onPress`
- `border-bottom: Npx solid` (box-shadow sólido) → `borderBottomWidth` + `borderBottomColor`
- `box-shadow: 0 4px 0 cor` → duas camadas (ver FAB) ou `borderBottomWidth`
- ícones lucide-react → `@expo/vector-icons` (Ionicons)

## Acessibilidade / usabilidade

- Sempre `SafeAreaView` com `edges` explícito (`['top','left','right']`, ou `['top']` dentro de heroes).
- `KeyboardAvoidingView` com `behavior: Platform.OS === 'ios' ? 'padding' : undefined` (e `keyboardVerticalOffset` quando necessário).
- `keyboardShouldPersistTaps="handled"` em ScrollViews com inputs.
- `nestedScrollEnabled` em ScrollViews aninhadas.
- `showsVerticalScrollIndicator={false}` por padrão (scrollbars ocultos, padrão do protótipo).
- Refresh via `RefreshControl` com `tintColor` cobalt.
