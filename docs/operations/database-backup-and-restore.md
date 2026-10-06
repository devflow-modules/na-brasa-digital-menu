# Backup, PITR e restore (Neon)

Runbook de proteção e recuperação de dados do piloto **Na Braza** (Postgres em **Neon**).

Parte do epic Production Readiness ([pilot-production-readiness.md](../product/pilot-production-readiness.md) — PPR-04 / PPR-05) e da issue [#109](https://github.com/devflow-modules/na-brasa-digital-menu/issues/109).

Documentos relacionados: [Deploy](../deployment.md) · [Operação](../operations.md) · [Uptime](uptime-and-alerts.md) · [Database](../database.md)

---

## Status operacional

| Controle | Status | Evidência |
| --- | --- | --- |
| Provedor do banco de produção | **CONFIRMED** | Host `*.aws.neon.tech` (Neon, região `sa-east-1`) |
| PITR / history window | **PENDING HUMAN** | Confirmar no Console Neon → Project → Settings → **History retention** / Instant restore |
| Retenção (dias) | **PENDING HUMAN** | Anotar o valor do plano (Free típico: ~1 dia; Paid: até ~7 dias — ver [Neon history window](https://neon.com/docs/introduction/branching#history-retention)) |
| Restore drill | **PENDING** | Rodar seção [Drill de restore](#drill-de-restore-obrigatório-para-fechar-109) e preencher o registro |
| Responsável em incidente | **DEFINED** | Ver [Ownership](#ownership) |

Não marcar PITR/retenção/restore como `CONFIRMED` no checklist PPR sem evidência humana (screenshot/data no Console ou saída do drill).

---

## Ownership

| Papel | Quem | Responsabilidade |
| --- | --- | --- |
| Primary | Store platform owner / admin Neon do projeto (piloto: Gustavo) | Confirmar PITR; executar restore; atualizar envs Vercel se apontar connection string |
| Secondary | Outro admin Neon/GitHub do projeto | Cobrir se primary indisponível |
| Store ops (Na Braza) | Não opera restore | Comunica incidente; não altera `DATABASE_URL` |

Em incidente de perda/corrupção de dados: **primary** executa o restore; documenta horário e branch usada; avisa se o app ficou em modo degradado.

---

## Expectativas RPO / RTO (piloto)

Valores **operacionais do piloto**, não SLA comercial:

| Métrica | Expectativa piloto | Nota |
| --- | --- | --- |
| **RPO** | Até o limite da **history window** do projeto Neon | Perda máxima ≈ janela de PITR (ex.: 24h no Free). Fora da janela, sem restore instantâneo |
| **RTO** | Meta: menos de **60 min** para restore não destrutivo via **branch temporária** + validação; promote para produção só com decisão explícita | Depende de Console/API e troca cuidadosa de `DATABASE_URL` na Vercel |

Rollback de **aplicação** (redeploy Vercel) **não** restaura dados. Ver [deployment.md](../deployment.md) — preservar o banco.

---

## O que NÃO fazer

- `prisma migrate reset` / drop em produção
- Restore in-place da branch `main`/produção sem `--preserve-under-name` / backup branch
- Apontar E2E CI para Neon de produção
- Expor connection strings, tokens ou dumps em issues/PRs/logs

---

## Confirmar PITR no Console (PPR-04)

1. Abrir [Neon Console](https://console.neon.tech) → projeto do piloto Na Braza.
2. Confirmar que o endpoint de produção corresponde ao host usado pela Vercel (`DATABASE_URL` de Production).
3. Em **Settings** (ou Storage / History), anotar:
   - Instant restore / PITR: enabled
   - History retention: **N dias**
4. Preencher a tabela em [pilot-production-readiness.md](../product/pilot-production-readiness.md) §6 e a tabela [Status operacional](#status-operacional) deste doc (data + responsável).

Até este passo, PPR-05 permanece bloqueado para fechamento formal da #109.

---

## Drill de restore (obrigatório para fechar #109)

Objetivo: provar que dá para ler um estado passado **sem** destruir produção.

### Princípio

```text
Criar branch temporária a partir de um timestamp passado (PITR)
→ conectar só nessa branch
→ validar SELECT mínimos
→ apagar a branch de drill
→ NÃO trocar DATABASE_URL de produção neste drill
```

### Pré-requisitos

- Acesso admin ao projeto Neon
- `NEON_API_KEY` (API key do Console) e `NEON_PROJECT_ID` **somente em shell local** — nunca commitados
- Janela de history cobrindo o timestamp escolhido

### Opção A — Console (preferida para o primeiro drill)

1. Neon Console → projeto → **Branches**.
2. **Create branch** a partir da branch de produção (root), escolhendo **Point in time** (ex.: 1–2 horas atrás, dentro da retention).
3. Nome sugerido: `restore-drill-YYYYMMDD-HHMM` (UTC).
4. Copiar a connection string **somente** dessa branch de drill.
5. Validar sem logar a URL:

- **Preferido (API):** com `NEON_API_KEY`, `NEON_PROJECT_ID` e `NEON_PARENT_BRANCH_ID` no shell → `pnpm neon:restore-drill` (cria branch, `SELECT 1`, apaga branch).
- **Console:** conectar só à branch de drill e rodar `SELECT 1` (ou contagens em `Store` / `Order` via `psql`) — sem dump de PII.

6. Registrar resultado na [tabela de registro](#registro-do-drill).
7. **Delete** a branch `restore-drill-*` no Console.

### Opção B — API / CLI

Criar branch com timestamp pai (não altera produção):

```bash
# Exige NEON_API_KEY e IDs do projeto/branch pai — não commitar.
curl --request POST \
  --url "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches" \
  --header "Accept: application/json" \
  --header "Authorization: Bearer ${NEON_API_KEY}" \
  --header "Content-Type: application/json" \
  --data "{
    \"branch\": {
      \"name\": \"restore-drill-$(date -u +%Y%m%d-%H%M)\",
      \"parent_id\": \"${NEON_PARENT_BRANCH_ID}\",
      \"parent_timestamp\": \"$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%SZ)\"
    }
  }"
```

CLI (quando `neonctl` autenticado):

```bash
neonctl branches create \
  --project-id "$NEON_PROJECT_ID" \
  --name "restore-drill-$(date -u +%Y%m%d-%H%M)" \
  --parent "$NEON_PARENT_BRANCH_ID" \
  --timestamp "$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%SZ)"
```

Depois: obter connection string da branch → `SELECT 1` → deletar branch.

Script auxiliar (requer envs): `pnpm exec tsx scripts/neon-restore-drill.ts` (falha seguro se credenciais ausentes).

### Restore real de emergência (produção)

Só com decisão explícita do primary:

1. Preferir criar branch restaurada e **validar** antes de qualquer cutover.
2. Se for inevitável resetar a branch de produção no tempo: usar restore com preservação da tip anterior (`neon branches restore … --preserve-under-name …`) — **nunca** sem backup branch.
3. Atualizar `DATABASE_URL` na Vercel Production somente após smoke mínimo (`/api/health`, login admin, um pedido teste fictício).
4. Registrar incidente: horário UTC, timestamp de restore, quem executou, branches criadas/deletadas.

---

## Registro do drill

Preencher após a primeira execução bem-sucedida:

| Campo | Valor |
| --- | --- |
| Data (UTC) | |
| Executado por | |
| Projeto Neon (nome, sem secrets) | |
| History retention confirmada | _N dias_ |
| Timestamp de origem do restore | |
| Nome da branch de drill | |
| Validação | `SELECT 1` ok / contagens ok |
| Branch de drill removida | sim / não |
| Produção alterada | **não** (drill) / sim (emergência — detalhar) |

Quando esta tabela estiver preenchida e PITR confirmado no Console, atualizar PPR-04/PPR-05 e fechar [#109](https://github.com/devflow-modules/na-brasa-digital-menu/issues/109).

---

## Relação com rollback de app

| Camada | Ferramenta | Restaura dados? |
| --- | --- | --- |
| App (Next.js) | Redeploy / Promote na Vercel | Não |
| Schema | Migrations Prisma forward-only | Não “volta” dados |
| Dados | Neon PITR / branch restore | Sim, dentro da history window |
