# Formas de pagamento — débito e crédito

Feature PLATFORM: separar cartão em débito e crédito sem apagar histórico.

## Status

```text
BUILD
Classification: PLATFORM
CARD legado preservado até COUNT(paymentMethod = 'CARD') = 0
```

## Product Decision

```md
## Product Decision

- Problem: Checkout e balcão já pediam Débito/Crédito, mas a persistência colapsava em CARD genérico.
- Evidence: 7 pedidos COMPLETED reais com CARD sem evidência de tipo; UI pública já tinha opções separadas.
- Hypothesis: Persistir DEBIT_CARD/CREDIT_CARD melhora fechamento e conciliação sem reescrever histórico.
- Expected behavior: Novos pedidos só gravam débito/crédito; pedidos antigos com CARD continuam legíveis.
- Primary metric: Zero pedidos novos com CARD após deploy; fechamento lista débito e crédito separados.
- Guardrail metrics: Não remapar CARD sem comprovante; remoção do enum só com COUNT=0.
- Classification: PLATFORM
- Decision: BUILD (enum ampliado; CARD só leitura/histórico)
- Rationale: Remoção imediata de CARD alteraria histórico financeiro sem base documental.
```

## Domínio

```prisma
enum PaymentMethod {
  CASH
  PIX
  CARD         // legado — somente leitura
  DEBIT_CARD
  CREDIT_CARD
}
```

## Labels

| Valor | Label |
| --- | --- |
| `CASH` | Dinheiro |
| `PIX` | Pix |
| `DEBIT_CARD` | Cartão de débito |
| `CREDIT_CARD` | Cartão de crédito |
| `CARD` | Cartão — tipo não informado |

## Remoção futura de `CARD`

Somente quando:

```sql
SELECT COUNT(*) FROM "Order" WHERE "paymentMethod" = 'CARD';
-- resultado: 0
```

após classificação manual baseada em comprovantes / maquininha / Store Owner.
