---
title: "nhmatsumoto.github.io"
description: "Technical Knowledge OS — blog e portfolio com engine de geração estática e navegação estruturada."
status: "publicado"
stack: 
  - "Python"
  - "HTML"
  - "CSS"
  - "JavaScript"
  - "GitHub Pages"
tags: 
  - "HTML"
repoUrl: "https://github.com/nhmatsumoto/nhmatsumoto.github.io"
---

Este é o repositório do Technical Knowledge OS — o site que você está usando agora. Uma plataforma de publicação técnica construída do zero com um engine de geração estática em Python, conteúdo estruturado e navegação leve.

### Arquitetura do engine

O engine de geração estática processa conteúdo em TOML, renderiza markdown para HTML e gera um site completo com:

*   **Posts** — artigos técnicos com suporte a math (AsciiMath), Mermaid, code blocks e tabelas
*   **Projetos** — portfolio com dados estruturados e páginas dedicadas
*   **Documentos** — especificações técnicas com versionamento
*   **i18n** — suporte a internacionalização multi-idioma
*   **Busca** — índice JSON para search client-side

### Páginas e navegação

A navegação prioriza páginas estáticas rápidas, cards claros e links permanentes para posts, projetos e documentos. O site inclui:

*   Listagens por tipo de conteúdo
*   Páginas de detalhe com metadados consistentes
*   Sitemap e feed gerados automaticamente
*   Busca client-side baseada em índice JSON
*   Layouts responsivos para leitura técnica

### Deploy

GitHub Actions executa o build em cada push ao master e deploya o resultado no GitHub Pages automaticamente.

### Problema e solução

Plataformas de blog existentes são genéricas demais para um portfolio técnico que precisa de conteúdo estruturado, suporte a fórmulas matemáticas e controle total sobre o design. O Technical Knowledge OS resolve isso com um engine customizado que trata conteúdo como domínio.

### Arquitetura

Engine Python modular: loader (TOML → dict), renderer (dict → HTML), generator (orquestração). Assets estáticos (CSS, JS) são copiados e servidos diretamente. Índices de busca, sitemap, feed e páginas localizadas são gerados no build. GitHub Actions para CI/CD.
