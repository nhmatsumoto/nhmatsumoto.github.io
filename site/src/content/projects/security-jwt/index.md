---
title: "Security.Jwt"
description: "JWT Manager para .NET — rotação automática de chaves, suporte a JWKS e armazenamento seguro de chaves criptográficas."
status: "publicado"
stack: 
  - "C#"
  - ".NET"
  - "JWT"
  - "Cryptography"
  - "OAuth2"
tags: 
  - "fork"
repoUrl: "https://github.com/nhmatsumoto/Security.Jwt"
---

Fork do NetDevPack Security.Jwt — conjunto de componentes para gerenciamento completo de JWTs em aplicações .NET.

### Funcionalidades principais

*   **Rotação automática de chaves** — gera novas chaves de assinatura periodicamente sem downtime
*   **JWKS endpoint** — expõe `/.well-known/jwks` para validação distribuída de tokens
*   **Múltiplos algoritmos** — suporte a RSA, ECDSA e HMAC
*   **Armazenamento seguro** — chaves podem ser persistidas em banco de dados, filesystem ou Azure Key Vault
*   **Key revocation** — revogação de chaves comprometidas com propagação automática

### Por que rotação de chaves importa

Chaves de assinatura estáticas são um risco de segurança: se comprometidas, todos os tokens emitidos ficam vulneráveis. Rotação automática limita a janela de exposição e garante que tokens antigos expirem naturalmente.

### Uso no ecossistema

Referência direta para a implementação de autenticação nos projetos **User-Auth**, **Playground-FE** e **SplitCosts**. O padrão de JWKS é especialmente relevante em arquiteturas onde múltiplos serviços precisam validar tokens independentemente.

### Problema e solução

Gerenciar material criptográfico para JWTs é complexo: rotação, distribuição de chaves públicas, revogação e armazenamento seguro. Esta biblioteca encapsula essa complexidade em uma API simples e integrável com ASP.NET Core.

### Arquitetura

Middleware ASP.NET Core que gerencia o ciclo de vida de chaves criptográficas. Um background service rotaciona chaves periodicamente, enquanto um endpoint JWKS expõe as chaves públicas ativas para validação por serviços consumidores.
