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
