# Workflow — Release

Atuar como Release Manager.

## 1. Ambiente

- Conferir envs de produção (ver `production-check.md`)
- Confirmar que `.env` local não sobe para o git

## 2. Banco

- Migrations pendentes aplicadas no alvo
- Seed apenas se necessário e com dados seguros/fictícios

## 3. Build

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

## 4. Smoke test

- Cardápio abre no mobile viewport
- Fluxo de pedido (ou stub atual) não quebra
- Admin acessível conforme estágio do auth

## 5. Checklist e notas

- Completar `commands/production-checklist.md`
- Gerar `commands/release-notes.md`
- Go / no-go explícito
