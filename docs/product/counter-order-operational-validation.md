# Counter order — operational validation

```text
technical delivery complete
client-validated production operation active
Online and Counter order flows operational
continuous observation recommended
product hypothesis for PDV-like expansion not validated
```

## Status

| Item | Classificação |
| --- | --- |
| Entrega técnica + E2E | **Concluído** |
| Uso Online/Balcão em produção (aceite do cliente) | **Validado** |
| Checklist abaixo (fricções, tempos, retorno ao papel) | **Convertido** para observação contínua |
| PDV / caixa / fiscal / impressão | **Ainda pendente** e fora do escopo |

This document remains useful for continuous observation with the owner/operator.
Automated E2E coverage does **not** replace live observation of friction.

## Fluxo entregue

```text
registrar comanda
→ confirmação no próprio Balcão (sem redirect)
→ formulário limpo · Nova comanda | Ver pedido | Ir para pedidos
→ preparar
→ READY
→ receber
→ COMPLETED
```

Operational distinction preserved:

```text
criar comanda ≠ receber pagamento ≠ concluir pedido
```

Post-create continuity: the operator can register two consecutive counter orders without leaving `/admin/balcao`.

## Pré-condições do piloto

- operador com papel `OPERATOR` (ou superior com `orders.create` / `orders.status.complete`)
- catálogo ativo com produtos e adicionais reais da loja
- acesso mobile/desktop a `/admin` e `/admin/balcao`
- ambiente de produção ou staging com dados da loja piloto
- papel físico ainda disponível como fallback na primeira janela

## Coverage already automated

- Playwright E2E: `tests/e2e/counter-order-flow.spec.ts`
- Mobile (Pixel 5): `tests/e2e/mobile-counter-order.spec.ts`
- Unit/integration coverage for schema, finalization service, generic-status bypass and change helpers

## Checklist de observação contínua

Use após deploys ou quando houver fricção relatada (não é gate de aceite geral):

- [ ] dono/operador abre a comanda em `/admin/balcao` sem bloqueio
- [ ] encontra produtos rapidamente
- [ ] adicionais corretos
- [ ] total de apresentação correto
- [ ] após registrar, permanece no Balcão com código e ações claras
- [ ] consegue registrar duas comandas seguidas sem sair da tela
- [ ] pedido aparece na fila de pedidos (e nos filtros, se aplicável)
- [ ] status acompanha o preparo até READY
- [ ] pagamento é registrado em Receber e finalizar
- [ ] troco correto para dinheiro
- [ ] comanda concluída como COMPLETED
- [ ] papel não foi necessário no turno observado
- [ ] tempo aceitável sob atendimento real
- [ ] erro/retrabalho registrado (se ocorrer)

## Dados a observar

- tempo para criar a comanda
- quantidade de toques até registrar
- retorno ao papel
- erro de item
- erro de adicional
- divergência de total
- erro de troco
- dificuldade de localizar o pedido na fila
- tentativa de finalizar sem pagamento
- feedback qualitativo do operador

## Incidentes

Registrar cada incidente durante a janela:

- horário aproximado
- passo do fluxo
- impacto (parou o atendimento? voltou ao papel?)
- se foi possível retomar no sistema
- captura/screenshot se útil (sem PII desnecessária)

## Responsável

- Validation owner: Product Engineer + Store Owner
- Operação observada: operador/dono da loja piloto

## Janela de observação

- operação em produção já ativa; observar fricções em turnos reais
- não declarar hipótese pontual “resolvida” apenas porque CI passou
- novas evoluções do Balcão exigem evidência + `product-grill`

## Resultado (por ciclo de observação)

Após cada janela relevante, classificar a hipótese observada:

- **PROSSEGUIR** — evidência autoriza próximo incremento alinhado
- **AJUSTAR** — útil, mas precisa correção pontual de UX/regra
- **REPOSICIONAR** — hipótese parcialmente válida; muda o formato
- **INTERROMPER** — não reduz esforço operacional / sem valor observado

## Fora do PDV

Ainda fora do escopo:

- caixa / sangria / suprimento
- conciliação financeira
- gateway Pix/cartão
- fiscal
- estoque
- impressão
