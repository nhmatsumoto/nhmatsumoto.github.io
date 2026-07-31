---
title: "react-data-grid"
description: "Componente React de data grid com funcionalidades avançadas e alta customização."
status: "publicado"
stack: 
  - "React"
  - "TypeScript"
  - "Virtualization"
tags: 
  - "fork"
repoUrl: "https://github.com/nhmatsumoto/react-data-grid"
---

Fork do react-data-grid, um componente React de alta performance para exibição e manipulação de dados tabulares.

### Funcionalidades

*   **Virtualização** — renderiza apenas as linhas visíveis, suportando milhões de registros
*   **Sorting** — ordenação por múltiplas colunas
*   **Filtering** — filtros por coluna com operadores customizáveis
*   **Editing inline** — edição direta nas células com validação
*   **Column resizing/reordering** — ajuste de largura e ordem das colunas
*   **Copy/Paste** — suporte a clipboard para operações em massa

### Uso no ecossistema

Utilizado como referência para componentes de visualização de dados no **SplitCosts-FE** e outros projetos que precisam exibir tabelas com grande volume de dados de forma performática.

### Por que virtualização importa

Renderizar 10.000 linhas no DOM degrada a performance do browser. Virtualização resolve isso renderizando apenas o viewport visível (~30 linhas), com scroll suave simulado via CSS transforms.

### Problema e solução

Tabelas HTML nativas não escalam para grandes volumes de dados. O react-data-grid resolve com virtualização de linhas e colunas, mantendo a API familiar de um componente React declarativo.

### Arquitetura

Componente React com virtualização baseada em position: absolute e CSS transforms. O scroll handler calcula quais linhas são visíveis e renderiza apenas essas, reciclando DOM nodes conforme o usuário scrolla.
