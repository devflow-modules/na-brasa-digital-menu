# Admin navigation chrome (role-aware)

Shared authenticated shell for `/admin` tenant routes. **UI visibility ≠ authorization.**

## Status

```txt
Role-aware admin chrome complete
Shared admin navigation complete
Local navigation duplication reduced
Explicit admin access-denied UX complete
Tenant resource concealment preserved
MASTER login landing → /master
Store-user login landing → /admin
MASTER no longer receives implicit pilot Store context
Direct MASTER access to /admin redirects to /master
Tenant Store selection not implemented
Backend authorization unchanged
Navigation audit backlog in progress
```


## Architecture

```txt
app/admin/layout.tsx                    → notifications provider (login included)
app/admin/login                         → no chrome
app/admin/(store)/layout.tsx            → requireAdminStoreContext + AdminChrome
AdminChrome
├── store identity + role + logout
├── AdminNavigationLinks (client, usePathname)
└── page content
```

- Single nav source: `src/features/admin/chrome/admin-navigation.ts`
- Desktop and mobile consume the same items (horizontal scroll on narrow viewports; thin scrollbar kept as overflow affordance)
- PENDING badge stays in the notifications provider (not duplicated in chrome)
- `/master` stays outside tenant chrome

## Chrome visibility matrix (links)

| Role | Pedidos | Balcão | Relatórios | Cardápio | Configurações |
| --- | --- | --- | --- | --- | --- |
| `STORE_OWNER` / `MANAGER` | sim | sim | sim | sim | sim |
| `OPERATOR` | sim | sim | não | sim (`Ver cardápio`) | sim |
| `KITCHEN` | sim | não | não | não | não |

Derived from operational permissions (`orders.read`, `orders.create`, `reports.read`, manage/toggle menu, manage settings).

### KITCHEN

- Não vê **Cardápio** nem **Configurações** no chrome.
- Acesso direto read-only a essas rotas **continua permitido** pelo modelo atual (`menu.read` / `store.settings.read`).
- Mutações permanecem bloqueadas por autorização real no server (não apenas por UI).
- Não afirmar que KITCHEN “não pode acessar” essas URLs.

### MASTER landing

- Login `MASTER` → **`/master`** (nunca entra automaticamente em uma Store).
- Acesso direto a `/admin` (e rotas tenant) **redireciona para `/master`**.
- Sem Store picker, Store switcher ou contexto tenant implícito (`NEXT_PUBLIC_STORE_SLUG` / `"na-brasa"` não resolvem mais o admin do MASTER).
- Acesso tenant por MASTER exige fluxo futuro explícito de seleção.
- `/master` permanece painel de plataforma separado, fora do chrome de tenant.

There is no `ATTENDANT` / `ADMIN` role in the schema.


## Active route

- Pathname normalizado (trailing slash removido) antes da comparação.
- Pedidos: exact `/admin` ou `/admin/pedidos/*` (não outros `/admin/*`)
- Balcão / Cardápio / Configurações: exact ou prefixo com fronteira de segmento (`href/`)
- Prefixo controlado: qualquer filho sob `/admin/cardapio/` ativa Cardápio (inclui rotas hipotéticas como `/admin/cardapio/adicionais-extra`)

## Access-denied UX (safe cases only)

When an authenticated Store user with **valid Store context** opens an operational route blocked by page-level permission (example: KITCHEN → `/admin/balcao`), the page renders `AdminAccessDenied` **inside** the chrome:

- Title: `Acesso não permitido`
- Body: `Seu perfil não possui acesso a esta área.`
- Primary action: first permitted chrome destination (`getAdminSafeDestination`) — usually `Voltar para Pedidos`

`notFound()` remains for:

- missing resources (order id, settings row);
- cross-tenant concealment (order of another Store);
- invalid Store context after session exists (Store roles);
- non-MASTER hitting `/master`.

MASTER without Store context redirects to `/master` (not `notFound()`, not access-denied).

Session missing still redirects to `/admin/login` (not the access-denied page).

Next.js `forbidden()` / `forbidden.tsx` exist in 15.5.x but require `experimental.authInterrupts` — **not enabled** in this project; local render is used instead.

## Out of scope

Backend auth changes, new roles/permissions, polling/notification changes, Store picker/switcher, full page redesign, enabling experimental auth interrupts.
