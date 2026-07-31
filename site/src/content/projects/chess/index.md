---
title: "Chess"
description: "Implementação de xadrez em C# com modelagem de domínio orientada a regras."
status: "publicado"
stack: 
  - "C#"
  - ".NET"
  - "OOP"
  - "Domain Modeling"
tags: 
  - "C#"
repoUrl: "https://github.com/nhmatsumoto/chess"
---

Implementação de um jogo de xadrez completo em C#, com modelagem de domínio que trata cada peça como entidade com regras próprias de movimentação.

### Modelagem de domínio

O tabuleiro é representado como uma matriz 8x8 onde cada célula pode conter uma peça. Cada tipo de peça (Rei, Rainha, Torre, Bispo, Cavalo, Peão) implementa suas próprias regras de movimentação, incluindo:

*   Movimentos válidos considerando o estado atual do tabuleiro
*   Detecção de xeque e xeque-mate
*   Movimentos especiais: roque, en passant, promoção de peão

### Decisões de design

*   **Value Objects** para posições no tabuleiro
*   **Strategy pattern** para regras de movimentação por tipo de peça
*   **Imutabilidade** do estado do jogo para facilitar undo/redo

### Problema e solução

Xadrez é um exercício clássico de modelagem de domínio: regras complexas que interagem entre si, validações que dependem do estado global e lógica que precisa ser expressa de forma clara. O projeto aplica princípios de DDD para manter as regras legíveis e testáveis.

### Arquitetura

Arquitetura em camadas simples: domínio (peças, tabuleiro, regras), aplicação (controle de jogo, turnos) e interface de console. O domínio é completamente independente da camada de apresentação.
