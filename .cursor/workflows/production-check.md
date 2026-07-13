# Workflow — Production check

Verificação pré-produção do Na Brasa.

## Variáveis

- [ ] `DATABASE_URL` (Neon/Supabase/Postgres) apontando para o banco certo
- [ ] `ADMIN_EMAIL`
- [ ] `ADMIN_PASSWORD` (forte; nunca commitada; hash quando auth existir)
- [ ] `NEXT_PUBLIC_APP_URL` (domínio real https)
- [ ] `NEXT_PUBLIC_STORE_SLUG` (`na-brasa` ou valor acordado)

## Loja / WhatsApp

- [ ] Número WhatsApp da loja configurado (link `wa.me`)
- [ ] Mensagem gerada a partir do pedido salvo

## Banco e app

- [ ] Migrations aplicadas
- [ ] Seed de produção (se houver) revisado — sem PII real indevida
- [ ] Domínio/DNS Vercel ok
- [ ] Build de produção ok

## Fluxo pedido

- [ ] Cliente conclui no mobile
- [ ] Pedido aparece no banco/admin
- [ ] WhatsApp abre com mensagem coerente
- [ ] Não há dependência de WhatsApp API / pagamento / iFood

## Resultado

- **GO** ou **NO-GO** com blockers listados
