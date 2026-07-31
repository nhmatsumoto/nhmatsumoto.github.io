---
title: "User-Auth"
description: "Serviço de autenticação em TypeScript — gestão de usuários, sessões e integração com identity providers."
status: "publicado"
stack: 
  - "TypeScript"
  - "Node.js"
  - "JWT"
  - "OAuth2"
tags: 
  - "TypeScript"
repoUrl: "https://github.com/nhmatsumoto/User-Auth"
---

Serviço de autenticação e autorização em TypeScript/Node.js, projetado para gerenciar usuários, sessões e integração com provedores de identidade.

### Funcionalidades

*   **Registro e login** — criação de contas com validação de email
*   **JWT management** — emissão e validação de access/refresh tokens
*   **Session management** — controle de sessões ativas com revogação
*   **OAuth2 integration** — login via provedores externos (Keycloak, Google)
*   **Role-based access** — controle de permissões por papel do usuário

### Relação com o ecossistema

Componente de autenticação que complementa:

*   **Playground-FE** — frontend de teste para fluxos de auth
*   **Security.Jwt** — biblioteca de referência para gerenciamento de chaves JWT
*   **SplitCosts** — autenticação de produção via Keycloak

### Decisões de design

*   Tokens de curta duração (15min access) com refresh transparente
*   Hashing de senhas com bcrypt (cost factor 12)
*   Rate limiting em endpoints de autenticação
*   Audit log de eventos de segurança (login, logout, failed attempts)

### Problema e solução

Autenticação é um componente crítico que precisa ser implementado corretamente desde o início. Este serviço isola a complexidade de auth (hashing, tokens, sessões) em um módulo dedicado e testado.

### Arquitetura

API Node.js/TypeScript com endpoints REST para auth. JWT para stateless authentication, com refresh tokens armazenados em banco para revogação. Middleware de autenticação exportável como pacote para outros serviços.
