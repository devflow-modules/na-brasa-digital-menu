# Admin access recovery runbook

Runbook operacional para recuperar ou conter acesso administrativo do piloto **Na Braza** (e, por analogia, outras Stores no mesmo modelo).

Relacionado: [operations.md](operations.md) · [deployment.md](deployment.md) · [product/pilot-production-readiness.md](product/pilot-production-readiness.md) (PPR-06)

```text
PPR-06
Status: DOCUMENTED
No password-reset UI in the panel (roadmap)
```

Este documento **não** autoriza feature de “esqueci minha senha”. Descreve intervenções manuais seguras com os controles já existentes.

---

## 1. Princípios

1. **Validar identidade** antes de qualquer reset, reativação ou criação de Owner.
2. **Nunca** enviar senha por WhatsApp do pedido, grupo público, e-mail em cópia ampla ou print.
3. Preferir canal seguro: ligação confirmada, reunião, ou canal privado já estabelecido com o Store Owner / MASTER.
4. Senha temporária: forte (≥ 12 caracteres), **uso único**, pedir troca assim que existir fluxo de reset no painel (hoje: roadmap — comunicar troca via nova intervenção se necessário).
5. **Registrar a intervenção** (quem pediu, quem executou, o quê, quando, resultado).
6. Preferir desativar usuário a deletar histórico.
7. Sessões JWT atuais duram **8 horas** (`ADMIN_JWT_SECRET`). Não há denylist de token; revogação prática = desativar usuário e/ou rotacionar o secret.

---

## 2. Quem pode executar

| Ação | Quem |
| --- | --- |
| Criar / ativar / desativar usuário de loja; alterar role (não MASTER) | `MASTER` via `/master/stores/[storeId]/users` |
| Recriar / resetar senha do Owner piloto Na Braza (script) | Operador de plataforma com `DATABASE_URL` de produção + env de senha |
| Bootstrap / atualizar `MASTER` via seed | Operador com `MASTER_ADMIN_*` + `DATABASE_URL` (somente bootstrap controlado) |
| Rotacionar `ADMIN_JWT_SECRET` | Quem tem acesso às Environment Variables da Vercel (Production) |

Usuários de loja **não** gerenciam outros usuários pelo `/admin`.

---

## 3. Validação de identidade (obrigatória)

Antes de resetar senha, reativar conta ou criar novo Owner, confirme **pelo menos duas** evidências:

* [ ] Solicitante é pessoa conhecida (Store Owner / contato oficial da loja / MASTER).
* [ ] Contato por canal já usado com a loja (não apenas uma mensagem nova anônima).
* [ ] Confirmação do e-mail da conta a recuperar (comparar com o cadastrado).
* [ ] Se houver dúvida: ligar para o número operacional da loja (não o WhatsApp de pedido do cliente final) e confirmar o pedido de acesso.
* [ ] Registrar no log de intervenção: “identidade validada como …”.

Se a identidade não for confirmada: **não** resetar. Oriente a loja a entrar em contato pelo canal oficial.

---

## 4. Registro de intervenção

Copie para um lugar seguro interno (não no repositório, não em issue pública):

| Campo | Valor |
| --- | --- |
| Data / hora (America/Sao_Paulo) | |
| Solicitante | |
| Executor | |
| Store / slug | |
| User afetado (e-mail, role) | |
| Ação | reset senha / reativar / desativar / criar / alterar role / rotacionar JWT |
| Identidade validada? | sim / não + método |
| Resultado | sucesso / falha |
| Senha enviada por | canal seguro (descrever tipo; **não** colar a senha aqui) |
| Rollback se necessário | |

**Proibido** neste registro: senha em texto, JWT, connection string, endereço de cliente, telefone completo de cliente.

---

## 5. Cenários

### 5.1 Store Owner esqueceu a senha

**Preferência (qualquer Store):** `MASTER` cria um **novo** usuário `STORE_OWNER` ou `MANAGER` temporário com senha forte em `/master/stores/[storeId]/users`, entrega a senha por canal seguro, e depois desativa o usuário antigo se a conta antiga estiver comprometida — **ou** mantém o e-mail antigo e usa o script abaixo só para o Owner piloto conhecido.

**Owner piloto Na Braza (e-mail oficial já no script):**

```bash
# Shell com DATABASE_URL de produção (não commitar)
# Gere senha forte localmente; não reuse senha antiga.
$env:NA_BRAZA_LUCAS_PASSWORD="cole-senha-temporaria-forte-aqui"
pnpm store:create-na-braza-owner
```

O script:

* faz upsert do usuário Owner da Store `na-brasa`;
* **substitui** o `passwordHash` (bcrypt);
* garante `isActive=true` e role `STORE_OWNER`.

Depois:

1. Entregar a senha temporária por **canal seguro**.
2. Pedir login imediato e confirmação de acesso a `/admin`.
3. Descartar a senha da memória/clipboard do operador.
4. Registrar a intervenção.

**Rollback:** se a senha foi definida por engano, executar novo reset com senha nova e comunicar o Owner; não há “desfazer hash” sem novo valor.

### 5.2 Usuário desativado por engano

1. Validar identidade / pedido.
2. `MASTER` → `/master/stores/[storeId]/users` → reativar (`isActive=true`).
3. Pedir que a pessoa faça logout/login se a sessão antiga falhar.
4. Registrar intervenção.

**Nota:** usuário inativo **não** consegue **novo** login (`isActive` é validado na autenticação). Sessões JWT já emitidas **não** são invalidadas automaticamente pela desativação — podem permanecer válidas até expirar (**até 8h**). Se o acesso indevido for crítico, **rotacionar `ADMIN_JWT_SECRET`** (seção 5.5) imediatamente.

### 5.3 Substituir o Store Owner

1. Validar identidade do novo responsável e autorização do negócio.
2. `MASTER` cria novo usuário `STORE_OWNER` (ou promove `MANAGER`) com senha temporária forte.
3. Confirmar login do novo Owner.
4. Desativar o Owner anterior (`isActive=false`).
5. Se o anterior tinha senha conhecida por terceiros: considerar rotação de `ADMIN_JWT_SECRET`.
6. Registrar intervenção (de → para).

**Rollback:** reativar o Owner anterior e desativar o novo, se a substituição foi prematura.

### 5.4 Criar novo usuário administrativo da loja

1. `MASTER` → Gerenciar usuários da Store.
2. Role adequada: `STORE_OWNER` / `MANAGER` / `OPERATOR` / `KITCHEN`.
3. Senha ≥ 8 (recomendado ≥ 12); não reexibida após criar.
4. Entregar senha por canal seguro.
5. Confirmar que o usuário **não** recebe role `MASTER` por esta tela.
6. Registrar intervenção.

### 5.5 Rotacionar `ADMIN_JWT_SECRET`

**Efeito:** todos os JWTs assinados com o secret antigo deixam de validar → **todas as sessões admin/master são invalidadas** de imediato. Usuários precisarão fazer login de novo.

Quando usar:

* suspeita de vazamento do secret;
* contenção após acesso indevido;
* saída de alguém que tinha acesso às envs da Vercel;
* rotação periódica de higiene.

Passos:

1. Gerar secret novo longo e aleatório (≥ 32 caracteres).
2. Vercel → Project → Settings → Environment Variables → Production → atualizar `ADMIN_JWT_SECRET`.
3. Redeploy Production (necessário para o runtime carregar o novo valor).
4. Validar login em `/admin/login` e `/master` com conta conhecida.
5. Avisar operadores ativos que a sessão caiu.
6. Registrar intervenção (sem colar o secret no log).
7. Remover o secret antigo de qualquer clipboard/arquivo local.

**Rollback:** restaurar o secret anterior na Vercel + redeploy **somente** se o novo secret estiver errado e o anterior ainda for considerado seguro. Se houve vazamento, **não** voltar ao secret antigo.

### 5.6 Revogação prática de sessões

| Objetivo | Ação |
| --- | --- |
| Tirar **um** usuário | `isActive=false` + pedir logout; se risco alto → rotacionar JWT |
| Tirar **todas** as sessões | Rotacionar `ADMIN_JWT_SECRET` + redeploy |
| Sessão no próprio navegador | **Sair** no chrome do admin |

Não existe endpoint de “logout global” por usuário além disso.

### 5.7 MASTER perdeu acesso

1. Se ainda existir outro caminho com `DATABASE_URL` de produção: reexecutar seed controlado com `MASTER_ADMIN_NAME` / `MASTER_ADMIN_EMAIL` / `MASTER_ADMIN_PASSWORD` **fortes** (o seed atualiza o MASTER de bootstrap — usar com cuidado).
2. Alternativa: operador com acesso ao banco atualiza `passwordHash` via procedimento interno controlado (bcrypt, nunca texto puro no banco) — preferir o seed documentado.
3. Validar login em `/admin/login` → `/master`.
4. Registrar intervenção.

---

## 6. Canais proibidos e permitidos para senha

| Proibido | Permitido (exemplos) |
| --- | --- |
| WhatsApp do pedido / grupo da loja público | Ligação + soletrar / gerenciador de senhas compartilhado da organização |
| Issue/PR/commit/screenshot | Canal privado já autenticado com o Owner |
| E-mail com cópia para vários | Entrega presencial / reunião de vídeo 1:1 |
| SMS para número não verificado | (evitar se não houver verificação) |

Nunca commitar senha em `.env` versionado. Usar env só no shell da sessão.

---

## 7. Checklist pós-intervenção

* [ ] Login testado com a conta afetada (ou confirmação do Owner).
* [ ] Contas antigas desativadas, se aplicável.
* [ ] Nenhuma senha restante em chat/clipboard do operador.
* [ ] Log de intervenção preenchido (sem segredos).
* [ ] Se JWT foi rotacionado: redeploy concluído e login MASTER/Owner ok.
* [ ] Store continua operando (`/na-brasa` e `/admin` acessíveis).

---

## 8. Fora de escopo deste runbook

* UI de “esqueci minha senha” / e-mail de reset;
* MFA;
* SSO;
* rotação automática de JWT;
* exclusão física de `User` (preferir `isActive=false`).

---

## 9. Referência rápida de comandos (piloto)

```bash
# Owner Na Braza — reset/create (produção: DATABASE_URL no shell)
$env:NA_BRAZA_LUCAS_PASSWORD="temporary-strong-password"
pnpm store:create-na-braza-owner
```

Painel:

```text
/admin/login
/master
/master/stores/[storeId]/users
```

Sessão:

```text
Cookie HttpOnly (ADMIN_SESSION_COOKIE)
JWT HS256 · expiração 8h
Secret: ADMIN_JWT_SECRET (Vercel Production)
```
