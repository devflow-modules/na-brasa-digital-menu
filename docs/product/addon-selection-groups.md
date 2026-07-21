# Grupos de seleção de adicionais

Feature TENANT: `AddonGroup` + `AddonGroupOption` com `minSelection` / `maxSelection`.

## Status

```text
BUILD
Classification: TENANT
Lote 1: grupo por produto + validação server-side + UI radio/checkbox + admin no produto
```

## Product Decision

```md
## Product Decision

- Problem: Adicionais independentes não modelam “escolha um ou outro”.
- Evidence: Cheddar + Prato podiam ser selecionados juntos no Pão Carne Queijo.
- Hypothesis: Grupos com limites min/max validam exclusividade no cliente e no servidor.
- Expected behavior: maxSelection=1 usa radio; servidor rejeita cheddar+prato.
- Primary metric: Zero pedidos com dois queijos extras após deploy.
- Guardrail metrics: Adicionais independentes intactos; snapshots históricos intactos; preço só do banco.
- Classification: TENANT
- Decision: BUILD (Lote 1)
```

## Domínio

- `ProductAddon` continua para adicionais independentes.
- `AddonGroup` pertence a um produto (não compartilhado entre produtos no Lote 1).
- Um adicional ativo em um grupo deixa de ser link independente desse produto.
- Pedidos continuam com `addonIds[]` e snapshots `addonNameSnapshot` / `addonPriceCents`.

## Piloto Na Braza

Grupo `Escolha o queijo extra` no `Pão Carne Queijo`:

- minSelection: 0
- maxSelection: 1
- opções: Cheddar extra, Queijo prato extra

Configurado via `pnpm menu:apply-na-braza-pilot`.

## Fora do Lote 1

Grupos compartilhados, quantidade por opção, preço por produto, condicionais, drag-and-drop, snapshot de nome do grupo.
