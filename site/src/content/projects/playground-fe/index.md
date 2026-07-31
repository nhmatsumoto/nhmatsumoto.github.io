---
title: "Playground-FE"
description: "Frontend React/TypeScript com integração Keycloak — base para aplicações com controle de acesso."
status: "publicado"
stack: 
  - "React"
  - "TypeScript"
  - "Keycloak"
  - "OAuth2"
tags: 
  - "TypeScript"
repoUrl: "https://github.com/nhmatsumoto/Playground-FE"
---

Projeto frontend criado com React e TypeScript, com integração completa ao Keycloak para autenticação e autorização de usuários.

### Funcionalidades

*   **Login/Logout** via Keycloak com fluxo OAuth2/OIDC
*   **Token management** — refresh automático de access tokens
*   **Protected routes** — rotas que exigem autenticação
*   **Role-based UI** — componentes condicionais baseados em roles do Keycloak
*   **Silent refresh** — renovação de token sem interrupção da sessão

### Stack técnico

*   React com hooks e context API para state management
*   TypeScript para type safety em toda a aplicação
*   Keycloak JS adapter para integração com o identity provider
*   Vite como build tool

### Relação com o ecossistema

Este playground serve como base de autenticação para os frontends do **SplitCosts-FE** e outros projetos que precisam de controle de acesso. As decisões de integração com Keycloak testadas aqui são replicadas nos projetos de produção.

### Problema e solução

Integrar autenticação OAuth2/OIDC corretamente em SPAs tem armadilhas: PKCE, refresh silencioso, CORS, logout distribuído. Este playground isola a complexidade de autenticação para testar padrões antes de aplicá-los em projetos reais.

### Arquitetura

SPA React com Keycloak JS adapter inicializado no bootstrap da aplicação. O adapter gerencia o ciclo de vida dos tokens (access, refresh, id) e expõe um AuthContext para toda a árvore de componentes.
