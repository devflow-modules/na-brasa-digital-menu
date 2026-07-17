# Admin new-order notifications — validation

```text
Notification query foundation complete
Admin notification UI complete
Login lifecycle fix complete
Manual smoke passed
E2E validation complete
Admin order queue live refresh complete
Existing notification polling reused
No duplicate queue polling introduced
Visibility, status and COUNTER refresh coordinated
No WebSocket or SSE
Product hypothesis pending real validation
```

This document records technical delivery and how to validate the feature.
Automated E2E does **not** prove the product hypothesis with a real store owner.

## Fluxo entregue

```text
admin autenticado com painel aberto
→ bootstrap sem replay histórico
→ novo DIRECT da mesma Store
→ banner in-app + badge PENDING + som opcional
→ sinal de refresh da fila (debounce 250ms) → router.refresh()
→ operador vê o pedido na lista sem F5
→ operador abre o detalhe ou dispensa
```

Operational rules:

- alerta somente `DIRECT`;
- `COUNTER` permanece silencioso;
- som desligado por padrão (`admin.newOrderSound`);
- browser/aba precisa estar aberta (sem Web Push);
- múltiplas abas podem alertar o mesmo pedido.

## Pré-condições

- usuário de loja (`OPERATOR` ou superior com `orders.read`);
- painel `/admin` aberto após login;
- pedidos online (`DIRECT`) chegando na mesma Store;
- ambiente local/CI com Postgres de teste (nunca Neon de produção para fixtures).

## Smoke manual (já aprovado)

Executado no HEAD `c9b65d9` (PR #59) com cenários A–G:

| Cenário | Resultado |
| --- | --- |
| A — login real / chrome pós-auth | PASS |
| B — bootstrap sem replay | PASS |
| C — DIRECT banner/badge/som | PASS |
| D — dismiss sem replay | PASS |
| E — COUNTER silencioso | PASS |
| F — visibility hidden/visible | PASS |
| G — logout/login | PASS |

O processo Playwright `--debug` interrompido anteriormente **não** faz parte da evidência.

## Cobertura E2E automatizada

- Desktop: `tests/e2e/admin-new-order-notifications.spec.ts`
- Mobile (Pixel 5): `tests/e2e/mobile-admin-new-order-notifications.spec.ts`
- Helper: `tests/e2e/helpers/admin-new-order-notifications.ts`

### Cenários E2E

1. Login lifecycle — sem chrome em `/admin/login`; bootstrap após redirect client-side.
2. Bootstrap sem replay — DIRECT antigo não vira banner; novo DIRECT alerta.
3. DIRECT — banner + badge + navegação para detalhe; asserts de banco.
4. Som opt-in — desligado não incrementa contador; ligado incrementa 1 (via `data-sound-play-count` em `development`/`test`).
5. Dismiss — impede replay e não altera som.
6. COUNTER via UI de balcão — silencioso; badge PENDING pode subir.
7. Tenant isolation — DIRECT da Store B não alerta Store A.
8. Badge — dismiss não muda; badge navega para `/admin`; confirmar status reduz PENDING no próximo poll.
9. Mobile — banner/chrome utilizáveis, sem overflow horizontal, Abrir pedido / Dispensar aviso / badge tocáveis.

## Como ativar o som

1. Entre em `/admin`.
2. Marque **Ativar som de novos pedidos**.
3. Preferência local: `admin.newOrderSound = on | off`.
4. Ativar toca uma prévia; pedidos do bootstrap **não** soam.

### Instrumentação de som no E2E

O webServer Playwright usa `pnpm dev` → `NODE_ENV=development`.
Nesse modo o atributo `data-sound-play-count` está disponível e os testes assertam incremento do contador (não áudio físico). Chromium E2E usa `--autoplay-policy=no-user-gesture-required` para a promise de `Audio.play` resolver na instrumentação.

Em `production` o atributo não é renderizado — E2E **não** altera produção para forçar instrumentação.

## DIRECT alerta / COUNTER silencioso

- DIRECT (`createE2ePickupOrder` / pedido online) → banner “Novo pedido online”.
- COUNTER criado em `/admin/balcao` → sem banner / sem som; badge PENDING pode aumentar.

## Badge PENDING

- Conta pedidos `PENDING` da Store (todas as fontes).
- Não é contador de “não lidas”.
- É um link para a fila canônica `/admin`.
- `Dispensar aviso` no banner não altera o badge.
- Mudança de status (ex.: CONFIRMED) reduz no próximo poll.
- Fila live refresh: ver secção abaixo; sem filtro por origem/status nesta etapa.

## Fila — live refresh

Fonte única: `requestAdminOrdersRefresh(reason)` → bus **local por aba** (sem BroadcastChannel) → `AdminOrdersRefreshCoordinator` (debounce **250ms**, coalesce, trailing em janela in-flight modelada de **300ms**) → política por pathname → `router.refresh()`.

| Motivo | Quando |
| --- | --- |
| `new-order` | Poll delta com pedidos DIRECT novos |
| `status-updated` | `pendingCount` mudou no poll sem novos DIRECT; sucesso de status/finalize |
| `tab-visible` | Após retomar aba: emitido pelo **próximo poll** só se o poll não trouxe outro motivo (evita refresh duplicado com o polling retomado) |
| `counter-order-created` | Sucesso ao criar comanda no Balcão |

Rotas que executam `router.refresh()`:

| Path | Motivos |
| --- | --- |
| `/admin` (exato) | todos |
| `/admin/pedidos/*` | `status-updated`, `tab-visible` |
| `/admin/balcao`, cardápio, config, login, `/master` | nenhum |

Regras:

- sem segundo polling da fila; sem WebSocket/SSE; sem sync entre abas;
- política reavaliada no **flush** do debounce (navegação `/admin` → Balcão no meio do timer não refresca o Balcão);
- banner continua só para DIRECT novo; COUNTER não gera banner;
- Client state do provider (banner/badge/som) preserva-se no refresh RSC;
- indicador “Atualizando pedidos…” = **sinal de atualização solicitado**, não confirmação de RSC concluído (`router.refresh()` não expõe Promise);
- falha de rede no refresh não apaga a lista atual; próximo poll/visibility tenta de novo;
- ao criar COUNTER em `/admin/balcao`, o sinal é emitido (inofensivo) mas a política **não** refresca essa rota; `revalidatePath("/admin")` garante fila fresca ao navegar para Pedidos.

E2E: `tests/e2e/admin-orders-live-refresh.spec.ts`. Unit: `admin-orders-refresh.test.ts`.

## Mobile

Cobertura enxuta no projeto `mobile-chrome` (Pixel 5): login, banner, chrome, link e dismiss.
Sem duplicar tenant/dedupe/COUNTER. Live refresh da fila coberto no desktop; mobile reutiliza o mesmo coordenador no layout autenticado.

## Tenant isolation

Fixtures usam Stores `e2e-notify-*` e usuários `e2e-store-notify-*@example.com`.
DIRECT da Store B não aparece na sessão da Store A.

Cleanup remove **somente** Store ids rastreados pela suíte (`cleanupTrackedNotifyFixtures`), não todas as Stores `e2e-*` do banco.

## Visibility

Comportamento hidden/visible coberto por:

- testes unitários do controller;
- gate `shouldRequestRefreshOnTabVisible` + scheduler (unit);
- smoke manual A–G (cenário F).

Não há E2E Playwright de visibility nesta PR (sem hacks CDP / `document.hidden` sintético), para evitar flakiness.

## Limitações conhecidas

- Refresh da fila é coordenado (não a cada tick de poll idle).
- Múltiplas abas podem alertar o mesmo pedido; o bus de refresh é por aba (sem BroadcastChannel).
- Sem Web Push / SSE / WebSocket / Service Worker.
- Sem histórico persistente de notificações.
- Browser precisa estar aberto.

## Incidentes

Registrar durante validação real:

- horário aproximado;
- passo (bootstrap / DIRECT / som / dismiss / COUNTER);
- impacto operacional;
- se foi possível retomar;
- captura sem PII desnecessária.

## Responsável

- Validation owner: Product Engineer + Store Owner

## Decisão de produto

| Opção | Quando |
| --- | --- |
| **PROSSEGUIR** | smoke + E2E verdes e operação aceita o comportamento |
| **AJUSTAR** | fricção de UX (som, banner, polling) sem mudar o problema |
| **REPOSICIONAR** | hipótese muda (ex.: push com app fechado) |
| **INTERROMPER** | sem valor operacional observado |

Estado técnico atual: pronto para **PROSSEGUIR** para validação real.
Hipótese de produto: **ainda pendente** de observação com o dono/operador.
