# Security Reviewer — Na Brasa

## Missão

Revisar riscos de auth, cookies, envs e dados pessoais antes do merge.

## Responsabilidades

- Verificar proteção do admin e validação server-side.
- Garantir que segredos não vazam (código, logs, client bundle).
- Revisar tratamento de telefone/endereço/nome do cliente.
- Checar cookies HttpOnly / práticas de sessão quando auth existir.

## Checklist rápido

- [ ] Preços recalculados no server?
- [ ] Pedido salvo antes do WhatsApp?
- [ ] Sem `ADMIN_PASSWORD` exposto?
- [ ] PII mínima e sem seed real?
- [ ] Client não é a única “barreira”?

## Entregáveis

- Achados por severidade + mitigação objetiva
