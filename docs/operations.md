# Operação — Painel Na Brasa (MVP)

Guia para o dono/operador usar o painel no dia a dia.

Documentos relacionados: [README](../README.md) · [Deploy](deployment.md) · [Produto](product.md) · [Release notes](release-notes/mvp-v0.1.0.md)

## Como o dono opera o painel

1. Abra a URL do app em produção (ex.: `https://seu-dominio/admin/login`)
2. Entre com o e-mail e a senha configurados nas variáveis de ambiente (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
3. Após o login, você é levado ao dashboard `/admin`
4. Use **Sair** (logout) ao terminar o turno, principalmente em aparelho compartilhado

A sessão fica em cookie **HttpOnly** (não aparece em `localStorage`). Em produção o cookie só trafega em HTTPS (`Secure`).

## Como receber pedidos

1. O cliente monta o pedido em `/na-brasa` e finaliza no checkout
2. O sistema **salva o pedido no banco** e abre o WhatsApp do cliente com a mensagem pronta (`wa.me`)
3. Você recebe a conversa no WhatsApp da loja **e** vê o mesmo pedido no painel `/admin`
4. Use o painel como registro operacional (status, itens, totais); use o WhatsApp para falar com o cliente

Pedidos novos entram com status **Pendente** (`PENDING`).

## Como acompanhar status

1. Em `/admin`, veja a lista (últimos pedidos) e os resumos do dia
2. Toque/clique no pedido para abrir `/admin/pedidos/[id]`
3. No detalhe, use os botões de ação para avançar (ou cancelar, quando permitido)
4. Só aparecem ações **válidas** para o status e o tipo de entrega atuais; o servidor rejeita transição inválida

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
- Credenciais ficam só nas envs do servidor (Vercel), nunca no código

## Limitações atuais do MVP

- Sem CRUD de cardápio no painel (mudanças de cardápio são via banco/seed por enquanto)
- Sem upload de imagens
- Sem notificações em tempo real (sem WebSocket/polling) — atualize a página
- Sem WhatsApp Cloud API / chatbot
- Sem pagamento online
- Sem múltiplos usuários admin
- Sem histórico/auditoria de mudanças de status
- Sem campo de motivo de cancelamento

Para colocar o ambiente no ar: [deployment.md](deployment.md).
