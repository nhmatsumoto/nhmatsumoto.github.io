---
title: "AutoMapper"
description: "Mapeador objeto-para-objeto baseado em convenções para .NET."
status: "publicado"
stack: 
  - "C#"
  - ".NET"
  - "Reflection"
tags: 
  - "fork"
repoUrl: "https://github.com/nhmatsumoto/AutoMapper"
---

Fork do AutoMapper, a biblioteca mais utilizada no ecossistema .NET para mapeamento automático entre objetos de diferentes camadas (DTOs, ViewModels, Entities).

### Por que este fork

AutoMapper é referência direta para projetos como SplitCosts e Financial, onde a separação entre domínio e contratos de API exige transformações frequentes entre modelos. Manter o fork permite estudar a implementação interna e avaliar trade-offs de performance vs. conveniência.

### Conceitos centrais

*   **Convention over configuration** — propriedades com mesmo nome são mapeadas automaticamente
*   **Profiles** — agrupamento de configurações de mapeamento por contexto de domínio
*   **Projections** — integração com LINQ/EF para projeções diretas no banco de dados
*   **Validação de configuração** — detecção antecipada de mapeamentos incompletos em tempo de inicialização

### Problema e solução

Código de mapeamento manual entre camadas é repetitivo e frágil. AutoMapper resolve isso com convenções que reduzem boilerplate, mas exige disciplina: mapeamentos implícitos podem esconder bugs quando os modelos divergem.

### Arquitetura

AutoMapper utiliza reflection e expression trees para gerar mapeamentos em tempo de compilação do perfil. A versão mais recente introduziu source generators como alternativa para eliminar overhead de reflection em cenários de alta performance.
