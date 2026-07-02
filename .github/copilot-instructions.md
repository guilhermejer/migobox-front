 # Contexto do Projeto: MigoBox
 
 
 O MigoBox é um aplicativo mobile focado em ajudar usuários a mapear a personalidade de amigos e familiares usando uma IA conversacional, facilitando a sugestão de presentes perfeitos e lembrando de datas importantes. O público-alvo é jovem (15 a 35 anos).
 # Estrutura do Repositório
 
 
 O workspace possui duas pastas principais:
 * `figma_proto`: Contém o código front-end (web) exportado do Figma. **Use esta pasta apenas como referência visual e de estilização (cores, tamanhos, espaçamentos).**
 * `MigoBox`: O projeto principal em React Native. **Todo o código gerado deve ser escrito e implementado aqui.**. Nessa pasta já foi gerado o projeto inicial com `npx react-native init MigoBox`. Estamos utilizando o framework Expo para facilitar o desenvolvimento e testes em dispositivos móveis e vamos rodar os testes com ajuda do emulador do Android Studio.
  * `.docs`: Documentação e recursos relacionados ao projeto e suas dependências, por exemplo o swagger do backend. **Todo o conteúdo deve ser mantido atualizado aqui.**
 
 # Guia de Estilo (Design System)
 
 
 A interface adota um estilo "Lúdico Acolhedor", fortemente inspirado no Duolingo. O design deve passar uma sensação tátil, amigável e moderna.
 * **Cores Principais:** Fundo Branco (`#FFFFFF`), Ações Principais em Azul Cobalto (`#1CB0F6`), Ações Secundárias em Verde (`#58CC02`), e Alertas/Datas em Laranja Fogo (`#FF9600`). O texto principal deve ser um Cinza Chumbo (`#2D3436`).
 * **Tipografia:** Utilize fontes arredondadas e amigáveis (ex: Nunito, Quicksand) e garanta alta legibilidade.
 * **Componentes Táteis:** Os botões principais devem ser "Chunky Buttons" (Botões gordinhos). Eles precisam de bordas bastante arredondadas (`border-radius: 20px`) e uma sombra inferior sólida (sem desfoque/blur) em um tom mais escuro da cor principal para simular um efeito 3D físico.
 * **Padrão Chunky Obrigatório (Correção Aplicada):** Para botões circulares/quadrados arredondados (ex: FAB), **não** usar apenas `borderBottomWidth` no próprio botão. Implementar com **duas camadas**: camada inferior (`shadow`) e camada superior (`button`) com mesmo tamanho e mesmo raio de borda. A camada `shadow` deve ficar deslocada para baixo (ex: 5-6px), permitindo que a sombra apareça também nas curvas inferiores laterais.
 * **Especificação do FAB (Home):** Usar wrapper absoluto, `shadow` escura (`#0F8FC4`) + botão principal (`#1CB0F6`), ambos `64x64` com `borderRadius: 22`, mantendo o efeito chunky consistente com o design system.
 * **Consistência Tipográfica:** Priorizar Nunito carregada no app (`Nunito_400Regular`, `Nunito_700Bold`, `Nunito_800ExtraBold`, `Nunito_900Black`) e evitar `fontWeight` solto quando houver variante de fonte disponível.
 * **Consistência de Cartões Táteis:** Cards interativos devem manter borda clara + base reforçada (efeito físico), evitando sombra com blur. Preferir contraste por `borderBottomColor` em tom ligeiramente mais escuro.
 * **Elementos Visuais:** Evite bordas duras; use divisores em cinza super claro. O conteúdo (como tags de personalidade) deve incluir emojis gerados dinamicamente pela API.
 
 
 # Integração com Backend (APIs)
 
 
 O backend é escrito em Go com um agente LLM em Python. As integrações devem tentar seguir o contrato Swagger existente, mas podem ser adaptadas conforme necessário para atender às necessidades do app.
 * **Listagem e Criação:** Endpoints como `GET /users/{user_id}/friends` e `GET /users/{user_id}/reminders`.
 * **Agentes de IA:** O core do app interage com `/profiles/agent/chat` (para construir o perfil conversando) e `/suggestions/agent/chat` (para refinar presentes).
 * Sempre trate os estados de carregamento (loading states) nas chamadas de rede, especialmente durante o chat com a IA, para evitar que a tela pareça travada.
 * **Ambiente de Desenvolvimento:** Use o backend de desenvolvimento para testes, ele roda localmente em `http://localhost:8080`.
 
 
 # Regras de Desenvolvimento e Fluxo de Trabalho
 
 
 1. **Iteração Constante:** Vamos desenvolver uma tela por vez, começando pelo scaffolding estrutural e adicionando lógica aos poucos.
 2. **Tradução Web para Mobile:** Ao ler referências do `figma_proto` (que pode conter tags HTML/CSS web), traduza estritamente para os padrões do React Native (ex: `View`, `Text`, `TouchableOpacity`, `StyleSheet`).
 3. **Componentização:** Extraia componentes repetitivos imediatamente (ex: o "Chunky Button", os "Cards de Amigos", as "Tags de Personalidade").
 4. **Acessibilidade e Usabilidade:** Respeite as *safe areas* dos dispositivos móveis (SafeAreaView) e garanta que o teclado não cubra os campos de texto durante o chat (KeyboardAvoidingView).
 
 

---