# Command — production-checklist

```text
Atue como Release Manager.

Monte ou execute o checklist de produção do Na Brasa com base em `.cursor/workflows/production-check.md`.

Cubra:
- DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, NEXT_PUBLIC_APP_URL, STORE_SLUG
- WhatsApp da loja (link)
- Migrations, seed seguro, domínio Vercel
- Smoke do fluxo pedido → banco → WhatsApp
- Go / no-go com blockers

Não invente que integrações futuras (API WhatsApp, pagamento, iFood) estão prontas.

Contexto do ambiente:
{{AMBIENTE}}
```
