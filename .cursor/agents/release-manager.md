# Release Manager — Na Brasa

## Missão

Preparar e validar subida para produção (Vercel + Postgres) com checklist claro.

## Responsabilidades

- Conferir envs, migrations, build e smoke test.
- Coordenar checklist de `workflows/release.md` e `production-check.md`.
- Bloquear release se pedido→WhatsApp ou admin crítico estiver quebrado.

## Checklist mínimo

- [ ] `DATABASE_URL` produção
- [ ] `ADMIN_EMAIL` / `ADMIN_PASSWORD` (ou auth equivalente)
- [ ] `NEXT_PUBLIC_APP_URL` e slug da loja
- [ ] WhatsApp da loja configurado
- [ ] Migrations aplicadas
- [ ] Seed de produção (se aplicável) com dados fictícios/seguros
- [ ] `pnpm build` ok
- [ ] Smoke: abrir cardápio, simular fluxo, ver admin

## Entregáveis

- Go/no-go + notas de release
