# Operação — loja piloto Na Braza

Guia para o dono/operador do **cliente 1 (Na Braza)** usar o painel no dia a dia. Procedimentos e dados abaixo são **específicos do piloto** (`na-brasa`), não onboarding genérico de novos tenants.

Documentos relacionados: [README](../README.md) · [Deploy](deployment.md) · [Produto](product.md) · [Release notes](release-notes/mvp-v0.1.0.md) · [Dados do piloto Na Braza](client/na-braza-pilot-data.md)

## Dados reais da loja (Na Braza)

Fonte: [client/na-braza-pilot-data.md](client/na-braza-pilot-data.md). Slug técnico permanece `na-brasa`; rota pública `/na-brasa`.

- Nome exibido: **Na Braza**
- WhatsApp de pedidos: **5513981091971** (13 98109-1971)
- Endereço: Barão de Ramalho, 155 — Macuco — Santos/SP
- Horário (texto no cardápio): segunda a domingo 17:30–00:00; em chuva forte não abre
- Taxa base de entrega (piloto): R$ 6,00 · pedido mínimo entrega: R$ 30,00
- Retirada e entrega habilitadas no piloto

**Pedido mínimo:** o valor mínimo é aplicado **somente** a pedidos com entrega (`DELIVERY`). Pedidos para retirada e pedidos de Balcão **não** possuem valor mínimo. O Store Owner pode alterar o valor em `/admin/configuracoes` (“Pedido mínimo para entrega”). Pelo menos uma modalidade (entrega ou retirada) deve permanecer habilitada. O horário em texto é só informativo; quem abre/fecha a loja é o campo “Loja aberta”.

Em banco **já existente** (produção ou dev compartilhado), aplicar settings manualmente com `DATABASE_URL` correto:

`pnpm store:apply-na-braza-settings`

Não altera cardápio, pedidos nem usuários.

## Cardápio real do piloto

Fonte: [client/na-braza-pilot-data.md](client/na-braza-pilot-data.md). Produto principal: **Pão Carne Queijo** (R$ 25,00) com adicionais no burger; espetinhos, bebidas e cervejas com aviso +18.

Em banco já existente, aplicar o cardápio piloto manualmente:

`pnpm menu:apply-na-braza-pilot`

O script ativa/atualiza itens reais e **desativa** (não deleta) produtos/categorias/adicionais antigos do seed fictício. Não altera Store settings, pedidos nem usuários.

## Acesso do dono (Lucas — STORE_OWNER)

Criar ou atualizar o usuário **Lucas Araújo** (`theluksvm@gmail.com`) na Store `na-brasa` com senha temporária **somente via variável de ambiente** (nunca commitar senha):

```bash
NA_BRAZA_LUCAS_PASSWORD="use-a-strong-temporary-password" pnpm store:create-na-braza-owner
```

- Exige `DATABASE_URL` do ambiente alvo (produção: usar credencial de produção no shell, não no `.env` versionado).
- Senha: mínimo **12 caracteres**, sem espaços no início/fim.
- Reexecutar o script **atualiza** nome, role, `storeId`, `isActive` e **substitui a senha** pelo valor atual da env.
- Envie a senha ao Lucas por **canal seguro** (não WhatsApp público do pedido). Peça troca após o primeiro login quando houver fluxo de reset (fora do escopo V1).
- **Renan** permanece pendente até e-mail/WhatsApp confirmados.
- O model `User` não possui campo de telefone; o WhatsApp 13981091971 fica apenas na documentação da loja.

## Limpeza de dados de teste

Após smoke/E2E em produção (ou banco compartilhado), use o script auditável para **cancelar** pedidos claramente de teste, **desativar** usuários E2E e **ocultar** catálogo fora do piloto — sem deletar pedidos, sem alterar settings, cardápio real nem o Lucas.

**Dry-run (padrão, sem writes):**

```bash
pnpm data:clean-na-braza-tests
```

Revise a lista de pedidos/usuários/catálogo que seriam afetados.

**Apply (somente após revisar o dry-run):**

```bash
CONFIRM_CLEAN_NA_BRAZA_TEST_DATA=true pnpm data:clean-na-braza-tests
```

No PowerShell:

```powershell
$env:CONFIRM_CLEAN_NA_BRAZA_TEST_DATA="true"; pnpm data:clean-na-braza-tests
```

- Exige `DATABASE_URL` do ambiente alvo.
- Idempotente: reexecutar não deve falhar; pedidos já `CANCELLED` e usuários já inativos são contados separadamente.
- Não altera `MASTER`, `theluksvm@gmail.com`, Store settings nem preços do cardápio piloto.
- Pedidos de teste viram `CANCELLED` (não são apagados).

## Purga final antes do handoff

Para entregar o painel ao cliente **sem** pedidos Smoke/E2E cancelados na lista nem produtos/categorias técnicos no `/admin/cardapio`, use a **purga** depois da limpeza acima.

| Etapa | Script | Efeito |
| --- | --- | --- |
| Limpeza | `pnpm data:clean-na-braza-tests` | Cancela pedidos de teste, desativa usuários E2E, oculta catálogo fora do piloto |
| Purga | `pnpm data:purge-na-braza-tests` | **Remove** definitivamente apenas registros técnicos identificados (pedidos, catálogo E2E, usuários `@example.com`) |

**Dry-run (padrão):**

```bash
pnpm data:purge-na-braza-tests
```

**Apply (somente após revisar o dry-run):**

```bash
CONFIRM_PURGE_NA_BRAZA_TEST_RECORDS=true pnpm data:purge-na-braza-tests
```

PowerShell:

```powershell
$env:CONFIRM_PURGE_NA_BRAZA_TEST_RECORDS="true"; pnpm data:purge-na-braza-tests
```

- Protege Lucas, usuários `MASTER` e todo o cardápio definido em `prisma/na-braza-pilot-menu.ts`.
- Não usa `Teste` genérico em nomes de cliente para delete automático (apenas aviso no dry-run).
- Idempotente: após purga bem-sucedida, novo dry-run deve listar **0** candidatos.

## Como o dono opera o painel

1. Abra a URL do app em produção (ex.: `https://seu-dominio/admin/login`)
2. Entre com o **e-mail e senha do usuário** cadastrado no banco (usuário de loja ou `MASTER` via seed `MASTER_ADMIN_*`)
3. Após o login:
   - usuário de loja → dashboard `/admin` com o **chrome compartilhado** (nome da loja, links Pedidos / Balcão / Cardápio / Configurações conforme o perfil, e **Sair**)
   - `MASTER` → painel **`/master`** (operação de plataforma; sem Store implícita)
4. Use **Sair** (logout) ao terminar o turno, principalmente em aparelho compartilhado

A sessão fica em cookie **HttpOnly** (não aparece em `localStorage`). Em produção o cookie só trafega em HTTPS (`Secure`).

Nota: `MASTER` não entra automaticamente no `/admin` de uma Store. Acesso tenant por MASTER exige fluxo futuro de seleção explícita.


## Isolamento por loja no `/admin`

- Pedidos, cards e detalhe são filtrados pelo `storeId` da sessão.
- Usuários `STORE_OWNER` / `MANAGER` / `OPERATOR` / `KITCHEN` **precisam** ter `storeId` no banco.
- Sem `storeId`, o acesso ao `/admin` é bloqueado.
- Pedido de outra loja retorna 404 (não revela existência).
- Ações de status dependem da **role** do usuário (além da transição válida do fluxo).

## Permissões por role no `/admin`

| Role | Ver pedidos | Confirmar | Preparar / pronto | Despachar / concluir | Cancelar |
| --- | --- | --- | --- | --- | --- |
| `STORE_OWNER` | sim | sim | sim | sim | sim |
| `MANAGER` | sim | sim | sim | sim | sim |
| `OPERATOR` | sim | sim | sim | sim | não |
| `KITCHEN` | sim | não | sim | não | não |

- Roles de loja acessam `/admin` da própria Store via `session.storeId`.
- Permissões são aplicadas **server-side** (role da sessão); a UI só esconde botões não permitidos.
- `MASTER` opera em `/master`; sem Store picker ainda não entra no chrome tenant.
- A matriz de permissions no código ainda inclui `MASTER` para eventual acesso tenant futuro; a UI/admin atual não usa fallback piloto.
- A matriz pode evoluir por cliente/plano no futuro.


## Navegação do painel

Em qualquer tela autenticada do `/admin`, use a barra superior compartilhada:

- **Pedidos** — fila (`/admin`) e detalhe (`/admin/pedidos/...`)
- **Balcão** — comanda (`/admin/balcao`); não aparece para Cozinha
- **Cardápio** / **Ver cardápio** — catálogo; Cozinha não vê o link (URL direta read-only ainda possível)
- **Configurações** — settings da loja; Cozinha não vê o link
- **Sair** — logout (sempre no chrome; não no login)

O badge **Pendentes** (notificações) continua acima, separado dos links. Detalhe: [product/admin-navigation-chrome.md](product/admin-navigation-chrome.md).

Se um perfil autenticado abrir por URL uma área operacional bloqueada (exemplo: Cozinha em **Balcão**), a tela mostra **Acesso não permitido** com um botão para voltar à área permitida (em geral Pedidos). Pedidos inexistentes ou de outra loja continuam como “não encontrado”, sem revelar existência.

## Cardápio (`/admin/cardapio`)

1. Na navegação do chrome, use **Gerenciar cardápio** (ou **Ver cardápio** para operador).
2. Categorias e produtos são sempre da **sua Store** (`storeId` da sessão).
3. Dono/gerente podem criar categoria, criar/editar produto e ativar/desativar.
4. Operador pode marcar produto **disponível/indisponível** (`Product.available`); produto indisponível continua visível no cardápio público, mas não pode ser pedido.
5. Dono/gerente podem **publicar/ocultar** produto (`Product.active`); oculto some do `/{slug}`.
6. Cozinha só visualiza o cardápio administrativo.
7. Não há exclusão física nesta etapa — prefira ocultar (`active`) ou marcar indisponível (`available`).

## Adicionais (`/admin/cardapio/adicionais`)

1. Acesse pelo link **Gerenciar adicionais** em `/admin/cardapio` (ou URL direta).
2. Dono/gerente podem criar, editar, ativar/desativar e vincular adicionais a produtos da mesma Store.
3. Operador e cozinha só visualizam a lista e vínculos.
4. Adicional inativo não aparece no modal público; desvinculado também não.
5. Checkout rejeita adicional inválido com mensagem amigável no server.

## Configurações da loja (`/admin/configuracoes`)

1. Na navegação do chrome, use **Configurações** (visível para dono, gerente e operador; Cozinha não vê o link).

2. Dono/gerente editam WhatsApp, endereço, taxa de entrega (R$ na tela, centavos no banco), retirada/entrega e texto de horário.
3. Operador **não** altera dados estruturais, mas pode **abrir ou fechar** a loja para pedidos Online (`isOpen`).
4. Cozinha só visualiza.
5. Mudanças refletem no cardápio público e no checkout após salvar (revalidate).
6. Com `isOpen=false`, o cliente ainda vê o cardápio, mas **não** consegue finalizar pedidos Online/`DIRECT`. Pedidos de Balcão (`COUNTER`) podem continuar sendo criados por usuários autorizados. `openingHours` é apenas informativo e **não** altera `isOpen` automaticamente.
7. Store legada com retirada e entrega desabilitadas (`pickupEnabled=false` e `deliveryEnabled=false`): o checkout público mostra indisponibilidade explícita; o Admin impede salvar esse estado em novas edições.
8. E2E/smoke: testes que alteram a Store **restauram** WhatsApp, flags e `isOpen` ao final — não deixe a Na Braza fechada após rodar testes em banco compartilhado.

## Pilot operation

Rotina recomendada para o Na Braza em **produção ativa**. Novas evoluções seguem
backlog pós-validação + `product-grill`; esta seção descreve o uso operacional
do que já está entregue.

### Abertura e fechamento

1. Login como `MANAGER`, `STORE_OWNER` ou `OPERATOR` (conforme permissão).
2. Abra `/admin/configuracoes`.
3. **Abrir loja:** `OPERATOR` usa o botão abrir/fechar; dono/gerente pode usar o mesmo toggle ou o checkbox “Loja aberta” + salvar.
4. **Fechar loja:** mesmo fluxo — cardápio público continua visível; checkout Online e `createOrder` (`DIRECT`) ficam bloqueados no server. Pedidos de Balcão autorizados **não** são bloqueados por `isOpen`.
5. Acesso direto a `/{slug}/checkout` com loja fechada também comunica indisponibilidade (banner + submit desabilitado); não depende só do CTA do cardápio.
6. Ao fim do turno, confira que a loja está no estado desejado (geralmente **aberta** se ainda aceita pedidos Online pelo link).

### Cardápio e disponibilidade

1. `/admin/cardapio` — criar/editar produtos e categorias (dono/gerente).
2. **Indisponível no momento:** `OPERATOR` ou dono/gerente marca `available=false` (produto visível, sem pedido).
3. **Ocultar do público:** dono/gerente marca `active=false` (some do `/na-brasa`).

### Adicionais

1. `/admin/cardapio/adicionais` — criar, editar, ativar/desativar, vincular a produtos (dono/gerente).
2. Inativo ou desvinculado não entra no pedido (validação no server).

### Pedidos

1. `/admin` — lista e resumo; toque no pedido para detalhe.
2. Avance status conforme a role (retirada vs entrega).
3. Compare com a mensagem no WhatsApp do cliente quando necessário.

### Comanda de balcão

1. Em `/admin/balcao`, monte e registre a comanda.
2. Após o sucesso, a tela **permanece no Balcão** com o código criado — não abre o detalhe sozinha.
3. Use **Nova comanda** para seguir o próximo cliente, **Ver pedido** para o detalhe, ou **Ir para pedidos** para a fila.
4. Pagamento continua só em **Receber e finalizar** quando o pedido estiver Pronto.

### Novos pedidos online (alerta in-app)

1. Com o painel `/admin` **aberto** (após login), novos pedidos `DIRECT` geram banner e atualizam o badge de pendentes (polling ~8s; pausa se a aba estiver oculta). Em `/admin/login` não há chrome nem polling contínuo.
2. O badge **Pendentes** conta pedidos `PENDING` da loja (online e balcão) e abre a fila em `/admin`. Não é contador de “não lidas”.
3. No banner: **Abrir pedido** vai ao detalhe; **Dispensar aviso** remove só o alerta visual (pedido continua pendente; o badge não muda).
4. Som fica **desligado** por padrão — marque **Ativar som de novos pedidos** no chrome do admin (preferência só neste navegador).
5. Pedidos de balcão (`COUNTER`) **não** disparam alerta (mas entram no badge se estiverem pendentes).
6. Com o navegador fechado ou aba em outro site, **não** há notificação (sem Web Push).
7. Duas abas do admin podem alertar o mesmo pedido.
8. No máximo 3 banners visíveis; pedidos a mais não reaparecem depois (já contam como alertados).
9. Ativar o som toca uma prévia curta; pedidos antigos do bootstrap **não** soam.
10. A fila `/admin` atualiza sozinha quando o polling detecta pedido novo (ou mudança de pendentes), ao voltar para a aba (um refresh após o poll retomado), após mudar status com sucesso, ou ao abrir Pedidos depois de criar comanda — sem F5 e sem segundo polling. O aviso “Atualizando pedidos…” indica que a atualização foi pedida, não que já terminou. Se a lista falhar em sincronizar, o banner continua permitindo abrir o pedido; o próximo poll/visibility tenta de novo.
11. Na fila, use **Status**, **Origem** e **Buscar por código ou cliente** (Aplicar) para restringir a lista; a URL guarda os filtros. **Limpar filtros** volta à fila completa. Os cards de resumo no topo são da operação da loja (não dos filtros). Busca por telefone e paginação não estão disponíveis.
12. Em cada pedido, **Há …** é o tempo desde a **criação** do pedido (não desde o status atual). O horário absoluto continua abaixo. Isso não é SLA nem “atrasado”; a label atualiza quando a fila refresca sozinha (live refresh), sem cronômetro na tela.

### Se algo sair errado nas configurações

1. Volte como `MANAGER`/`STORE_OWNER` em `/admin/configuracoes`.
2. Restaure WhatsApp, endereço, horário, taxa, entrega/retirada e **loja aberta**.
3. Confira `/na-brasa` em aba anônima ou outro aparelho.
4. Em emergência, feche a loja (`isOpen=false`) para parar novos pedidos **Online** enquanto corrige. Balcão autorizado pode seguir, se necessário.

## Painel Master (`/master`)

1. Faça login em `/admin/login` com usuário role `MASTER`
2. O login leva direto a `/master` — operação geral da plataforma (lojas, contagens de pedidos)
3. Acesso direto a `/admin` redireciona de volta para `/master` (sem Store piloto implícita)
4. Links úteis: cardápio público da loja (`/{slug}`), **Gerenciar usuários**, **Sair**
5. Usuários de loja (`STORE_OWNER`, `OPERATOR`, etc.) **não** acessam `/master`

`/admin` permanece o painel operacional da **loja/cliente** (usuários com `session.storeId`).


## Usuários de loja (`/master`)

1. Em `/master`, na loja desejada, use **Gerenciar usuários**
2. Abre `/master/stores/[storeId]/users` (somente `MASTER`)
3. Liste usuários: nome, e-mail, role, ativo/inativo, criação, loja vinculada
4. Crie usuário com role `STORE_OWNER` / `MANAGER` / `OPERATOR` / `KITCHEN`, senha ≥ 8 (recomendado 12+)
5. Ative/desative o acesso ou altere a role (nunca `MASTER` por esta tela)
6. Reset de senha ainda é roadmap — a senha inicial não é reexibida após criar

Regras:
- Todo usuário criado nesta tela recebe o `storeId` da loja da rota
- `passwordHash` nunca é exposto na UI
- Usuário de loja acessa `/admin` da própria Store; **não** acessa `/master`
- E-mail duplicado retorna erro amigável

## Como receber pedidos

1. O cliente monta o pedido em `/na-brasa` e finaliza no checkout
2. O sistema **salva o pedido no banco** e abre o WhatsApp do cliente com a mensagem pronta (`wa.me`)
3. Você recebe a conversa no WhatsApp da loja **e** vê o mesmo pedido no painel `/admin`
4. Use o painel como registro operacional (status, itens, totais); use o WhatsApp para falar com o cliente

Pedidos novos entram com status **Pendente** (`PENDING`).

## Como acompanhar status

1. Em `/admin`, veja a lista (últimos pedidos) e os resumos do dia
2. Cada pedido mostra a **origem** ao lado do status: **Online** (cardápio), **Balcão** (comanda), e no futuro iFood/Outro
3. Toque/clique no pedido para abrir `/admin/pedidos/[id]` — a origem também aparece no cabeçalho
4. No detalhe, use os botões de ação para avançar (ou cancelar, quando permitido pela sua role)
5. Só aparecem ações **válidas** para o status, o tipo de entrega e a **role** atuais; o servidor rejeita transição ou permissão inválida

Não há filtro por origem nesta versão. Não há atualização automática em tempo real: atualize a página para ver pedidos novos ou mudanças de outra aba.

## Significado dos status

| Status (sistema) | Label | Significado operacional |
| --- | --- | --- |
| `PENDING` | Pendente | Pedido chegou; ainda não confirmado |
| `CONFIRMED` | Confirmado | Aceito; aguardando preparo |
| `PREPARING` | Em preparo | Cozinha/montagem em andamento |
| `READY` | Pronto | Pronto para retirada ou para sair |
| `OUT_FOR_DELIVERY` | Saiu para entrega | Em rota (somente entrega) |
| `COMPLETED` | Concluído | Finalizado (entregue ou retirado) |
| `CANCELLED` | Cancelado | Cancelado; sem novas ações |

### Fluxo típico — retirada (`PICKUP`)

```text
Pendente → Confirmado → Em preparo → Pronto → Concluído
```

Em **Pronto**, a retirada conclui direto (não há “Saiu para entrega”).

### Fluxo típico — entrega (`DELIVERY`)

```text
Pendente → Confirmado → Em preparo → Pronto → Saiu para entrega → Concluído
```

Em **Pronto**, a ação principal é **Saiu para entrega**.

Pedidos **Concluído** ou **Cancelado** não têm mais ações de status.

## Como validar pedidos no WhatsApp

1. Compare o detalhe no painel (itens, adicionais, totais, endereço, pagamento) com a mensagem recebida no WhatsApp
2. A mensagem salva no pedido (`whatsappMessage`) deve bater com o que o cliente enviou via `wa.me`
3. Se o número da loja no banco estiver errado, o `wa.me` abre o contato errado — corrija o WhatsApp da **Store** no banco (ver [deployment.md](deployment.md))

O MVP **não** envia mensagem automática pela API do WhatsApp: só abre o link com texto pronto no aparelho do cliente.

## Segurança no dia a dia

- Não compartilhe a senha do admin em chats ou prints
- Não deixe a sessão aberta em celular de terceiros
- Pedidos têm dados pessoais (nome, telefone, endereço) — trate o painel como área restrita
- Credenciais de login ficam no **banco** (`User`); secrets de sessão (`ADMIN_JWT_SECRET`) só nas envs do servidor
- `MASTER` entra em `/master` após login; `/admin` sem Store explícita redireciona para `/master`
- Usuários de loja são gerenciados em `/master/stores/[storeId]/users`

- Reset de senha ainda não existe no painel
- Sem CRUD de **lojas** no `/master` nesta etapa (cardápio é em `/admin/cardapio`)
- Bootstrap inicial do MASTER continua via seed `MASTER_ADMIN_*`

Para colocar o ambiente no ar: [deployment.md](deployment.md).
