# ADR 0003 — UI/UX Direction for Pilot

> **Nota de contexto — 2026:** Na Braza é o **cliente 1** e primeira implantação real. A direção UX abaixo é **específica do piloto** (identidade Na Braza), não da plataforma white-label neutra. Referências a *Na Brasa Digital Menu* ou **DevFlow Menu** no cabeçalho refletem nomenclatura histórica da decisão.

- **Status:** Accepted
- **Date:** 2026-07-14
- **Product:** Na Brasa Digital Menu (first tenant of DevFlow Menu)

## Context

**Na Braza** is the first real client/tenant of **DevFlow Menu**, a white-label online menu and WhatsApp order platform. The product must work for end customers on mobile phones and for store staff in a real operational environment.

The experience must be **simple, fast, and trustworthy**. The pilot goal is **operational validation**, not a final brand identity or a full visual redesign.

The application is approaching **v0.1.0-pilot** with production deploy, E2E coverage, and authenticated smoke on Store Settings. The customer will still supply final real-world content (menu copy, address, hours, WhatsApp, etc.), but **UI/UX direction must be documented now** so future visual work stays consistent and does not block pilot acceptance.

Current UI uses a **dark, warm “brasa” aesthetic** (stone/graphite backgrounds, orange ember accents), aligned with artisan burgers and grilled skewers—not a generic marketplace look.

Because final content is pending, the UI must remain **flexible for content changes** (text, fees, flags) without requiring a large visual refactor.

Existing surfaces:

- Public: `/na-brasa`, cart, `/na-brasa/checkout`, WhatsApp handoff
- Store admin: `/admin`, `/admin/pedidos/[id]`, `/admin/cardapio`, `/admin/cardapio/adicionais`, `/admin/configuracoes`
- Platform: `/master`, role-based permissions

## Decision

### 1. Mobile-first

- The public menu is designed **phone-first**.
- Desktop is acceptable but **not** the primary visual target.
- Primary CTAs must be **thumb-reachable** (cart bar, checkout, add to cart).
- Cart and checkout stay **short**—no unnecessary steps.

### 2. Visual identity

Direction:

- Dark graphite/stone/black backgrounds
- Orange/ember for primary CTAs and highlights
- High contrast; rounded corners
- Warm, simple, direct—**artisan food**, not generic SaaS marketplace

Conceptual palette (implemented via Tailwind utility classes, not a formal token doc yet):

- Background: stone/graphite/black
- CTA: orange/ember
- Accent: amber/red where needed for warnings (e.g. closed store)
- Primary text: off-white / stone-100

No requirement to document exact hex in this ADR; follow existing Tailwind usage in the codebase.

### 3. Public customer experience

Priorities:

- Immediately understand this is **Na Braza’s** menu
- See whether the store is **open or closed**
- See **address** and **opening hours** when configured
- Browse **categories** and featured items
- Recognize **unavailable** products
- Add items to cart and **choose addons**
- Complete the order via **WhatsApp**

Rules (must stay aligned with server behavior):

| Rule | UX |
| --- | --- |
| `Product.active = false` | Hidden from public menu |
| `Product.available = false` | Shown as unavailable; cannot order |
| Inactive or unlinked addon | Not offered in add-to-cart |
| `Store.isOpen = false` | Menu visible; **Online/DIRECT checkout blocked**; COUNTER may continue for authorized users |

### 4. Checkout UX

- Collect **only necessary** fields (customer, delivery type, address when delivery, payment, notes).
- Errors must be **friendly and actionable**—no technical jargon for the customer.
- Invalid states are **blocked on the server** (not only in the UI):
  - store closed
  - delivery disabled
  - pickup disabled
  - unavailable product
  - invalid addon

### 5. Admin UX

`/admin` prioritizes **operation** over decorative UI.

Principles:

- Simple screens, obvious actions, clear labels
- Show actions **by permission**; hide what the role cannot do
- Avoid visual clutter
- Each role sees only what they need

By role (summary):

| Role | Focus |
| --- | --- |
| `STORE_OWNER` / `MANAGER` | Full store operation: orders, menu, addons, structural settings |
| `OPERATOR` | Orders, product availability, open/close store |
| `KITCHEN` | Read-oriented operational view; prepare/ready where permitted |
| `MASTER` | Transitional `/admin` access; primary platform work in `/master` |

### 6. Status and feedback

States must be **visually and textually clear**:

- Store: open / closed
- Product: published (`active`) vs hidden; available vs unavailable
- Order: pending → confirmed → preparing → ready → (out for delivery) → completed / cancelled

Important admin mutations should provide:

- Success or error feedback
- Coherent visual state after refresh
- Server-side validation as source of truth

### 7. Accessibility baseline

Pilot baseline (not full WCAG AA certification):

- High contrast (dark UI + light text + strong CTA)
- Labels on form fields
- Buttons with clear text (not icon-only for critical actions)
- Keyboard focus where practical
- Do not rely on color alone for status (pair with text/badge)
- `data-testid` attributes for E2E may coexist without changing user-facing copy

Full accessibility audit and formal compliance are **post-pilot**.

### 8. Content strategy

- **Brazilian Portuguese**, direct tone
- No technical jargon on the public side
- Admin copy may use simple operational terms
- Error messages should suggest what to do next

Examples (canonical):

- `Produto indisponível no momento.`
- `A loja está fechada no momento.`
- `Entrega indisponível no momento.`
- `Retirada indisponível no momento.`

### 9. Pilot boundaries

**Out of scope** for the pilot (roadmap later):

- Full visual redesign
- Per-client theme engine / white-label theming
- Logo/banner upload in admin
- Advanced PWA
- Realtime notifications
- Heavy animations
- Marketplace-style catalog layout
- Formal design system package
- Multi-brand theming

### 10. Design consistency

- Reuse existing components and patterns before inventing new ones
- Keep visual language aligned across:
  - `/na-brasa` (customer)
  - `/admin` (store)
  - `/master` (platform)

Admin/master may stay slightly more utilitarian than the public menu; they should still feel like the same product family (dark base, orange accents).

## Consequences

### Positive

- Reduces subjective debates in future UI tasks
- Improves pilot consistency
- Eases later white-label evolution with documented defaults
- Avoids visual overengineering before customer validation
- Keeps focus on real operation (orders, menu, settings)

### Trade-offs

- Limited visual customization during the pilot
- Identity is still **Na Braza–specific**, not neutral platform chrome
- Advanced accessibility and design tokens deferred
- Admin favors clarity over polish

## Alternatives considered

### A. Full redesign before pilot

**Rejected** — delays real customer validation and increases delivery risk.

### B. Formal design system now

**Rejected** — scope and operations are still being validated.

### C. Configurable white-label theme in the pilot

**Rejected** — not enough active tenants to justify complexity.

### D. Neutral generic SaaS aesthetic

**Rejected** — Na Braza needs a warm, food-forward identity.

## Follow-ups

- Final screenshots for README / case study after client content is live
- Small visual tweaks from owner feedback (spacing, copy, badges)
- Real-device review with the store owner
- Future ADR: white-label theming strategy
- Future doc: design tokens (if Tailwind theme is formalized)
- Future: accessibility audit when post-pilot budget allows

## References

- [README.md](../../README.md)
- [docs/product.md](../product.md)
- [docs/operations.md](../operations.md)
- [docs/releases/v0.1.0-pilot.md](../releases/v0.1.0-pilot.md)
- [docs/production-checklist.md](../production-checklist.md)
- [ADR 0002 — Database-backed multi-admin and master panel](./0002-database-backed-multi-admin-and-master-panel.md)
