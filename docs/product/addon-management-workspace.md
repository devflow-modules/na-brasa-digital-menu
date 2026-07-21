# Workspace de gerenciamento de adicionais

Feature TENANT: recomposição da UI de `/admin/cardapio/adicionais` para progressive disclosure.

## Status

```text
BUILD
Classification: TENANT
Lote 1: lista compacta + busca/filtros + editor sob demanda + vínculos sob demanda
Sem drawer / criação em massa / edição inline de preço / mudança de actions
```

## Product Decision

```md
## Product Decision

- Problem: A tela de adicionais montava formulário de edição e vínculos para todos os itens ao mesmo tempo.
- Evidence: Revisão de UI + código; scroll e risco operacional aumentam com dezenas de adicionais.
- Hypothesis: Linhas compactas + edição/vínculos sob demanda + busca/filtros reduzem tempo de localização sem mudar regras.
- Expected behavior: STORE_OWNER/MANAGER vê lista escaneável, edita um adicional por vez e gerencia vínculos sob demanda.
- Primary metric: Localizar e editar/vincular um adicional em ≤ 30s no cardápio piloto.
- Guardrail metrics: Zero mudança em Prisma/actions/permissões; regras de preço/active intactas; cardápio público intacto.
- Classification: TENANT
- Decision: BUILD (Lote 1)
- Rationale: Dor estrutural; menor fatia é só UI sobre o mesmo catálogo e mutations.
- Smallest implementation: AddonManagementWorkspace client + filters puros + E2E.
- Validation owner: Product Engineer + Store Owner
- Observation window: 7–14 dias após deploy
```

## Guardrails

Não alterar neste lote: schema Prisma, queries, as 5 server actions (`create`/`update`/`toggle`/`link`/`unlink`), permissões, regras de preço/`active`, cardápio público.
