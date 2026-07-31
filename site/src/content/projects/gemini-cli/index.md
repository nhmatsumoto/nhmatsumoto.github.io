---
title: "gemini-cli"
description: "Agente de IA open-source que traz o poder do Gemini direto para o terminal."
status: "publicado"
stack: 
  - "TypeScript"
  - "Node.js"
  - "Gemini API"
  - "CLI"
tags: 
  - "fork"
repoUrl: "https://github.com/nhmatsumoto/gemini-cli"
---

Fork do Gemini CLI, o agente de IA open-source do Google que integra o modelo Gemini diretamente ao terminal, com capacidade de executar ferramentas de sistema.

### Arquitetura de agente

O Gemini CLI implementa um loop de agente clássico:

1.  **Input** — recebe instrução do usuário via terminal
2.  **Reasoning** — o modelo Gemini processa o contexto e decide a próxima ação
3.  **Tool execution** — executa ferramentas (shell, file read/write, search)
4.  **Observation** — resultado da ferramenta alimenta o próximo ciclo
5.  **Output** — resposta final ao usuário

### Por que este fork

Estudo comparativo de arquiteturas de agentes de código. Compara abordagens do Gemini CLI com Claude Code e outros agentes no repositório **system-prompts-and-models-of-ai-tools**.

### Pontos de interesse

*   Gestão de contexto e memória entre turnos
*   Estratégia de tool selection e parameter extraction
*   Sandboxing e permissões de execução
*   Streaming de respostas longas

### Problema e solução

Agentes de código no terminal precisam equilibrar autonomia com segurança: executar ferramentas de sistema é poderoso mas arriscado. A análise da implementação do Gemini CLI revela como o Google aborda esse trade-off.

### Arquitetura

CLI em TypeScript/Node.js com loop de agente baseado em tool-use. Comunica-se com a Gemini API via streaming, mantém histórico de conversação e executa tools locais com confirmação do usuário para operações destrutivas.

### Impacto & Resultados

*   Estudo comparativo de arquiteturas de agentes: loop ReAct vs planner vs tree-of-thought em contexto real de CLI
*   Fork usado como base de referência para o design do Ronaldinho Agent (agente próprio em .NET)

### Trade-offs & Decisões

*   Fork vs build from scratch: fork acelerou aprendizado de patterns do Gemini, mas herdou decisões de design do Google
*   TypeScript/Node.js vs Go: ecossistema JS facilita prototipação, mas overhead de runtime é perceptível em operações de filesystem

### Lições Aprendidas

*   O modelo de permissões do Gemini CLI (allow-list de tools) é mais seguro que o modelo opt-out de outros agentes
*   Loops de agente em CLI exigem timeout agressivo por step — sem isso, o agente pode travar em I/O indefinidamente
