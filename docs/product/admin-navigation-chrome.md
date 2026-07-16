# Admin navigation chrome (role-aware)

Shared authenticated shell for `/admin` tenant routes. **UI visibility ≠ authorization.**

## Status

```txt
Role-aware admin chrome complete
Shared admin navigation complete
Local navigation duplication reduced
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

| Role | Pedidos | Balcão | Cardápio | Configurações |
| --- | --- | --- | --- | --- |
| `STORE_OWNER` / `MANAGER` / `MASTER` (transitional `/admin`) | sim | sim | sim | sim |
| `OPERATOR` | sim | sim | sim (`Ver cardápio`) | sim |
| `KITCHEN` | sim | não | não | não |

Derived from operational permissions (`orders.read`, `orders.create`, manage/toggle menu, manage settings).

### KITCHEN

- Não vê **Cardápio** nem **Configurações** no chrome.
- Acesso direto read-only a essas rotas **continua permitido** pelo modelo atual (`menu.read` / `store.settings.read`).
- Mutações permanecem bloqueadas por autorização real no server (não apenas por UI).
- Não afirmar que KITCHEN “não pode acessar” essas URLs.

### MASTER (transicional em `/admin`)

- Em `/admin`, MASTER usa a **Store piloto** resolvida por `NEXT_PUBLIC_STORE_SLUG` (fallback piloto `na-brasa`).
- A Store é **validada no banco**; sem Store válida não há chrome tenant.
- **Não existe seleção interativa de Store** nesta entrega.
- O fluxo é **transicional** e permanece no backlog — não é multi-tenant completo.
- `/master` permanece painel de plataforma separado, fora do chrome de tenant.

There is no `ATTENDANT` / `ADMIN` role in the schema.

## Active route

- Pathname normalizado (trailing slash removido) antes da comparação.
- Pedidos: exact `/admin` ou `/admin/pedidos/*` (não outros `/admin/*`)
- Balcão / Cardápio / Configurações: exact ou prefixo com fronteira de segmento (`href/`)
- Prefixo controlado: qualquer filho sob `/admin/cardapio/` ativa Cardápio (inclui rotas hipotéticas como `/admin/cardapio/adicionais-extra`)

## Out of scope

Backend auth changes, new roles/permissions, polling/notification changes, MASTER landing/store picker, full page redesign.
