# Workflow — Bugfix

## 1. Reproduzir

- Passos, rota, dados de entrada, resultado esperado vs atual
- Ambiente (local/preview/prod) e se há pedido/WhatsApp envolvido

## 2. Isolar causa

- UI vs action vs Prisma vs formatter
- Confirmar se preço/total veio do client indevidamente

## 3. Corrigir o mínimo

- Patch focado; sem “já que estou aqui” em refactor grande
- Preservar mobile-first e fluxo salvar→WhatsApp

## 4. Regressão

- Adicionar teste se a lógica for estável (totais, Zod, mensagem)
- Rodar validações do projeto

## 5. Reportar

- Causa raiz, fix, arquivos, teste adicionado (ou por que não)
