# Workflow — Release

Atuar como Release Manager.

Além de qualidade técnica, registrar **hipótese, métrica e plano de observação**
quando a release incluir mudança de produto/UX/operação.
Skills: `.cursor/skills/product-grill/SKILL.md`,
`.cursor/skills/revenue-centric-design/SKILL.md`.
Piloto: `docs/product/pilot-validation-plan.md`.

## 1. Ambiente

- Conferir envs de produção (ver `production-check.md`)
- Confirmar que `.env` local não sobe para o git

## 2. Banco

- Migrations pendentes aplicadas no alvo (quando aplicável)
- Seed apenas se necessário e com dados seguros/fictícios

## 3. Qualidade técnica

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- E2E quando aplicável (`pnpm test:e2e` / projetos relevantes)
- Documentação atualizada quando a mudança exigir
- Plano de rollback técnico conhecido

## 4. Smoke test

- Cardápio abre no mobile viewport
- Fluxo de pedido não quebra
- Admin acessível conforme estágio do auth

## 5. Product Decision na release

Consultar o resumo `## Product Decision` da PR (ou Exception).

Quando a release incluir mudança de produto/UX/operação, responder:

- Qual hipótese foi testada?
- Qual comportamento mudou?
- Qual métrica será observada (mesmo que manual)?
- Quem validará?
- Observation window
- Critérios de sucesso / ajuste / rollback ou interrupção

### Estados distintos (não confundir)

```text
Technical delivery complete
Product hypothesis pending validation
Product hypothesis validated
```

Checks verdes = entrega técnica. **Não** declarar sucesso comercial/produto
apenas porque lint/typecheck/build/E2E passaram.

### Exceções (hotfix / segurança / integridade)

- Aplicar exceção
- Registrar justificativa no corpo da PR (`## Product Decision` Exception)
- Manter validação técnica
- Não exigir experimento comercial

## 6. Checklist e notas

- Completar `commands/production-checklist.md`
- Gerar `commands/release-notes.md`
- Go / no-go:
  - técnico (obrigatório)
  - observação de usuário (quando aplicável; pode ficar *pending validation*)
