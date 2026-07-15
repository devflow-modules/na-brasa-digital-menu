# Command — plan-feature

Use este prompt antes de implementar features médias/grandes.

```text
Atue como Product Owner e Software Architect do Na Brasa.

Planeje a feature abaixo SEM implementar código.

Obrigatório nesta ordem:
1. Ler docs/product.md e identificar o estágio atual do piloto.
2. Classificar PLATFORM, TENANT ou CLIENT_SPECIFIC.
3. Executar a skill product-grill (.cursor/skills/product-grill/SKILL.md).
4. Registrar a saída completa do grill na seção "## Product Decision" do plano.
5. Se a decisão for VALIDATE, DEFER ou REJECT: pare e entregue só o grill + artefato.
6. Se a decisão for REDUCE SCOPE:
   - listar partes removidas e nova proposta;
   - executar product-grill novamente sobre a proposta reduzida;
   - somente continuar se a nova decisão for BUILD.
   REDUCE SCOPE nunca autoriza arquitetura.
7. Se BUILD: hipótese, métrica, validation owner, observation window.
8. Se houver UI, UX ou operação: executar revenue-centric-design
   (.cursor/skills/revenue-centric-design/SKILL.md) consumindo o BUILD.
9. Só então avaliar arquitetura e menor implementação.
10. Definir validação técnica e de usuário.
    Referência: docs/product/pilot-validation-plan.md.

Contexto do produto:
- Cardápio online mobile-first; pedido salvo no banco antes do WhatsApp (link formatado).
- V1: Next.js fullstack, sem WhatsApp API, sem pagamento online, sem iFood, sem React Native.
- Não criar analytics/tracking/dashboard nesta fase sem decisão explícita de produto.

Inclua no plano:

## Product Decision

- Problem:
- Evidence:
- Hypothesis:
- Expected behavior:
- Primary metric:
- Guardrail metrics:
- Classification:
- Decision:
- Rationale:
- Smallest experiment or implementation:
- Validation owner:
- Observation window:
- Evidence that would change the decision:

(Se REDUCE SCOPE ocorreu antes do BUILD, registre também o ciclo: partes cortadas → nova proposta → resultado do re-grill.)

Entregue também:
1. Resultado completo do product-grill (incluindo artefato da decisão)
2. Se BUILD: resultado do revenue-centric-design (quando aplicável)
3. Objetivo e valor para cliente/operador
4. In scope / out of scope (V1 vs futuro)
5. Hipótese, métrica e plano de observação
6. Critérios de aceite
7. Arquivos prováveis a criar/alterar
8. Fronteiras server/client e validações Zod
9. Riscos e fatias de PR se necessário
10. Plano de teste mínimo (técnico + usuário)
11. Lembrete: o corpo da PR futura deve repetir o resumo Product Decision

Feature:
{{DESCREVER_A_FEATURE}}
```
