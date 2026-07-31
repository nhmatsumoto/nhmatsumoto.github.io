---
title: "Ronaldinho Agent: persona, memória curta e tool use sem virar produto separado"
description: "Registro do ronaldinho-agent como experimento de engenharia de agentes: o que foi validado, quais trade-offs apareceram e por que ele faz mais sentido como publicação do que como rota principal do site."
date: "2026-04-06T09:30:00+09:00"
readingTime: 1
hasMath: false
tags: 
  - "agents"
  - "python"
  - "prompt-engineering"
  - "architecture"
badges: 
  - "experiment"
  - "runtime"
  - "notes"
tradeoffs: 
  - "Persona via prompt mantém iteração rápida, mas introduz ruído quando a tarefa exige resposta muito objetiva."
  - "Memória curta por histórico de conversa é simples e auditável, porém limita sessões longas e contexto reaproveitável."
  - "Python acelerou experimentação e integração com providers, mas enfraqueceu parte da modelagem que hoje prefiro em domínios mais estáveis."
lessons: 
  - "O experimento ficou mais útil quando tratado como laboratório de arquitetura, não como produto separado dentro do site."
  - "Tool use precisa de contratos claros e fallback explícito; sem isso o agente parece inteligente até errar em silêncio."
  - "A melhor forma de preservar o trabalho aqui é documentar os aprendizados e ligar o experimento às notas de arquitetura já existentes."
---

## Por que o Ronaldinho Agent saiu da área de projetos

O `ronaldinho-agent` nasceu como experimento para testar três perguntas ao mesmo tempo:

1.  o quanto uma persona muda a percepção de utilidade de um agente;
2.  como manter memória curta sem complicar demais a arquitetura;
3.  onde termina a camada de orquestração e começa o domínio real do sistema.

Com o tempo, ficou claro que o valor principal do projeto não estava em tratá-lo como um produto em destaque, e sim em usá-lo como laboratório para decisões de engenharia. Por isso ele passa a viver aqui como publicação conectada ao restante do site.

### O que o experimento validou

*   **Persona como restrição de interface**: usar personalidade no system prompt alterou a experiência, mas só funcionou bem quando a arquitetura continuou técnica por baixo.
*   **Memória curta suficiente para sessões objetivas**: histórico de conversa resolveu bem interações pequenas, especialmente quando combinado com respostas mais determinísticas.
*   **Tool use com dispatcher explícito**: a fronteira entre raciocínio e execução ficou mais legível quando as chamadas externas foram tratadas como contratos.

### Onde ele se encaixa hoje

Hoje o projeto faz mais sentido como material de referência para:

*   posts sobre boundaries em sistemas com agentes;
*   documentos de arquitetura ligados a runtime, tools e modularidade;
*   decisões sobre como este próprio site organiza conhecimento técnico.

O documento [Ronaldinho Architecture Overview](/documents/ronaldinho-architecture-overview/) continua disponível como nota complementar, mas a rota dedicada do projeto deixa de existir para reduzir ruído na arquitetura de informação.

### Decisão editorial

Quando algo funciona mais como estudo de caso do que como ativo principal de portfolio, a melhor estrutura é transformá-lo em publicação. Isso preserva contexto, melhora navegação e evita competir com projetos que hoje representam melhor minha direção atual.
