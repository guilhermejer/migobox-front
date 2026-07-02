# API TODOs - MigoBox

Este arquivo concentra os pontos de API que ainda precisam de implementacao para as telas atuais.

## Home

- [ ] Notificacoes no topo: criar endpoint para listar notificacoes do usuario e contagem de nao lidas.
- [ ] Configuracoes no topo: criar endpoint para obter/salvar preferencias do usuario.
- [ ] Banner de lembrete: criar rota de detalhes/acao para o botao "Ver".
- [ ] Rodape "Datas": criar endpoint para listar datas importantes (aniversarios e lembretes por periodo).
- [ ] Rodape "Migos": evoluir listagem de amigos com filtros, busca e paginacao.

## Login e sessao

- [ ] Definir estrategia de sessao/autenticacao real (token/JWT), hoje estamos usando apenas consulta por e-mail.
- [ ] Definir endpoint de perfil resumido para hidratar dados essenciais no primeiro acesso.

## Add Friend

- [ ] Implementar endpoint de criacao de amigo no fluxo mobile com validacoes de campo.
- [ ] Definir retorno padrao para atualizar a lista da Home sem inconsistencias.

## Convencoes

- [ ] Revisar padrao final dos contratos para manter compatibilidade com tipos domain.* usados no app.
- [ ] Definir codigos e mensagens de erro amigaveis para exibicao no app.
