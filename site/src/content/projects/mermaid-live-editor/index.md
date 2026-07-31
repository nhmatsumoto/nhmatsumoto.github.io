---
title: "mermaid-live-editor"
description: "Editor ao vivo para criação, preview e compartilhamento de diagramas Mermaid."
status: "publicado"
stack: 
  - "Svelte"
  - "TypeScript"
  - "Mermaid"
  - "Monaco Editor"
tags: 
  - "fork"
repoUrl: "https://github.com/nhmatsumoto/mermaid-live-editor"
---

Fork do Mermaid Live Editor, a aplicação web oficial para criação e preview de diagramas Mermaid em tempo real.

### Funcionalidades

*   **Editor com syntax highlighting** via Monaco Editor (mesmo do VS Code)
*   **Preview instantâneo** — renderização em tempo real conforme o texto é editado
*   **Exportação** — download em SVG, PNG e links compartilháveis
*   **Templates** — exemplos pré-configurados para cada tipo de diagrama
*   **Temas** — preview com diferentes temas (default, dark, forest, neutral)

### Uso prático

Ferramenta complementar ao fork do **mermaid** para desenvolvimento e teste de diagramas antes de incorporá-los aos posts e documentos do Technical Knowledge OS.

### Stack

Construído com Svelte para uma experiência de UI reativa e leve, com TypeScript para type safety e Monaco Editor para a experiência de edição.

### Problema e solução

Escrever diagramas Mermaid sem feedback visual é lento e propenso a erros de sintaxe. O live editor resolve isso com preview instantâneo, reduzindo o ciclo de iteração de minutos para segundos.

### Arquitetura

SPA em Svelte com três painéis: editor (Monaco), preview (Mermaid renderer) e configuração (tema, tipo de diagrama). Estado compartilhado via Svelte stores. Exportação feita via serialização do SVG renderizado.
