---
title: "MapleBR"
description: "Projeto MapleBR — servidor e ferramentas para o ecossistema MapleStory."
status: "publicado"
stack: 
  - "Makefile"
  - "C++"
  - "Networking"
tags: 
  - "Makefile"
repoUrl: "https://github.com/nhmatsumoto/MapleBR"
---

Projeto de servidor e ferramentas para o universo MapleStory, com automação de build via Makefile.

### Contexto

MapleStory é um MMORPG que possui uma comunidade ativa de desenvolvimento de servidores privados. Este projeto reúne ferramentas, scripts de compilação e configurações para manutenção de um ambiente de servidor.

### Aspectos técnicos

*   **Build system** com Makefile para compilação de componentes C++
*   **Networking** — protocolo de comunicação cliente-servidor customizado
*   **Gestão de dados** — handling de arquivos de dados do jogo (WZ files)
*   **Automação** — scripts para deploy e manutenção do servidor

### Problema e solução

Servidores de jogos exigem compilação e configuração complexa de múltiplos componentes. O Makefile centraliza o processo de build e garante reprodutibilidade na construção do ambiente.

### Arquitetura

Servidor multi-threaded em C++ com protocolo de rede proprietário. O Makefile orquestra a compilação de módulos (login server, game server, channel server) e a preparação de dados estáticos do jogo.
