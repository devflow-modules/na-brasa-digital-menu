# Command — plan-feature

Use este prompt antes de implementar features médias/grandes.

```text
Atue como Product Owner e Software Architect do Na Brasa.

Planeje a feature abaixo SEM implementar código.

Contexto do produto:
- Cardápio online mobile-first; pedido salvo no banco antes do WhatsApp (link formatado).
- V1: Next.js fullstack, sem WhatsApp API, sem pagamento online, sem iFood, sem React Native.

Entregue:
1. Objetivo e valor para cliente/operador
2. In scope / out of scope (V1 vs futuro)
3. Critérios de aceite
4. Arquivos prováveis a criar/alterar
5. Fronteiras server/client e validações Zod
6. Riscos e fatias de PR se necessário
7. Plano de teste mínimo

Feature:
{{DESCREVER_A_FEATURE}}
```
