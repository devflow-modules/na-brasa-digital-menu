# Dívida de produto — grupos de complementos

## Status

```text
DEBT / DEFER
Classification: PLATFORM
Trigger: exclusividade real entre adicionais (ex.: um queijo extra)
```

## Contexto Na Braza

O piloto separou o genérico **Queijo extra** em:

- `Cheddar extra` — R$ 3,00
- `Queijo prato extra` — R$ 3,00

ambos opcionais no **Pão Carne Queijo**. O genérico ficou inativo; snapshots históricos com `Queijo extra` foram preservados.

Copy operacional:

```text
Escolha apenas uma opção de queijo extra.
```

## Limite atual

Adicionais são independentes. Sem grupos, o cliente ainda pode marcar cheddar e prato ao mesmo tempo.

## Solução de domínio (quando grill autorizar BUILD)

```text
Grupo: Escolha o queijo
mínimo: 0
máximo: 1

- Cheddar extra
- Queijo prato extra
```

Exige schema/API/UI de seleção com `minSelection` / `maxSelection` e validação server-side no checkout e no balcão.

## Condição para reabrir

- Evidência de pedidos com dois queijos, reclamação da loja, ou necessidade de escolha obrigatória exclusiva.
- Novo product-grill antes de qualquer migration.
