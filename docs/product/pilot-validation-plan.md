# Plano de validação do piloto — Na Braza

Documento **operacional** para validar se o piloto Na Braza (`na-brasa`) consegue
receber e operar pedidos reais com menos atrito usando o sistema atual.

Não define novas features. Não autoriza analytics complexo, PostHog, billing
nem tracking instrumentado nesta fase.

Relacionado: [../product.md](../product.md) · [../releases/v0.1.0-pilot.md](../releases/v0.1.0-pilot.md) · [../client/na-braza-pilot-data.md](../client/na-braza-pilot-data.md) · skills `.cursor/skills/product-grill` e `.cursor/skills/revenue-centric-design`.

Papéis usados neste plano (não inventar nomes pessoais):

| Papel | Função |
| --- | --- |
| Product Engineer | Conduz validação, consolida evidências, registra decisão |
| Store Owner | Aceita dados comerciais e decide continuidade |
| Store Operator | Opera pedidos no painel e no WhatsApp |
| Invited Customer | Executa o fluxo sem orientação |
| Pilot Observer | Observa convidados e registra fricções |

---

## 1. Objetivo

Validar se o Na Braza consegue receber e operar pedidos reais com menos atrito
usando o sistema (storefront → pedido persistido → WhatsApp → painel).

## 2. Hipóteses

1. Consumidores montam pedidos sem assistência.
2. Consumidores entendem o handoff para WhatsApp.
3. Pedidos persistidos correspondem aos pedidos recebidos pela loja.
4. A equipe consegue usar o painel.
5. A operação reduz perguntas repetitivas.
6. O proprietário percebe valor comercial suficiente para continuar (e, no
   limite, pagar).

## 3. Maior risco

**Pedido persistido no banco sem mensagem efetivamente enviada no WhatsApp.**

Implicação: pedido “fantasma” no painel, ou WhatsApp sem reconciliação com o painel.

## 4. Funil mínimo e matriz de evidência

Eventos conceituais nesta fase — **observação manual / painel / WhatsApp**.
Analytics instrumentado **não** foi implementado; a escolha de ferramenta é posterior.
Não há promessa de precisão inexistente.

```text
storefront_viewed
product_added_to_cart
checkout_started
order_created
whatsapp_handoff_clicked
order_received
order_completed
order_cancelled
```

| Evento | Evidência | Fonte | Confirmação |
| --- | --- | --- | --- |
| `storefront_viewed` | acesso registrado ou observação | futura telemetria / sessão observada | automática ou manual |
| `product_added_to_cart` | item adicionado | futura telemetria / observação | automática ou manual |
| `checkout_started` | checkout aberto | futura telemetria / observação | automática ou manual |
| `order_created` | pedido persistido | banco / painel | automática |
| `whatsapp_handoff_clicked` | link acionado | futura telemetria / observação | **não prova envio** |
| `order_received` | loja confirma mensagem | WhatsApp + painel | **operacional** |
| `order_completed` | pedido concluído | painel / registro da loja | operacional |
| `order_cancelled` | pedido cancelado | painel / registro da loja | operacional |

### Distinções obrigatórias

| Evento | Não significa |
| --- | --- |
| `order_created` | Mensagem enviada no WhatsApp |
| `whatsapp_handoff_clicked` | Mensagem enviada ou lida |
| `order_received` | Só existe com confirmação operacional da loja |

Confirmação operacional deve registrar: **`orderId`**, **responsável** e **timestamp**.

---

## 5. Fases da validação

### Phase A — Owner acceptance

#### Owner

Store Owner + Product Engineer

#### Preconditions

- Ambiente de produção (ou alvo do piloto) disponível
- Credenciais válidas para `/admin`
- Catálogo carregado e acessível em `/na-brasa`

#### Actions

Revisar e aprovar com o Store Owner:

- [ ] catálogo
- [ ] preços
- [ ] adicionais
- [ ] taxa de entrega
- [ ] pedido mínimo
- [ ] horários / texto operacional
- [ ] WhatsApp de destino
- [ ] meios de pagamento comunicados
- [ ] painel `/admin`
- [ ] usuários e permissões

#### Evidence to record

- Itens aprovados / rejeitados
- Bloqueadores de acesso ou dados incorretos
- Assinatura verbal ou checklist preenchido (data)

#### Advance criteria

- Catálogo, preços, adicionais, taxa, mínimo, horários, WhatsApp e pagamentos aprovados
- Dono consegue acessar o painel
- Nenhum bloqueador operacional permanece

#### Stop or adjustment criteria

- Dados comerciais incorretos
- Acesso não funciona
- Fluxo não representa a operação real

#### Expected duration

1–3 dias úteis (conforme disponibilidade do Store Owner)

---

### Phase B — Internal operation

#### Owner

Store Operator + Product Engineer

#### Preconditions

- Phase A avançada
- Loja configurada com WhatsApp real do piloto
- Pelo menos um operador com acesso adequado

#### Actions

Executar pedidos controlados:

- [ ] pedido do dono
- [ ] pedido da equipe
- [ ] retirada
- [ ] entrega
- [ ] dinheiro
- [ ] cartão / Pix (conforme comunicado)
- [ ] adicionais
- [ ] produto indisponível
- [ ] loja fechada
- [ ] cancelamento
- [ ] atualização de status no painel

#### Evidence to record

- `orderId` de cada pedido de teste
- Se WhatsApp abriu / mensagem chegou
- Quem confirmou recebimento e quando
- Divergências de valor ou item
- Formulário de coleta (seção 10)

#### Advance criteria

- Retirada e entrega funcionam nos testes
- Dinheiro e cartão/Pix funcionam conforme comunicado
- Pedido aparece no painel
- Status pode ser atualizado
- Painel e WhatsApp podem ser conciliados (`orderId` ↔ mensagem)

#### Stop or adjustment criteria

- Pedido não chega corretamente
- Valor diverge
- Equipe não entende a operação
- Existe bloqueador de uso

#### Expected duration

1–2 dias de sessões controladas

---

### Phase C — Invited customers

#### Owner

Pilot Observer

#### Preconditions

- Phase B avançada
- 3 a 5 Invited Customers disponíveis
- Store Operator disponível para confirmar recebimento

#### Actions

- Convidados executam o fluxo **sem orientação** durante o pedido
- Observar fricções e dúvidas
- Confirmar se a loja **recebeu** a mensagem
- Preencher formulário de coleta por sessão

#### Evidence to record

- Etapa alcançada, dificuldades, `orderId`
- WhatsApp aberto? Mensagem recebida? Confirmado por quem / quando?
- Dúvidas verbais e severidade

#### Advance criteria

- 3 a 5 convidados executaram o fluxo
- Maioria concluiu **sem orientação** (sem percentual estatístico rígido)
- Dúvidas e rupturas registradas
- Pedidos puderam ser conciliados

#### Stop or adjustment criteria

- Falha bloqueadora
- Convidados não compreendem o handoff
- Mensagens não chegam
- Dados do pedido divergem

#### Expected duration

2–5 sessões em 1–3 dias

---

### Phase D — Live window

#### Owner

Store Owner + Store Operator
(com apoio do Product Engineer)

#### Preconditions

- Phase C avançada (ou ajuste documentado após C)
- Janela curta e volume controlado acordados
- Canal de suporte imediato definido

#### Actions

- Operar pedidos reais em período curto
- Acompanhar incidentes
- Registrar bloqueadores e tempos aproximados
- Manter conciliação painel ↔ WhatsApp

#### Evidence to record

- Pedidos recebidos / concluídos / cancelados
- Incidentes com severidade
- Tempo criado → recebido e recebido → concluído (aprox.)
- Pedidos de retorno ao processo anterior (se houver)

#### Advance criteria

- Janela termina sem falha crítica
- Pedidos foram recebidos e processados
- Incidentes registrados
- Equipe conseguiu operar o fluxo

#### Stop or adjustment criteria

- Pedidos perdidos
- Valores incorretos
- Operação mais lenta ou insegura
- Equipe solicita retorno ao processo anterior

#### Expected duration

Janela curta acordada (ex.: 1–3 dias de operação controlada)

---

### Phase E — Interview and decision

#### Owner

Product Engineer

#### Participants

Store Owner + Store Operator

#### Preconditions

- Phase D concluída ou interrompida com evidências registradas
- Dados do funil e formulários disponíveis

#### Actions

- Conduzir entrevista (seção 11)
- Consolidar funil e incidentes
- Registrar decisão pós-piloto (seção 12)
- Definir próxima hipótese e owner

#### Evidence to record

- Respostas da entrevista (incl. disposição a pagar)
- Decisão: PROSSEGUIR | AJUSTAR | REPOSICIONAR | INTERROMPER
- Features autorizadas / adiadas / rejeitadas

#### Advance criteria

N/A — fase terminal do ciclo.

Concluir quando:

- Entrevista realizada
- Dados do funil consolidados
- Decisão pós-piloto registrada
- Próxima hipótese e owner definidos

#### Stop or adjustment criteria

- Entrevista incompleta → remarcar antes de decidir
- Evidências insuficientes → repetir fase D com escopo menor ou AJUSTAR sem PROSSEGUIR

#### Expected duration

Sessão de entrevista + consolidação no mesmo dia ou no dia seguinte

---

## 6. Janela de decisão pós-piloto

A decisão deve ser registrada em **até 2 dias úteis** após o fim da última
janela real do piloto (Phase D).

Decisão obrigatória: **PROSSEGUIR** | **AJUSTAR** | **REPOSICIONAR** | **INTERROMPER**.

Registrar:

- evidências
- decisão
- responsável
- data
- próxima hipótese
- feature autorizada
- feature adiada
- feature rejeitada
- prazo da próxima revisão

---

## 7. Métricas mínimas

Observáveis manualmente nesta fase:

- acessos (estimativa / relatos)
- produtos adicionados
- checkouts iniciados
- pedidos criados (banco / painel)
- handoffs para WhatsApp (relato ou observação)
- pedidos **recebidos** (confirmação da loja)
- pedidos concluídos / cancelados
- abandonos conhecidos
- tempo pedido criado → recebido
- tempo recebido → concluído
- dificuldades da equipe
- disposição a pagar (entrevista)

Amostra pequena: não transformar em metas estatísticas rígidas.

## 8. Critérios de sucesso (ciclo completo)

Sinais iniciais realistas:

- Nenhuma falha bloqueadora de segurança ou de pedido
- Maioria dos convidados conclui sem ajuda
- Conciliação painel ↔ WhatsApp é possível na prática
- Equipe entende o fluxo básico de status
- Proprietário confirma redução de retrabalho ou maior clareza
- Existe interesse concreto em **continuar usando**
- Existe sinal de disposição a pagar **ou** benefício operacional claro

## 9. Critérios de ajuste / interrupção (ciclo)

### Ajuste

- Usuários concluem com ajuda recorrente
- Ruptura recorrente no WhatsApp
- Painel confunde
- Informações operacionais incompletas
- Pedidos fantasmas relevantes
- Trabalho duplicado sistemático

### Interrupção

- Ausência de dor real
- Equipe não usa o painel
- Produto aumenta trabalho
- Consumidores preferem o WhatsApp antigo
- Sem interesse em continuar
- Sem disposição a pagar **e** sem benefício operacional

---

## 10. Formulário de coleta

Template operacional (não é schema/código):

```text
date
time
session or participant
device
orderId
stage reached
difficulty
order created?
WhatsApp opened?
message received?
received confirmed by
received confirmed at
order completed?
order cancelled?
elapsed time
severity
observation
required action
owner
status
```

## 11. Entrevista do proprietário / equipe

Diferenciar claramente nas respostas:

| Nível | Pergunta implícita |
| --- | --- |
| Gostou | Feedback subjetivo |
| Usaria | Intenção |
| Continuaria usando | Adoção |
| Pagaria | Intenção comercial |
| Quanto pagaria | Disposição a pagar |
| Por qual resultado pagaria | Valor específico |

### Operação atual

1. Como os pedidos chegam hoje?
2. Onde mais se perde tempo?
3. Qual processo ou ferramenta seria substituído?
4. Qual custo ou esforço atual seria reduzido?

### Uso do sistema

5. Houve menos perguntas repetitivas?
6. O painel ajudou?
7. O WhatsApp continuou claro?
8. Houve pedido no painel sem mensagem (ou o inverso)?
9. O que impediria o uso diário?
10. Quem usará o sistema diariamente?

### Comercial

11. Quem decide a compra?
12. Continuaria usando?
13. Pagaria mensalmente?
14. Preferiria cobrança mensal, implantação ou ambos?
15. Qual frequência de cobrança seria aceitável?
16. Por qual valor aproximado?
17. Por qual resultado específico pagaria?
18. Qual resultado teve mais valor?
19. O que precisaria acontecer para recomendar a outra loja?
20. Recomendaria para outra loja hoje?

Uma resposta “gostei” **não** valida comercialmente o produto.

## 12. Decisão pós-piloto

| Decisão | Significado |
| --- | --- |
| **PROSSEGUIR** | Evidência de funcionamento e valor; autorizar próximos passos alinhados |
| **AJUSTAR** | Ruptura específica corrigível; manter piloto com mudanças pontuais |
| **REPOSICIONAR** | Valor existe, mas em outro encaixe comercial/operacional |
| **INTERROMPER** | Parar expansão; documentar aprendizados (não é falha de engenharia) |

### REPOSICIONAR — cenário explícito

O storefront gera valor, mas o painel, o fluxo operacional ou a proposta
comercial **não é adotado**.

Exemplos:

- loja quer apenas cardápio + WhatsApp
- painel é ignorado
- operação prefere outro processo
- valor percebido está em reduzir perguntas, não em gerenciar status

Isso permite mudar posicionamento **sem** tratar como falha técnica.

### Registro da decisão

- evidências
- decisão
- responsável
- data (dentro da janela de 2 dias úteis após Phase D)
- próxima hipótese
- feature autorizada / adiada / rejeitada
- prazo da próxima revisão

Toda feature relevante após este plano deve passar por `product-grill` antes
de planejamento técnico.
