# Na Braza — Pilot Data

## Status

Dados recebidos via Forms, prints do iFood e confirmações diretas do cliente.

Status geral:

- Store data: applied via seed + `pnpm store:apply-na-braza-settings`
- Menu data: ready to apply via PR `content(menu): apply Na Braza pilot menu` and `pnpm menu:apply-na-braza-pilot`
- Admin users: partially ready
- Production menu: pending manual `pnpm menu:apply-na-braza-pilot` after merge (when applicable)

## Implementation tracking

| Area | Status |
| --- | --- |
| Store settings (code/seed/script) | Merged — apply in production with `pnpm store:apply-na-braza-settings` if needed |
| Store settings (production DB) | Apply manually when not yet run |
| Pilot menu (code/seed/script) | In PR `content(menu): apply Na Braza pilot menu` |
| Pilot menu (production DB) | Pending `pnpm menu:apply-na-braza-pilot` after merge |
| Lucas `STORE_OWNER` | Pending separate PR |

## Sources

- Google Forms response
- iFood listing/screenshots
- Follow-up confirmations from the client

## Confirmed decisions

- Official store name: `Na Braza`
- Store slug remains technical: `na-brasa`
- Public route remains: `/na-brasa`
- Burger direct menu price: `R$ 25,00`
- Burger name: `Pão Carne Queijo`
- Burger model: base product is PCQ; customer adds optional addons
- Beer/alcoholic beverages: included
- Alcoholic beverages must show: `Produto permitido apenas para maiores de 18 anos.`
- Pickup: enabled
- Delivery: enabled
- Base delivery fee for pilot: `R$ 6,00`
- Delivery fee note: R$ 6,00 is the minimum fee for deliveries up to 2 km
- Minimum delivery order: `R$ 30,00`
- Payment methods: Pix, cash, debit card, credit card
- Test order before go-live: approved

## Store data

| Field | Value | Status |
| --- | --- | --- |
| Store name | Na Braza | confirmed |
| WhatsApp orders | 13981091971 | confirmed |
| Address | Barão de Ramalho, 155 — Macuco — Santos/SP | received |
| City/neighborhood | Santos/SP — Macuco | received |
| Opening days | Monday to Sunday | received |
| Opening hours | 17:30–00:00 | received |
| Holiday operation | Works normally | received |
| Weather note | Does not open on heavy rain days | received |
| Pickup | enabled | confirmed |
| Delivery | enabled | confirmed |
| Delivery areas | Santos; São Vicente depending on order | received |
| Base delivery fee | R$ 6,00 | confirmed as minimum up to 2 km |
| Minimum delivery order | R$ 30,00 | confirmed |
| Prep time | 15 to 40 minutes | received |
| Delivery time | 10 to 30 minutes after order is ready, depending on location | received |

The current system supports a single base delivery fee. Neighborhood/km-based delivery pricing is out of scope for the current pilot. Use R$ 6,00 as the base pilot fee and handle distance adjustments manually over WhatsApp if needed.

## Payment data

| Payment method | Status |
| --- | --- |
| Pix | accepted |
| Cash | accepted |
| Debit card | accepted |
| Credit card | accepted |

Additional notes:

- Payment on delivery: yes
- Pix antecipado: yes
- Customer should inform change for cash
- No card surcharge
- Pix key was received in Forms, but should not be exposed in public docs

## Menu structure

Pilot categories:

1. Lanches artesanais
2. Espetinhos na Brasa
3. Bebidas
4. Cervejas

## Products

### Lanches artesanais

| Product | Description | Price | Status |
| --- | --- | ---: | --- |
| Pão Carne Queijo | Hambúrguer artesanal 160g com pão, carne e queijo. Personalize com adicionais. | R$ 25,00 | confirmed |

### Burger addons

| Addon | Price | Status |
| --- | ---: | --- |
| Bacon extra | R$ 5,00 | confirmed |
| Salada | R$ 5,00 | confirmed |
| Queijo extra | R$ 3,00 | confirmed |
| Hambúrguer extra | R$ 15,00 | confirmed |

Addon linkage:

- Link all addons only to `Pão Carne Queijo`.

Operational note:

The base product is Pão Carne Queijo. The customer adds optional extras; the product should not be modeled as multiple fixed variations in this pilot.

### Espetinhos na Brasa

| Product | Price | Status |
| --- | ---: | --- |
| Espetinho de Carne | R$ 13,00 | confirmed |
| Espetinho de Linguiça | R$ 13,00 | confirmed |
| Espetinho de Coração | R$ 13,00 | confirmed |
| Espetinho Misto Carne com Frango | R$ 13,00 | assumed from same-price category; validate if needed |

### Bebidas

| Product | Description | Price | Status |
| --- | --- | ---: | --- |
| Coca-Cola 350ml | Lata 350ml | R$ 7,00 | confirmed |
| Guaraná Antarctica 350ml | Lata 350ml | R$ 7,00 | confirmed |
| Coca-Cola 600ml | Garrafa 600ml | R$ 10,00 | confirmed |
| Coca-Cola 2L | Garrafa 2L | R$ 16,90 | confirmed |
| Guaraná Antarctica 1L | Garrafa 1L | R$ 10,90 | confirmed |
| Guaraná Antarctica 2L | Garrafa 2L | R$ 16,90 | confirmed |
| Água mineral sem gás 500ml | Garrafa 500ml | R$ 5,00 | confirmed |

### Cervejas

| Product | Description | Price | Status |
| --- | --- | ---: | --- |
| Budweiser Long Neck 330ml | Produto permitido apenas para maiores de 18 anos. | R$ 10,00 | confirmed |
| Heineken Long Neck 330ml | Produto permitido apenas para maiores de 18 anos. | R$ 10,00 | confirmed |
| Stella Artois 330ml | Produto permitido apenas para maiores de 18 anos. | R$ 10,00 | confirmed |
| Stella Artois Sem Glúten 330ml | Produto permitido apenas para maiores de 18 anos. | R$ 12,00 | confirmed |
| Corona Long Neck 330ml | Produto permitido apenas para maiores de 18 anos. | R$ 11,00 | confirmed |

## Admin users

### Lucas Araújo

- Name: Lucas Araújo
- Email: theluksvm@gmail.com
- WhatsApp: 13981091971
- Role intent: Sócio / owner
- Recommended role: `STORE_OWNER`

### Renan

- Name: Renan
- Email: pending
- WhatsApp: pending
- Role intent: Sócio / owner
- Recommended role after receiving data: `STORE_OWNER`

## Permission notes

Client indicated:

- Renan and Lucas can manage users
- Renan and Lucas can edit menu
- Renan and Lucas can change order status
- Renan and Lucas can cancel orders
- Needed access types: Dono / Administrador, Gerente

Initial implementation recommendation:

- Lucas: `STORE_OWNER`
- Renan: `STORE_OWNER` after data confirmation
- No kitchen/operator user until requested

## Visual identity

Received:

- Colors: black and red
- Slogan: pending
- Logo: no
- Own photos: no

Decision:

Keep current dark/brasa UI from ADR 0003. Do not implement custom theme in this pilot.

## iFood positioning

Received:

- Store is active on iFood
- Direct menu prices may differ from iFood
- Button “Ver no iFood”: still pending / client marked “Ainda vamos definir”

Decision:

Do not add iFood secondary CTA unless confirmed.

## Pending confirmations

- Renan email and WhatsApp
- Exact delivery fee table by km/neighborhood
- Whether `Espetinho Misto Carne com Frango` is also R$ 13,00 or has another price
- Whether to display iFood button
- Final slogan, if any
- Whether to add a general alcohol warning beyond product descriptions

## Safe to apply now

- Store name: Na Braza
- WhatsApp: 13981091971
- Address
- Opening hours
- Pickup enabled
- Delivery enabled
- Base delivery fee R$ 6,00 for pilot
- Payment methods
- Lucas admin user as STORE_OWNER
- Pilot menu categories/products/addons
- Beer products with +18 descriptions

## Do not apply yet

- Renan user access
- iFood CTA
- Delivery fee by km/neighborhood
- Advanced age verification flow
- Full custom visual theme

## Proposed next steps

1. Apply store settings in production.
2. Create Lucas admin access.
3. Apply pilot menu.
4. Run internal smoke order with official WhatsApp.
5. Client validates on mobile.
6. Adjust any product name/price if needed.
7. Approve go-live.
