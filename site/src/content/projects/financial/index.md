---
title: "Financial"
description: "Monolito para gestão financeira pessoal em C#/.NET."
status: "publicado"
stack: 
  - "C#"
  - ".NET"
  - "Entity Framework"
  - "SQL Server"
tags: 
  - "C#"
repoUrl: "https://github.com/nhmatsumoto/Financial"
---

Aplicação monolítica de gestão financeira pessoal, desenvolvida como exercício de arquitetura em .NET com Entity Framework e SQL Server.

### Funcionalidades

*   Cadastro e categorização de receitas e despesas
*   Relatórios por período e categoria
*   Controle de saldos e projeções simples

### Relação com o ecossistema

Este projeto é o predecessor direto do **SplitCosts** — a evolução natural de um monolito financeiro pessoal para uma aplicação multi-tenant de compartilhamento de despesas. Muitas das decisões de domínio do SplitCosts foram refinadas a partir das limitações encontradas aqui.

### Lições aprendidas

O formato monolítico funcionou para o escopo inicial, mas revelou limitações quando o domínio cresceu: acoplamento entre regras de negócio e infraestrutura, dificuldade de testar cenários complexos e falta de separação entre contextos de leitura e escrita.

### Problema e solução

Gestão financeira pessoal precisa ser simples o suficiente para uso diário, mas estruturada o suficiente para gerar relatórios úteis. O desafio foi equilibrar praticidade com modelagem correta do domínio financeiro.

### Arquitetura

Monolito em camadas: Controllers → Services → Repository → Entity Framework → SQL Server. A simplicidade da arquitetura é adequada ao escopo, mas o acoplamento entre camadas motivou a adoção de uma abordagem mais modular no SplitCosts.
