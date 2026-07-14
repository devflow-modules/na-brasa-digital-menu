# Produto — Na Brasa Cardápio Online

## Problema

O Na Brasa opera como carrinho de lanche com ponto fixo. Hoje o atendimento depende de conversa manual; falta um cardápio digital claro para o cliente montar o pedido e para o operador registrar/acompanhar pedidos.

## Solução (MVP)

Um cardápio online mobile-first onde o cliente:

1. Navega categorias e itens
2. Monta o carrinho
3. Informa dados básicos do pedido
4. Envia o pedido via WhatsApp (link com mensagem pronta)

O operador visualiza pedidos salvos em um painel simples.

## Fora do escopo da V1

- WhatsApp Business API / chatbot automático
- App nativo (React Native)
- Backend Express separado
- Pagamentos online
- Multi-loja avançado (há `STORE_SLUG` para preparar o caminho)

## Personas

- **Cliente**: pede pelo celular, quer clareza de itens/preços e envio rápido no WhatsApp
- **Operador Na Brasa**: precisa ver pedidos entrando e confirmar atendimento

## Fluxo alvo

```text
Cliente abre /na-brasa
  → escolhe itens
  → revisa carrinho
  → checkout
  → pedido salvo no sistema
  → redireciona/abre WhatsApp com mensagem formatada
  → operador vê pedido no /admin
```

## Princípios

- Mobile-first
- Fluxo curto até o WhatsApp
- Código simples e tipado
- Incremental: fundação → catálogo → carrinho → checkout → admin

## Modelo de dados inicial

O schema Prisma cobre catálogo e pedidos. Detalhes em `docs/database.md`.

### Catálogo

- **Store** — loja `na-brasa` (WhatsApp, endereço, taxas)
- **Category** / **Product** / **Addon** — cardápio com `active`, `available` (produto) e `sortOrder`
- **ProductAddon** — quais adicionais cada produto aceita

### Pedidos

- **Order** — dados do cliente, entrega, pagamento, totais em centavos, `status` e `source`
- **OrderItem** — snapshot do produto + quantidade + total da linha
- **OrderItemAddon** — snapshot do adicional no item

### Enums

- `OrderStatus`, `DeliveryType`, `PaymentMethod`, `OrderSource`

### Dinheiro

Preços e totais usam inteiros em **centavos** (`priceCents`, `totalCents`, etc.).

Na criação do pedido, o server recalcula totais — não confiar em preço vindo do client.

## Cardápio público

- Rota `/na-brasa` renderiza `Store`, categorias e produtos ativos do banco (Server Component + Prisma no server).
- Exibe status aberto/fechado, retirada/entrega, taxa e pedido mínimo quando aplicável.

## Carrinho local

- O cliente monta o pedido no navegador (estado + `localStorage`).
- Adicionais entram no total do item: `(preço do produto + soma dos adicionais) × quantidade`.
- Preços no carrinho são snapshots client-side; na criação do pedido o **server recalcula** tudo.

## Checkout

- Rota `/na-brasa/checkout` captura dados do cliente (nome, telefone, retirada/entrega, pagamento, observações).
- Validação client com Zod + React Hook Form; totais no checkout são **estimados**.
- Ao finalizar, o client envia só IDs/quantidades (sem preços como fonte de verdade).

## Criação de pedido

- Server Action cria o pedido **antes** de abrir o WhatsApp.
- O server recalcula preços, taxas e total a partir do banco (produtos/adicionais ativos).
- `OrderItem` / `OrderItemAddon` gravam **snapshots** para preservar o histórico.
- Status inicial: `PENDING`; origem: `DIRECT`.
- Mensagem formatada é salva em `Order.whatsappMessage`.
- O cliente é redirecionado para `https://wa.me/<telefone>?text=...` (link, **não** WhatsApp API).
- Em sucesso, o carrinho local (`na-brasa-cart-v1`) é limpo.

## Admin (auth)

- `/admin` é área restrita: sem sessão válida, redireciona para `/admin/login`.
- Login autentica `User` no banco (`email` + `passwordHash` com bcrypt); usuários inativos são rejeitados.
- Sessão: JWT (`jose`) em cookie **HttpOnly**, `SameSite=Lax`, `Secure` em produção, path `/`, claims `userId`, `name`, `email`, `role`, `storeId`.
- **`/master`**: painel da DevFlow Labs — somente `role === MASTER` (`requireMasterSession`). Sem sessão → `/admin/login`; não-MASTER → `notFound()`.
- `/admin` é o painel da loja/cliente (**store-scoped** via `requireAdminStoreContext`):
  - roles de loja usam `session.storeId`;
  - `MASTER` resolve Store por `NEXT_PUBLIC_STORE_SLUG` (acesso **transicional**);
  - pedido fora da Store → `notFound()` / “Pedido não encontrado.”
- Logout limpa o cookie e volta para `/admin/login`.
- Bootstrap do primeiro usuário: seed com `MASTER_ADMIN_*` (não `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
- **Permissões por role no `/admin`** (status de pedidos): validadas no server a partir da role da sessão; a UI esconde ações não permitidas. Podem evoluir por cliente/plano no futuro.

## Master (plataforma)

- `/master` mostra cards: lojas, lojas abertas (`Store.isOpen`), pedidos totais/pendentes/concluídos.
- Lista de lojas: nome, slug, WhatsApp mascarado, link público `/{slug}`, contagem de pedidos, `createdAt`.
- **Usuários por loja:** `/master/stores/[storeId]/users` — MASTER lista/cria usuários vinculados à Store; roles permitidas: `STORE_OWNER`, `MANAGER`, `OPERATOR`, `KITCHEN`.
- Ações: criar (bcrypt hash), ativar/desativar (`isActive`), alterar role de loja.
- Não cria `MASTER` por essa UI; `storeId` vem da rota validada; senha não é reexibida.
- Reset de senha e CRUD de lojas = roadmap.
- Roles de loja acessam `/admin` (store-scoped), não `/master`.

## Admin (pedidos)

- `/admin` lista os últimos 50 pedidos (read-only), com cards de resumo.
- `/admin/pedidos/[id]` mostra detalhe: cliente, itens/adicionais, totais, endereço, pagamento e `whatsappMessage`.
- Cards usam dia local do servidor (`setHours(0,0,0,0)`); receita de hoje exclui `CANCELLED`.
- Link para `/admin/cardapio` no dashboard (gerenciar ou ver conforme a role).

## Gestão de cardápio (`/admin/cardapio`)

- Lista categorias e produtos da Store efetiva (store-scoped).
- Preços em **centavos** no banco; formulários aceitam reais e convertem no server.
- **`Product.active`**: publicação no catálogo (`false` = oculto em `/{slug}`).
- **`Product.available`**: disponibilidade operacional (`false` = aparece como indisponível, sem pedido).
- Sem upload de imagem, sem delete físico e sem addons avançados.

| Role | Ver | Criar/editar produto | Categorias | Disponível/indisponível (`available`) | Publicar/ocultar (`active`) |
| --- | --- | --- | --- | --- | --- |
| `MASTER` | sim | sim | sim | sim | sim |
| `STORE_OWNER` | sim | sim | sim | sim | sim |
| `MANAGER` | sim | sim | sim | sim | sim |
| `OPERATOR` | sim | não | não | sim | não |
| `KITCHEN` | sim | não | não | não | não |

## Gestão de adicionais (`/admin/cardapio/adicionais`)

- Lista adicionais da Store efetiva e produtos para vínculo (`ProductAddon`).
- **`Addon.active`**: `false` remove o adicional da escolha no cardápio público (quando vinculado).
- Sem delete físico; sem grupos obrigatórios, min/max ou estoque nesta etapa.
- Link **Gerenciar adicionais** em `/admin/cardapio` para quem tem `menu.addon.read`.

| Role | Ver | Criar/editar | Ativar/desativar | Vincular/desvincular produto |
| --- | --- | --- | --- | --- |
| `MASTER` | sim | sim | sim | sim |
| `STORE_OWNER` | sim | sim | sim | sim |
| `MANAGER` | sim | sim | sim | sim |
| `OPERATOR` | sim | não | não | não |
| `KITCHEN` | sim | não | não | não |

Pedido/checkout valida no server: adicional ativo e vinculado ao produto; preço vem do banco.

## Gestão de status

- No detalhe `/admin/pedidos/[id]`, o admin pode avançar o status com ações controladas.
- Transições validadas no server (não confiar nos botões do client).
- Além da transição válida, a **role da sessão** precisa ter permissão para a ação.
- Enum Prisma: `PENDING` → `CONFIRMED` → `PREPARING` → `READY` → (`OUT_FOR_DELIVERY` se entrega) → `COMPLETED`, com `CANCELLED` até o pedido ser finalizado.
- Retirada (`PICKUP`): em `READY` não há “Saiu para entrega”; pode concluir direto.
- Entrega (`DELIVERY`): em `READY` a ação principal é `OUT_FOR_DELIVERY`.
- Não há notificação automática, WhatsApp API, WebSocket ou polling nesta etapa.

### Matriz de permissões (`/admin`)

| Role | Ver pedidos | Confirmar | Preparar / pronto | Despachar / concluir | Cancelar |
| --- | --- | --- | --- | --- | --- |
| `MASTER` | sim (transicional) | sim | sim | sim | sim |
| `STORE_OWNER` | sim | sim | sim | sim | sim |
| `MANAGER` | sim | sim | sim | sim | sim |
| `OPERATOR` | sim | sim | sim | sim | **não** |
| `KITCHEN` | sim | **não** | sim | **não** | **não** |
