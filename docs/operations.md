# Operação — Painel Na Braza (MVP)

Guia para o dono/operador usar o painel no dia a dia.

Documentos relacionados: [README](../README.md) · [Deploy](deployment.md) · [Produto](product.md) · [Release notes](release-notes/mvp-v0.1.0.md) · [Dados do piloto Na Braza](client/na-braza-pilot-data.md)

## Dados reais da loja (Na Braza)

Fonte: [client/na-braza-pilot-data.md](client/na-braza-pilot-data.md). Slug técnico permanece `na-brasa`; rota pública `/na-brasa`.

- Nome exibido: **Na Braza**
- WhatsApp de pedidos: **5513981091971** (13 98109-1971)
- Endereço: Barão de Ramalho, 155 — Macuco — Santos/SP
- Horário (texto no cardápio): segunda a domingo 17:30–00:00; em chuva forte não abre
- Taxa base de entrega (piloto): R$ 6,00 · pedido mínimo entrega: R$ 30,00
- Retirada e entrega habilitadas no piloto

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
2. Entre com o **e-mail e senha do usuário** cadastrado no banco (ex.: `MASTER` criado via seed `MASTER_ADMIN_*`)
3. Após o login, você é levado ao dashboard `/admin`
4. Use **Sair** (logout) ao terminar o turno, principalmente em aparelho compartilhado

A sessão fica em cookie **HttpOnly** (não aparece em `localStorage`). Em produção o cookie só trafega em HTTPS (`Secure`).

Nota: usuários `MASTER` devem preferir o painel **`/master`** (DevFlow Labs). O acesso de `MASTER` ao `/admin` ainda é **transicional** e fica limitado à Store de `NEXT_PUBLIC_STORE_SLUG`.

## Isolamento por loja no `/admin`

- Pedidos, cards e detalhe são filtrados pelo `storeId` da sessão.
- Usuários `STORE_OWNER` / `MANAGER` / `OPERATOR` / `KITCHEN` **precisam** ter `storeId` no banco.
- Sem `storeId`, o acesso ao `/admin` é bloqueado.
- Pedido de outra loja retorna 404 (não revela existência).
- Ações de status dependem da **role** do usuário (além da transição válida do fluxo).

## Permissões por role no `/admin`

| Role | Ver pedidos | Confirmar | Preparar / pronto | Despachar / concluir | Cancelar |
| --- | --- | --- | --- | --- | --- |
| `MASTER` | sim (transicional) | sim | sim | sim | sim |
| `STORE_OWNER` | sim | sim | sim | sim | sim |
| `MANAGER` | sim | sim | sim | sim | sim |
| `OPERATOR` | sim | sim | sim | sim | não |
| `KITCHEN` | sim | não | sim | não | não |

- Roles de loja acessam `/admin` da própria Store.
- Permissões são aplicadas **server-side** (role da sessão); a UI só esconde botões não permitidos.
- `MASTER` continua com acesso transicional ao `/admin`.
- A matriz pode evoluir por cliente/plano no futuro.

## Cardápio (`/admin/cardapio`)

1. No dashboard `/admin`, use **Gerenciar cardápio** (ou **Ver cardápio** para perfis só leitura).
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

1. No dashboard `/admin`, use **Configurações** (visível para todas as roles que podem ver pedidos/cardápio conforme matriz).
2. Dono/gerente editam WhatsApp, endereço, taxa de entrega (R$ na tela, centavos no banco), retirada/entrega e texto de horário.
3. Operador **não** altera dados estruturais, mas pode **abrir ou fechar** a loja para pedidos (`isOpen`).
4. Cozinha só visualiza.
5. Mudanças refletem no cardápio público e no checkout após salvar (revalidate).
6. Com a loja fechada, o cliente ainda vê o cardápio, mas não consegue finalizar pedido.
7. E2E/smoke: testes que alteram a Store **restauram** WhatsApp, flags e `isOpen` ao final — não deixe a Na Braza fechada após rodar testes em banco compartilhado.

## Pilot operation

Rotina recomendada para o Na Braza no piloto (sem feature nova — uso do que já existe).

### Abertura e fechamento

1. Login como `MANAGER`, `STORE_OWNER` ou `OPERATOR` (conforme permissão).
2. Abra `/admin/configuracoes`.
3. **Abrir loja:** `OPERATOR` usa o botão abrir/fechar; dono/gerente pode usar o mesmo toggle ou o checkbox “Loja aberta” + salvar.
4. **Fechar loja:** mesmo fluxo — cardápio público continua visível, mas checkout e novos pedidos ficam bloqueados no server.
5. Ao fim do turno, confira que a loja está no estado desejado (geralmente **aberta** se ainda aceita pedidos pelo link).

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

### Se algo sair errado nas configurações

1. Volte como `MANAGER`/`STORE_OWNER` em `/admin/configuracoes`.
2. Restaure WhatsApp, endereço, horário, taxa, entrega/retirada e **loja aberta**.
3. Confira `/na-brasa` em aba anônima ou outro aparelho.
4. Em emergência, feche a loja (`isOpen=false`) para parar novos pedidos enquanto corrige.

## Painel Master (`/master`)

1. Faça login em `/admin/login` com usuário role `MASTER`
2. Abra `/master` — operação geral da plataforma (lojas, contagens de pedidos)
3. Links úteis: cardápio público da loja (`/{slug}`), `/admin` temporário, **Sair**
4. Usuários de loja (`STORE_OWNER`, `OPERATOR`, etc.) **não** acessam `/master`

`/admin` permanece o painel operacional da **loja/cliente**.

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
2. Toque/clique no pedido para abrir `/admin/pedidos/[id]`
3. No detalhe, use os botões de ação para avançar (ou cancelar, quando permitido pela sua role)
4. Só aparecem ações **válidas** para o status, o tipo de entrega e a **role** atuais; o servidor rejeita transição ou permissão inválida

Não há atualização automática em tempo real: atualize a página para ver pedidos novos ou mudanças de outra aba.

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
- `MASTER` prefere `/master`; acesso a `/admin` ainda é transicional
- Usuários de loja são gerenciados em `/master/stores/[storeId]/users`
- Reset de senha ainda não existe no painel
- Sem CRUD de **lojas** no `/master` nesta etapa (cardápio é em `/admin/cardapio`)
- Bootstrap inicial do MASTER continua via seed `MASTER_ADMIN_*`

Para colocar o ambiente no ar: [deployment.md](deployment.md).
