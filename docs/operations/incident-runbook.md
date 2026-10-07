# Runbook de incidentes (piloto)

Matriz operacional para o piloto **Na Braza**: detectar → classificar → mitigar → comunicar → registrar.

Parte do epic Production Readiness (PPR-13). Detalhes por domínio:

| Domínio | Documento |
| --- | --- |
| Health / logs / webhook | [uptime-and-alerts.md](uptime-and-alerts.md) |
| Banco / PITR / restore | [database-backup-and-restore.md](database-backup-and-restore.md) |
| Acesso admin | [admin-access-recovery.md](../admin-access-recovery.md) |
| Deploy / rollback app | [deployment.md](../deployment.md) |
| Dia a dia loja | [operations.md](../operations.md) |
| Smoke / GO-NOGO | [production-checklist.md](../production-checklist.md) |

---

## Ownership

| Papel | Quem | Escopo |
| --- | --- | --- |
| Primary | Platform owner (piloto: Gustavo) | Vercel, Neon, GitHub, envs, restore, rollback |
| Secondary | Outro admin do projeto | Cobrir se primary indisponível |
| Store ops (Na Braza) | Dono / operadores | Abrir/fechar loja, fila, cardápio; **não** altera `DATABASE_URL` nem restore |

---

## Severidade

| Nível | Exemplos | Meta de resposta (piloto) |
| --- | --- | --- |
| **SEV-1** | Checkout Online fora; `/api/health` 503; banco inacessível; login admin impossível para todos | &lt; 15 min para começar mitigação |
| **SEV-2** | Balcão ou admin degradado; WhatsApp número errado; taxa/cardápio incorreto em produção | &lt; 60 min |
| **SEV-3** | Visual, copy, filtro, lentidão sem perda de pedido | Próximo horário comercial |

---

## Como o incidente chega

```text
Production Uptime (Actions) falha
        ou
MONITORING_WEBHOOK_URL (se configurado)
        ou
Operador / cliente reporta
        │
        ▼
Abrir esta matriz + Runtime Logs Vercel
```

---

## Matriz incidente → mitigação

| Sintoma | Provável causa | Mitigação | Comunicar |
| --- | --- | --- | --- |
| `/api/health` ≠ 200 ou `db` unavailable | Neon down / `DATABASE_URL` / conexões | Status Neon; envs Vercel; [backup-and-restore](database-backup-and-restore.md) só se perda/corrupção | Store ops: “sistema em recuperação” |
| Site 5xx / deploy ruim | Release com regressão | Vercel → Promote deployment anterior; **não** resetar banco | Store ops: link pode falhar até rollback |
| Checkout falha; pedido não cria | App / validação / loja fechada / taxa | Logs `checkout.create-order`; conferir `isOpen` e modalidades; rollback se regressão de código | Cliente: tentar de novo ou pedido por WhatsApp direto |
| Login admin falha para um usuário | Senha / `isActive` / role | [admin-access-recovery](../admin-access-recovery.md) | Só o afetado, canal seguro |
| Login admin falha para todos | `ADMIN_JWT_SECRET` / cookie / outage | Envs Vercel; sessão; health | Store ops |
| Número WhatsApp errado no `wa.me` | `Store.whatsapp` | Corrigir em `/admin/configuracoes` (MANAGER/Owner) | Store ops |
| Pedidos “sumiram” / dados errados | Branch errada / restore / bug | **Não** migrate reset; validar projeto Neon; restore só com decisão explícita | Platform + Store ops |
| Abuso / flood login ou pedidos | Rate limit (#107) ou ataque | Limites in-memory já ativos; se insuficiente, DEFER Redis / WAF | Interno |
| Actions uptime falha mas site ok | Flake de cron / rede | Re-rodar workflow; confirmar health manual | Interno |

---

## Comunicação (mínima)

1. **Store ops:** uma frase do estado (“checkout instável — use WhatsApp direto se necessário”).
2. **Primary:** registra horário UTC, sintoma, ação, resultado (nota interna; sem PII de clientes).
3. Após mitigação: smoke mínimo — `GET /api/health` 200 + abrir `/na-brasa` + (se SEV-1) um pedido teste fictício e cancelar.

Não postar connection strings, tokens ou dumps em grupos.

---

## Pós-incidente

- [ ] Causa provável anotada
- [ ] Mitigação documentada (mesmo que informal)
- [ ] Pedido/smoke de teste cancelado / limpo se criado
- [ ] Abrir issue se precisar de fix permanente
- [ ] Reavaliar PPR-02/03 se o alerta não chegou a tempo

---

## Fora deste runbook

- SLA comercial / monitor pago (DEFER)
- WhatsApp Business API / pagamento online
- Homologação iFood oficial (P3)
