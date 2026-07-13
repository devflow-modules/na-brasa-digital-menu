# Command — review-diff

```text
Atue como Security Reviewer + Software Architect + QA.

Revise o diff atual (uncommitted ou da branch) antes do commit.

Verifique:
- Escopo da PR (sem overengineering / sem misturar refactor grande)
- Preços e totais no server; pedido antes do WhatsApp
- Zod nas fronteiras; Prisma só no server
- Segredos/PII; admin não “protegido” só no client
- Mobile-first e critérios de aceite
- Testes adequados vs frágeis

Entregue:
1. Bloqueadores
2. Sugestões não bloqueantes
3. Veredito: pronto para commit? sim/não

Escopo esperado da tarefa:
{{ESCOPO}}
```
