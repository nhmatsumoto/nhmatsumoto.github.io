---
title: "mermaid"
description: "Geração de diagramas como fluxogramas e diagramas de sequência a partir de texto, similar a markdown."
status: "publicado"
stack: 
  - "JavaScript"
  - "SVG"
  - "Parsing"
  - "Diagrams"
tags: 
  - "fork"
repoUrl: "https://github.com/nhmatsumoto/mermaid"
---

Fork do Mermaid.js, a biblioteca de geração de diagramas a partir de texto que é integrada nativamente no Technical Knowledge OS.

### Uso no ecossistema

O Mermaid é utilizado em posts, documentos e projetos para renderizar diagramas técnicos diretamente no conteúdo markdown:

*   **Flowcharts** — fluxos de processamento e pipelines
*   **Sequence diagrams** — interações entre serviços
*   **Class diagrams** — modelagem de domínio
*   **ER diagrams** — esquemas de banco de dados
*   **Gantt charts** — cronogramas de projeto

### Integração

O render engine do blog detecta blocos de código marcados como `mermaid` e os renderiza automaticamente como SVG no lado do cliente. A biblioteca é carregada via CDN com tema escuro configurado para o design do site.

### Exemplo

Um bloco como:

```text
graph LR
  A[Input] --> B[Process]
  B --> C[Output]
```

É renderizado como um diagrama de fluxo interativo diretamente na página.

### Problema e solução

Documentação técnica com diagramas estáticos (imagens) é difícil de manter e versionar. Mermaid resolve isso tratando diagramas como código: versionáveis, diff-friendly e atualizados automaticamente quando o texto muda.

### Arquitetura

Parser PEG.js que converte sintaxe textual em AST, renderer que transforma AST em SVG via D3.js. Suporta temas customizáveis e integração com markdown parsers via blocos de código fenced.
