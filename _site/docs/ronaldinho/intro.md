---
title: Introdução
description: O que é o Ronaldinho Agent?
---

# O Fenômeno da Autonomia 🚀

O **Ronaldinho Agent** é um ecossistema de engenharia de software autônomo projetado para alta performance, segurança local e auto-evolução. Inspirado no framework **OpenClaw**, ele separa a inteligência (Neural Core) da interface (Bridge/Dashboard).

### Visão Geral

Diferente de wrappers simples de LLM, o Ronaldinho é um **Engenheiro de Execução**. Ele observa o ambiente, decide quais ferramentas usar e executa tarefas diretamente no seu sistema operacional com a precisão de um especialista.

### Pilares Fundamentais

1.  **Independência de Modelo**: Não fique preso a uma API. Use o que houver de melhor no mercado ou modelos locais.
2.  **Segurança Determinística**: Execução em "Lanes" seriais que evitam condições de corrida e corrupção de arquivos.
3.  **Resiliência**: Fallback automático para o modo navegador (**Ghost Mode**) se as cotas de API acabarem.
4.  **Auto-Evolução**: Ronaldinho pode criar arquivos `.agent/skills/` para expandir suas próprias capacidades.

### Fluxo de Trabalho

Quando você envia uma missão via **Telegram** ou pelo **Dashboard**:
- O **Neural Bridge** encaminha para o **Neural Core**.
- O **Orquestrador** detecta a melhor **Persona (TOON)**.
- O Agente analisa as **Skills** disponíveis.
- A execução acontece dentro de uma **Execution Lane** segura.

---

[Próximo passo: Instalação →](/guides/installation/)
