# Operação — Painel Na Brasa (MVP)

Guia para o dono/operador usar o painel no dia a dia.

Documentos relacionados: [README](../README.md) · [Deploy](deployment.md) · [Produto](product.md) · [Release notes](release-notes/mvp-v0.1.0.md)

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
4. Operador pode marcar produto **disponível/indisponível** no cardápio público (campo `active`).
5. Cozinha só visualiza o cardápio administrativo.
6. Não há exclusão física nesta etapa — prefira desativar ou marcar indisponível.

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
- Sem CRUD de lojas / cardápio no master nesta etapa
- Bootstrap inicial do MASTER continua via seed `MASTER_ADMIN_*`

Para colocar o ambiente no ar: [deployment.md](deployment.md).
