# Uptime, health checks e alertas (#108)

Observabilidade mínima da plataforma em produção: endpoint de saúde, logs estruturados, webhook opcional e probe agendado no GitHub Actions.

Documentos relacionados: [Deploy](../deployment.md) · [Testes](../testing.md) · [Operação](../operations.md)

## O que monitoramos

| Sinal | Onde | Uso |
| --- | --- | --- |
| `GET /api/health` | Vercel (App Router) | App responde + Postgres (`SELECT 1`) |
| Logs JSON | Vercel Runtime Logs | Erros e transições críticas (sem PII) |
| Webhook opcional | `MONITORING_WEBHOOK_URL` | Alerta best-effort em erros inesperados |
| GitHub Actions | `.github/workflows/production-uptime.yml` | Probe a cada ~5 min (pode atrasar) |

**Não é SLA comercial:** o cron do GitHub pode atrasar vários minutos; use como piloto mínimo até um monitor externo (UptimeRobot, Better Stack, etc.) se necessário.

## Health check

- **URL produção (padrão do workflow):** `https://na-brasa-cardapio.vercel.app/api/health`
- **Override no CI:** secret `PRODUCTION_HEALTH_URL` no repositório GitHub
- **200:** `{ "status": "ok", "db": "ok", "timestamp": "<ISO>" }`
- **503:** `{ "status": "degraded", "db": "unavailable", "timestamp": "<ISO>" }`

Sem segredos, telefone, endereço ou corpo de webhook na resposta.

### Teste local

Com `pnpm dev` e banco acessível:

```bash
curl -sS http://127.0.0.1:3000/api/health
```

E2E: `tests/e2e/health.spec.ts`.

## Logs estruturados

Módulo: `src/features/ops/ops-log.ts`.

Campos permitidos no JSON (um objeto por linha no `console.log`):

- `eventId`, `scope`, `level`, `at`, `message`
- Opcional: `orderId`, `storeId`, `code` (códigos operacionais seguros)

**Nunca** logar: telefone, nome, endereço, observações, mensagem WhatsApp, tokens, senhas, corpo de webhook iFood, stack completo em alertas.

Erros inesperados críticos usam `logOpsCriticalError` (`src/features/ops/monitoring-webhook.ts`), que também dispara o webhook quando configurado.

## Webhook de monitoramento (opcional)

Variável: `MONITORING_WEBHOOK_URL` (ver `.env.example`).

- Compatível com **Slack Incoming Webhook** (`{"text": "..."}`) ou **Discord** (`{"content": "..."}`) — detectado pela URL.
- Timeout ~2,5s; falha **não** interrompe pedidos nem admin.
- Payload contém apenas campos allowlisted do log (sem stack).

### Configurar no Vercel

1. Crie um Incoming Webhook no Slack ou Discord do time.
2. Cole a URL em **Environment Variables** → `MONITORING_WEBHOOK_URL` (Production).
3. Redeploy se necessário.
4. Dispare um erro de teste apenas em ambiente de staging, se existir — evite testar em produção com pedido real.

## GitHub Actions — Production Uptime

Workflow: `production-uptime.yml`

- `schedule: */5 * * * *` + `workflow_dispatch`
- Falha o job se HTTP ≠ 200 ou se `status` não for `ok`

### Notificações de falha do workflow

1. No GitHub: **Settings → Notifications** (conta) ou **Watch → Custom → Actions failures** no repositório.
2. Opcional: adicionar um step posterior que POST em `MONITORING_WEBHOOK_URL` via secret (fora do escopo V1; hoje a falha aparece na aba Actions).

## Caminho de alerta (runbook)

```text
Probe falha (Actions ou monitor externo)
        │
        ▼
Abrir Vercel → Deployments / Logs (Runtime)
        │
        ├── /api/health 503 → Neon status, DATABASE_URL, conexões
        ├── 5xx em pedidos → buscar scope checkout.* / admin.* nos logs JSON
        └── ifood-poller → scope ifood-poller (projection_failed / event_processing_failed)
        │
        ▼
Mitigar (escolher conforme causa)
        ├── Banco: restaurar Neon / corrigir env / aguardar incidente provedor
        ├── App: rollback deploy anterior na Vercel (Deployments → … → Promote)
        └── iFood: credenciais test app, poller manual `pnpm ifood:poll -- --once`
        │
        ▼
Revalidar: curl health 200 + smoke pedido piloto (checklist produção)
```

## Rollback rápido (Vercel)

1. **Deployments** → último deploy estável → **Promote to Production**.
2. Confirmar `GET /api/health` 200.
3. Registrar incidente (data, causa provável, ação) — nota interna; sem PII.

## Triage por scope (logs)

| scope | Significado usual |
| --- | --- |
| `checkout.create-order` | Falha inesperada ao criar pedido online |
| `counter.create-order` / `counter.finalize-order` | Balcão |
| `admin.order-status` | Falha ao mudar status; sucesso `info` com `code` = novo status |
| `admin.ifood-order-action` | Ação manual iFood no admin |
| `ifood-poller` | Ciclo de polling / projeção |

## Limitações conhecidas (piloto)

- Sem APM/tracing distribuído.
- Webhook só em erros críticos explícitos, não em toda falha de negócio esperada (validação, permissão).
- Uptime via GitHub schedule não substitui monitor com SLA.
