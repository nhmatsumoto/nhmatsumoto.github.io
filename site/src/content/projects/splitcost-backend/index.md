---
title: "SplitCost-Backend"
description: "Backend do SplitCosts — API .NET com multi-tenant, domain events e projeções de leitura."
status: "publicado"
stack: 
  - "C#"
  - ".NET"
  - "PostgreSQL"
  - "Multi-tenant"
  - "DDD"
tags: 
  - "C#"
repoUrl: "https://github.com/nhmatsumoto/SplitCost-Backend"
---

Backend do **SplitCosts** — API em .NET/C# que implementa a lógica de compartilhamento de despesas com foco em multi-tenancy e modelagem de domínio.

### Arquitetura

*   **Multi-tenant** — isolamento de dados por grupo/household com tenant resolution no middleware
*   **Domain events** — mudanças de estado publicam eventos para manter projeções atualizadas
*   **CQRS simplificado** — separação entre comandos (escrita) e queries (projeções de leitura)
*   **Repository pattern** — abstração de persistência com PostgreSQL via Entity Framework

### Domínio

O modelo de domínio trata despesas como agregados com regras de negócio:

*   Divisão proporcional ou customizada entre participantes
*   Histórico de pagamentos e saldos por período
*   Reconciliação de dívidas entre membros do grupo
*   Categorização e reporting

### Relação com o ecossistema

Evolução direta do **Financial** (monolito), agora com separação clara entre contextos, multi-tenancy e projeções de leitura. Consumido pelo **SplitCosts-FE** via REST API.

### Problema e solução

O Financial original acoplava regras de negócio à infraestrutura e não suportava múltiplos grupos. O backend do SplitCosts resolve isso com fronteiras de domínio explícitas, tenant isolation e projeções dedicadas para cada tela.

### Arquitetura

API ASP.NET Core em camadas: Controllers → Application Services → Domain → Infrastructure. Multi-tenancy via middleware de tenant resolution. PostgreSQL com Entity Framework Core. Projeções de leitura como queries separadas sobre views materializadas.
