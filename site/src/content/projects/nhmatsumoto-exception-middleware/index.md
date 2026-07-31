---
title: "nhmatsumoto.exception.middleware"
description: "GlobalExceptionMiddleware para .NET Core — tratamento centralizado de exceções em APIs."
status: "publicado"
stack: 
  - "C#"
  - ".NET Core"
  - "Middleware"
  - "REST API"
tags: 
  - "C#"
repoUrl: "https://github.com/nhmatsumoto/nhmatsumoto.exception.middleware"
---

Middleware de tratamento global de exceções para aplicações ASP.NET Core, projetado para padronizar respostas de erro em APIs REST.

### O que faz

Intercepta todas as exceções não tratadas no pipeline de requisições e as converte em respostas HTTP padronizadas:

*   **Exceções de domínio** → 400 Bad Request com mensagem específica
*   **Exceções de validação** → 422 Unprocessable Entity com detalhes
*   **Exceções de autenticação** → 401/403 com contexto
*   **Exceções não mapeadas** → 500 Internal Server Error com ID de correlação

### Por que um middleware dedicado

Sem tratamento centralizado, cada controller precisa implementar seus próprios try/catch, levando a inconsistências na formatação de erros e duplicação de lógica de logging. O middleware garante:

*   Formato consistente (RFC 7807 Problem Details)
*   Log estruturado com correlation ID
*   Supressão de stack traces em produção
*   Extensibilidade via mapeamento de tipos de exceção

### Uso no ecossistema

Utilizado nos backends do **SplitCosts**, **Financial** e outros projetos .NET como pacote reutilizável.

### Problema e solução

APIs sem tratamento centralizado de erros vazam detalhes internos, retornam formatos inconsistentes e dificultam o debugging. O middleware resolve isso com um ponto único de interceptação que padroniza todas as respostas de erro.

### Arquitetura

Middleware ASP.NET Core registrado no início do pipeline (app.UseMiddleware). Utiliza um dicionário de mapeamento Exception Type → HTTP Status Code, extensível via configuração. Integra com ILogger para log estruturado.
