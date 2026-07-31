---
title: "ResponseMiddleware"
description: "Middleware de padronização de respostas HTTP para APIs .NET Core."
status: "publicado"
stack: 
  - "C#"
  - ".NET Core"
  - "Middleware"
  - "REST API"
tags: 
  - "C#"
repoUrl: "https://github.com/nhmatsumoto/ResponseMiddleware"
---

Middleware de padronização de respostas para APIs ASP.NET Core, complementar ao **nhmatsumoto.exception.middleware**.

### O que faz

Intercepta as respostas de controllers e as envolve em um envelope padronizado:

```json
{
  "success": true,
  "data": { ... },
  "errors": [],
  "metadata": {
    "timestamp": "2026-04-05T00:00:00Z",
    "requestId": "abc-123"
  }
}
```

### Benefícios

*   **Consistência** — todo endpoint retorna o mesmo formato, facilitando o consumo pelo frontend
*   **Metadata** — timestamps, request IDs e informações de paginação são adicionados automaticamente
*   **Error wrapping** — erros de validação são formatados no mesmo envelope
*   **Transparência** — controllers continuam retornando objetos simples, o middleware cuida do envelope

### Uso combinado

Funciona em conjunto com o **exception middleware**: enquanto o exception middleware trata exceções não capturadas, o response middleware padroniza todas as respostas (sucesso e erro controlado).

### Problema e solução

APIs sem padronização de respostas forçam o frontend a tratar cada endpoint de forma diferente. O envelope consistente resolve isso, permitindo que o cliente tenha uma única lógica de parsing para todas as chamadas.

### Arquitetura

Middleware registrado após o exception middleware no pipeline ASP.NET Core. Intercepta o response body via stream wrapping, deserializa o conteúdo original e re-serializa dentro do envelope padronizado.
