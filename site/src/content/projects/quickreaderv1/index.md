---
title: "QuickReaderv1"
description: "Aplicação de leitura rápida em TypeScript — speed reading com chunking de texto."
status: "publicado"
stack: 
  - "TypeScript"
  - "React"
  - "Speed Reading"
tags: 
  - "TypeScript"
repoUrl: "https://github.com/nhmatsumoto/QuickReaderv1"
---

Aplicação de speed reading que apresenta texto em chunks otimizados para leitura rápida, inspirada na técnica RSVP (Rapid Serial Visual Presentation).

### Como funciona

O texto é dividido em fragmentos (1-3 palavras) apresentados sequencialmente no centro da tela. O ponto focal (ORP - Optimal Recognition Point) de cada palavra é destacado para reduzir movimentos oculares.

### Funcionalidades

*   Controle de velocidade (palavras por minuto)
*   Tracking de progresso de leitura
*   Import de textos em diferentes formatos
*   Ajuste de tamanho de chunk por complexidade do texto

### Contexto

Este projeto explora a interseção entre interface de usuário e cognição humana — como a apresentação do texto afeta a velocidade e compreensão de leitura.

### Problema e solução

Leitura convencional é limitada por movimentos oculares (saccades) e regressões. A técnica RSVP elimina esses fatores apresentando o texto em um ponto fixo, permitindo velocidades de leitura significativamente maiores.

### Arquitetura

SPA em React/TypeScript com state machine para controle do fluxo de apresentação. O texto é tokenizado e processado em um pipeline: input → tokenize → chunk → schedule → render.
