# Workflow — Feature development

Use com Product Owner + Architect + Engineer(s) relevantes.

## 1. Entender objetivo

- Qual problema do Na Brasa isso resolve?
- Quem usa: cliente no celular ou operador no admin?

## 2. Checar escopo

- Está na V1? Se for WhatsApp API / pagamento / iFood / RN → recusar ou adiar.
- Cabe em uma PR pequena? Se não, fatiar.

## 3. Planejar arquivos

- Listar paths em `src/`, `prisma/`, docs
- Fronteiras server/client e validações Zod
- Usar `commands/plan-feature.md` e aguardar alinhamento se a feature for média/grande

## 4. Implementar incrementalmente

- Seguir `commands/implement-feature.md`
- Commits lógicos (só se o usuário pedir commit)
- Sem misturar refactor amplo

## 5. Testar

- Fluxos críticos + `pnpm lint` / `typecheck` / `build`
- Usar `commands/create-tests.md` quando houver lógica pura (totais, WhatsApp, Zod)

## 6. Reportar

- Arquivos criados/alterados, validações, aceite, fora de escopo
- Opcional: `commands/finish-task.md` + `review-diff.md`
