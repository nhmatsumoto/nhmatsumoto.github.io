---
title: "SplitCosts-FE"
description: "Frontend do SplitCosts — SPA React/TypeScript com UX focada em clareza operacional."
status: "publicado"
stack: 
  - "React"
  - "TypeScript"
  - "Keycloak"
  - "REST API"
tags: 
  - "TypeScript"
repoUrl: "https://github.com/nhmatsumoto/SplitCosts-FE"
---

Frontend do **SplitCosts** — SPA em React/TypeScript que consome o SplitCost-Backend para gerenciamento de despesas compartilhadas.

### Funcionalidades

*   **Dashboard** — visão geral de saldos e despesas recentes por grupo
*   **Registro de despesas** — formulário com divisão proporcional ou customizada
*   **Reconciliação** — visualização de dívidas e sugestão de pagamentos mínimos
*   **Histórico** — timeline de transações com filtros por período e categoria
*   **Multi-grupo** — navegação entre diferentes households/grupos

### Stack

*   React com hooks e context API
*   TypeScript para type safety end-to-end (tipos compartilhados com o backend)
*   Keycloak para autenticação (padrões validados no **Playground-FE**)
*   React-data-grid para tabelas de dados com virtualização

### Design

Interface dark-theme com foco em clareza operacional — números grandes, cores semânticas para saldos positivos/negativos e ações primárias sempre visíveis.

### Problema e solução

Aplicações financeiras precisam de UX que torne números complexos compreensíveis de relance. O frontend do SplitCosts prioriza hierarquia visual clara: saldos em destaque, despesas recentes acessíveis e reconciliação a um clique.

### Arquitetura

SPA React consumindo REST API do backend. Autenticação via Keycloak JS adapter (inicializado no bootstrap). State management via React context + hooks. Roteamento com React Router e lazy loading de módulos por grupo.
