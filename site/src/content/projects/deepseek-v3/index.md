---
title: "DeepSeek-V3"
description: "Referência de implementação do modelo DeepSeek-V3 — arquitetura Mixture-of-Experts para LLMs de larga escala."
status: "publicado"
stack: 
  - "Python"
  - "PyTorch"
  - "Transformers"
  - "MoE"
tags: 
  - "fork"
repoUrl: "https://github.com/nhmatsumoto/DeepSeek-V3"
---

Fork do repositório oficial do DeepSeek-V3, um Large Language Model com 671B de parâmetros totais que utiliza Mixture-of-Experts (MoE) para ativar apenas 37B por token durante inferência.

### Arquitetura MoE

Mixture-of-Experts é uma abordagem que permite escalar modelos sem aumentar proporcionalmente o custo computacional:

*   **Router** — decide quais especialistas ativar para cada token
*   **Expert layers** — módulos Feed-Forward especializados (apenas uma fração é ativada por vez)
*   **Multi-head Latent Attention (MLA)** — comprime as key-value caches para reduzir uso de memória durante inferência

### Relevância para estudo

O DeepSeek-V3 é uma referência importante para entender:

*   Trade-offs entre tamanho total do modelo e custo de inferência
*   Estratégias de treinamento com FP8 mixed-precision
*   Balanceamento de carga entre experts sem auxiliary losses
*   Pipeline parallelism para treinamento distribuído

### Problema e solução

Treinar e servir modelos com centenas de bilhões de parâmetros é proibitivamente caro com arquiteturas densas. MoE resolve isso ativando seletivamente subconjuntos do modelo, mantendo qualidade com custo computacional uma ordem de grandeza menor.

### Arquitetura

Transformer com DeepSeekMoE layers: cada camada tem um router que seleciona top-K experts de um pool maior. A inovação do V3 está na eliminação de auxiliary balancing losses, substituindo-as por um mecanismo de bias dinâmico no router.
