# Workflow — Feature development

Use com Product Owner + Architect + Engineer(s) relevantes.

**Gate de produto:** nenhuma feature relevante começa sem `product-grill`.
Skills: `.cursor/skills/product-grill/SKILL.md` e, se houver UI/UX/operação,
`.cursor/skills/revenue-centric-design/SKILL.md`.
Plano do piloto: `docs/product/pilot-validation-plan.md`.

## 1. Entender objetivo e estágio

- Ler `docs/product.md`
- Qual problema do Na Brasa / da plataforma isso resolve?
- Quem usa: cliente no celular ou operador no admin?
- Em qual fase do piloto estamos?

## 2. Classificar e grill

- Classificar PLATFORM / TENANT / CLIENT_SPECIFIC
- Executar **product-grill** (saída completa + artefato da decisão)
- Registrar a saída em `## Product Decision` no plano da feature

### Gate

| Decisão | Ação |
| --- | --- |
| **BUILD** | Seguir para hipótese/métrica e, se UI/UX/operação, revenue-centric-design |
| **VALIDATE** | Entregar experimento concreto; **parar** (sem arquitetura) |
| **REDUCE SCOPE** | Cortar escopo, reformular, **re-executar product-grill**; só seguir se a nova decisão for BUILD |
| **DEFER** | Registrar condição/data; **parar** |
| **REJECT** | Registrar razão + evidência de reabertura; **parar** |

`REDUCE SCOPE` **nunca** autoriza arquitetura nem é BUILD implícito.

Exceções (segurança / integridade / regressão bloqueadora): registrar exceção e
seguir com validação técnica — ver skill e corpo da PR.

## 3. Hipótese e métrica (somente após BUILD)

- Hipótese em teste
- Comportamento esperado
- Métrica observável
- Menor mudança
- Validation owner + observation window

## 4. Design centrado em comportamento (se UI/UX/operação)

- Executar **revenue-centric-design** (consome o BUILD do grill)
- Confirmar funil, fricção, success / adjustment / rollback criteria

## 5. Checar escopo técnico

- Alinhado à V1 / estágio do piloto?
- WhatsApp API / pagamento / iFood / RN / analytics complexo → recusar ou adiar
- PR pequena; se não, fatiar

## 6. Planejar arquivos

- Paths em `src/`, `prisma/`, docs
- Fronteiras server/client e Zod
- Usar `commands/plan-feature.md` se média/grande

## 7. Implementar

- `commands/implement-feature.md`
- Consumir o plano (não reabrir descoberta)
- Commits só se o usuário pedir

## 8. Testar (técnico)

- Fluxos críticos + `pnpm lint` / `typecheck` / `build` (+ E2E quando couber)

## 9. Fechar com observação

- [ ] Testes técnicos passaram?
- [ ] Comportamento entregue conforme plano?
- [ ] Plano de observação, owner e prazo?
- [ ] Riscos remanescentes?

## 10. Reportar e registrar na PR

No corpo da PR, incluir resumo:

```md
## Product Decision

- Decision:
- Problem:
- Hypothesis:
- Metric:
- Validation owner:
- Observation window:
```

Exceção crítica:

```md
## Product Decision

Exception: critical security, integrity or blocking regression fix.

- Reason:
- Risk mitigated:
- Validation:
```

Também reportar: arquivos, validações, fora de escopo.
Opcional: `commands/finish-task.md` + `review-diff.md`.
