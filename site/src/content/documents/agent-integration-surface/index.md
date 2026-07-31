---
title: "Superfície de Integração de Agentes"
description: "Contratos mínimos para expor ferramentas e serviços a um runtime orientado a agentes."
version: "v1"
category: "apis"
tags:
  - apis
  - agents
  - integration
---

## Agent Integration Surface

Esta nota documenta a superfície mínima de integração para um sistema orientado a agentes que precisa chamar ferramentas externas sem perder previsibilidade.

### Contratos principais

- `task`: o problema que precisa ser resolvido;
- `capability`: o conjunto de ações disponíveis;
- `tool_call`: a invocação concreta de infraestrutura;
- `result`: o retorno normalizado para consumo interno.

### Regras úteis

1. O agente não deve falar diretamente com tudo.
2. Toda chamada externa precisa de contrato e normalização.
3. Logs técnicos não substituem eventos de domínio.

### Resultado esperado

Quando essa superfície é explícita, trocar provider, runtime ou forma de coordenação deixa de ser uma reescrita completa.
