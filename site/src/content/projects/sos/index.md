---
title: "SOS"
description: "Módulo auxiliar do ecossistema SOS Location — componentes compartilhados para resposta a desastres."
status: "publicado"
stack: 
  - "TypeScript"
  - "Node.js"
  - "GIS"
tags: 
  - "TypeScript"
  - "GIS"
repoUrl: "https://github.com/nhmatsumoto/sos"
---

Módulo auxiliar do ecossistema **SOS Location**, contendo componentes compartilhados entre os serviços da plataforma de resposta a desastres.

### Papel no ecossistema

Enquanto o **SOS Location** é a aplicação principal com interface de usuário e pipelines de dados, o repositório **SOS** concentra:

*   **Contratos de integração** — tipos TypeScript compartilhados entre serviços
*   **Utilitários GIS** — funções de conversão de coordenadas, cálculo de distâncias e processamento de GeoJSON
*   **Configurações compartilhadas** — constantes, enums e mapas de referência

### Relação com brumadinho_location

O aprendizado acumulado no projeto **brumadinho_location** foi formalizado nos utilitários deste módulo, transformando scripts ad-hoc em funções reutilizáveis e testáveis.

### Problema e solução

Em sistemas distribuídos, a duplicação de tipos e utilitários entre serviços gera inconsistências. Este módulo centraliza contratos e funções compartilhadas para garantir coerência entre os componentes do ecossistema SOS.

### Arquitetura

Pacote TypeScript/Node.js publicável como dependência local. Exporta tipos, interfaces e funções utilitárias consumidas pelos demais serviços do ecossistema SOS via import direto.
