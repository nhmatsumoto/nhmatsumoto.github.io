---
title: "Limites de DDD para sistemas com agentes"
description: "Notas práticas sobre como separar domínio, execução de tools e políticas de coordenação em sistemas com agentes."
date: "2026-04-02T20:30:00+09:00"
readingTime: 1
hasMath: false
tags: 
  - "dotnet"
  - "ddd"
  - "ai"
badges: 
  - "architecture"
  - "experiment"
tradeoffs: 
  - "DDD em sistemas de agentes exige mapeamento explícito de 'quem decide o quê' — mais design upfront"
  - "Contextos muito granulares aumentam o número de integrações — equilíbrio é pragmático, não purista"
lessons: 
  - "Agentes autônomos precisam de boundaries ainda mais rígidos que microserviços — a autonomia amplifica o acoplamento"
  - "Anti-corruption layers entre agente e domínio de negócio evitam que o modelo de IA 'vaze' para o core"
---

## Separando domínio de orquestração em sistemas com agentes

Quando um projeto começa a misturar prompt, decisão de negócio, execução de tool e persistência no mesmo fluxo, a velocidade inicial costuma enganar. O custo aparece depois: pouca previsibilidade, testes frágeis e dificuldade para mudar o comportamento do sistema sem quebrar tudo.

### Uma fronteira útil

Eu tenho tratado esses sistemas em três camadas explícitas:

*   **domínio**: regras, linguagem ubíqua, contratos e estado significativo;
*   **orquestração**: composição de passos, seleção de tools e roteamento;
*   **infraestrutura**: modelos, filas, banco, storage e conectores externos.

### O que muda na prática

Separar essas fronteiras ajuda em três pontos:

1.  O domínio volta a ser testável sem depender de modelo.
2.  A camada de orquestração pode evoluir sem reescrever regras.
3.  O runtime deixa de ser o lugar onde decisões de negócio ficam escondidas.

### Heurística simples

Se uma decisão precisa sobreviver à troca de provider, ela provavelmente pertence ao domínio ou à política de aplicação, não ao prompt.

### O que estou documentando agora

Esse raciocínio está guiando a estrutura do Ronaldinho Agent e também a forma como passei a organizar este blog: menos páginas isoladas, mais documentação conectada.
