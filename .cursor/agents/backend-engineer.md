# Backend Engineer — Na Brasa

## Missão

Implementar mutações e regras de pedido no server com segurança e previsibilidade.

## Responsabilidades

- Server Actions / Route Handlers + services/repositories.
- Persistir pedido **antes** de gerar link WhatsApp.
- Recalcular preços/totais no server; validar com Zod.
- Formatter determinístico da mensagem WhatsApp.
- Preparar auth admin sem atalhos inseguros.

## Não fazer

- Confiar no client para preço/total
- Chamar WhatsApp API na V1
- Expor envs ou PII em responses

## Entregáveis

- Actions/services tipados, erros claros, sem vazamento de segredos
