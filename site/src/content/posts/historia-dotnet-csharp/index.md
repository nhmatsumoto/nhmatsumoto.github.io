---
title: "Minha referência inicial sobre .NET e C#: origem, versões e chamadas HTTP"
description: "Começo a organizar minhas referências de .NET e C#: de onde vieram, como suas versões evoluíram e quais chamadas HttpClient uso para conversar com APIs HTTP."
domain: dotnet
kind: article
status: published
date: "2026-11-25"
readingTime: 10
hasMath: false
tags: [".NET", "C#", "história", "HttpClient", "HTTP"]
badges: ["referência", "introdução"]
tradeoffs: []
lessons: []
---

## 1. Contexto e problema

Quero começar este espaço pelo assunto que forma a base de boa parte do meu trabalho: .NET e C#. Para estudar e explicar essa stack com clareza, acho importante separar duas coisas que aparecem juntas no dia a dia, mas não significam o mesmo: **C# é uma linguagem; .NET é uma plataforma**.

O compilador transforma o código C# em uma representação intermediária. O runtime .NET executa a aplicação e fornece serviços e bibliotecas comuns. ASP.NET Core é um dos frameworks que uso como referência para desenvolver aplicações web sobre .NET.

Essa distinção também me ajuda a contar a história das duas: elas evoluíram próximas, mas cada uma tem seu próprio ciclo e seus próprios marcos. C# ainda é uma linguagem padronizada; a especificação não exige que toda implementação compatível use a plataforma Microsoft .NET.

## 2. Objetivo e restrições

Neste primeiro texto, reúno a origem do C# e do .NET, as pessoas e a empresa associadas à criação, e uma linha do tempo das versões até novembro de 2026. Organizei a linha do tempo em marcos: agrupei atualizações menores do .NET Framework para deixar a leitura mais fluida e destaquei os momentos que ajudam a entender a evolução da linguagem.

Também quero registrar chamadas de API, mas “API .NET” cobre milhares de tipos e métodos de áreas diferentes. Para este começo, escolhi um recorte que encontro com frequência em aplicações: `HttpClient` e as chamadas para fazer requisições HTTP. A tabela não pretende listar toda a plataforma; APIs de arquivos, coleções, banco de dados, tarefas e ASP.NET Core ficam para referências próprias.

## 3. Arquitetura e decisões

### De onde vêm C# e .NET

Quando volto à origem, encontro as duas tecnologias dentro da iniciativa .NET da Microsoft. A especificação de C# identifica **Anders Hejlsberg, Scott Wiltamuth e Peter Golde** como os principais inventores da linguagem. Hejlsberg é o nome mais associado à sua arquitetura; antes disso, ele participou de ferramentas e linguagens como Turbo Pascal e Delphi.

Há um marco que me ajuda a separar anúncio, implementação e chegada ao público: a primeira implementação de C# amplamente distribuída apareceu em julho de 2000; C# 1.0 foi lançado em janeiro de 2002, junto ao Visual Studio .NET 2002. A proposta era uma linguagem moderna, de propósito geral e orientada a objetos, apoiada por uma plataforma gerenciada.

Hoje, vejo a história como um projeto da Microsoft que também se desenvolve de forma aberta e recebe contribuições da comunidade. A linguagem, por sua vez, é padronizada pela ECMA e pela ISO. Para mim, essa diferença importa: a empresa mantém a plataforma e sua implementação principal, enquanto a especificação descreve a linguagem.

### Linha do tempo do .NET

Esta é a sequência de versões que uso para me orientar:

| Período | Versões | Marco |
| --- | --- | --- |
| 2002–2003 | .NET Framework 1.0 e 1.1 | Primeiras versões da plataforma Windows, com CLR, bibliotecas gerenciadas e ferramentas de desenvolvimento. |
| 2005–2008 | .NET Framework 2.0, 3.0 e 3.5 | Expansão da base de bibliotecas e dos frameworks de aplicação; 3.5 SP1 foi lançado em 2008. |
| 2010–2022 | .NET Framework 4.0 a 4.8.1 | Continuidade da linha voltada principalmente ao ecossistema Windows. A série 4.x passou por atualizações como 4.5, 4.6, 4.7 e 4.8.1. |
| 2016–2019 | .NET Core 1.0, 1.1, 2.0–2.2 e 3.0–3.1 | Nova linha modular, aberta e multiplataforma, com foco em Windows, Linux e macOS. |
| 2020 | .NET 5 | A linha .NET Core passou a se chamar .NET, reunindo a direção de desenvolvimento em uma plataforma unificada. |
| 2021 | .NET 6 (LTS) | Consolidação do ciclo anual de releases e suporte de longo prazo. |
| 2022 | .NET 7 (STS) | Release de suporte padrão, com ciclo mais curto que LTS. |
| 2023 | .NET 8 (LTS) | Release de suporte de longo prazo. |
| 2024 | .NET 9 (STS) | Continuidade do ciclo anual. |
| 2025 | .NET 10 (LTS) | Release LTS mais recente antes do .NET 11. |
| 2026 | .NET 11 (STS) | Release de novembro de 2026, seguindo o ciclo anual documentado pela Microsoft. |

Para mim, o ponto de virada dessa sequência é o .NET Core: a plataforma moderna passou a atender diferentes sistemas operacionais e a ter desenvolvimento aberto. Em 2020, a Microsoft retomou o nome .NET para a linha unificada. O .NET Framework continua relevante em aplicações existentes, enquanto a linha moderna e multiplataforma segue o ciclo atual de releases. “LTS” indica suporte de longo prazo; “STS”, suporte padrão. Quando escolho ou estudo uma versão, considero também o ciclo de suporte, as dependências e o ambiente de execução.

### Linha do tempo do C#

Ao acompanhar as versões de C#, gosto de observar como a linguagem foi ganhando recursos que reduzem código repetitivo, apoiam assincronia e dão mais opções para expressar as regras de um programa:

| Versão | Ano | Marco de linguagem |
| --- | --- | --- |
| C# 1.0 | 2002 | Classes, structs, interfaces, propriedades, eventos e delegates. |
| C# 1.2 | 2003 | Pequenos aprimoramentos, incluindo descarte em determinados usos de `foreach`. |
| C# 2.0 | 2005 | Generics, tipos anuláveis de valor, iteradores e métodos anônimos. |
| C# 3.0 | 2007 | LINQ, expressões lambda, tipos anônimos e métodos de extensão. |
| C# 4.0 | 2010 | `dynamic`, argumentos nomeados e opcionais, e variância em generics. |
| C# 5.0 | 2012 | `async` e `await` para programação assíncrona. |
| C# 6.0 | 2015 | Interpolação de strings, operador de propagação de nulo e membros com corpo de expressão. |
| C# 7.0–7.3 | 2017–2018 | Tuplas, pattern matching, funções locais e melhorias em `ref`. |
| C# 8.0 | 2019 | Tipos de referência anuláveis, streams assíncronos, índices e ranges. |
| C# 9.0 | 2020 | Records, `init` e top-level statements. |
| C# 10 | 2021 | `global using`, namespaces com escopo de arquivo e record structs. |
| C# 11 | 2022 | Raw string literals, membros `required` e recursos de generic math. |
| C# 12 | 2023 | Construtores primários e expressões de coleção. |
| C# 13 | 2024 | `params` com diferentes coleções, aprimoramentos de `lock` e tipos `ref struct`. |
| C# 14 | 2025 | Extension members e atribuição condicional com `?.`. |
| C# 15 | 2026 | Argumentos em expressões de coleção e union types, entre outros recursos. |

Essa evolução não acontece apenas no compilador. Algumas funcionalidades dependem de tipos ou comportamentos do runtime e das bibliotecas .NET. Por isso, ao abrir um projeto, também verifico o framework de destino: ele influencia a versão de C# escolhida por padrão e os recursos disponíveis.

## 4. Implementação e evidências

### Chamadas HTTP com `HttpClient`

Depois da linha do tempo, quero deixar uma referência prática. Quando uma aplicação .NET precisa conversar com um serviço HTTP, `HttpClient` oferece chamadas assíncronas para os verbos mais comuns. Para `POST`, `PUT` e `PATCH`, posso enviar um corpo representado por `HttpContent`. Quando preciso de outro verbo ou de mais controle, monto uma mensagem `HttpRequestMessage` e a envio com `SendAsync`.

| Operação HTTP | Chamada .NET | Uso típico |
| --- | --- | --- |
| GET | [`GetAsync(uri)`](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.getasync) | Obtém a resposta completa, incluindo status e headers. |
| GET | [`GetStringAsync(uri)`](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.getstringasync) | Obtém o corpo como texto. |
| GET | [`GetByteArrayAsync(uri)`](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.getbytearrayasync) | Obtém o corpo como bytes. |
| GET | [`GetStreamAsync(uri)`](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.getstreamasync) | Lê o corpo como stream, útil para conteúdo maior. |
| POST | [`PostAsync(uri, content)`](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.postasync) | Envia dados para processamento ou criação de recurso. |
| PUT | [`PutAsync(uri, content)`](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.putasync) | Envia a representação do recurso para substituição ou criação, conforme a API. |
| PATCH | [`PatchAsync(uri, content)`](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.patchasync) | Envia uma alteração parcial do recurso. |
| DELETE | [`DeleteAsync(uri)`](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.deleteasync) | Solicita a remoção de um recurso. |
| HEAD, OPTIONS ou método personalizado | [`SendAsync(request)`](https://learn.microsoft.com/en-us/dotnet/api/system.net.http.httpclient.sendasync) | Envia uma mensagem construída com `HttpRequestMessage` e `HttpMethod`. |

Para JSON, costumo preferir os helpers de `System.Net.Http.Json` quando eles atendem ao caso. Por exemplo, para ler uma lista de clientes com um `HttpClient` já configurado e reutilizado pela aplicação:

```csharp
using System.Net.Http.Json;

var clientes = await httpClient.GetFromJsonAsync<List<Cliente>>("v1/clientes");
```

Para enviar JSON, `PostAsJsonAsync` e `PutAsJsonAsync` também evitam a serialização manual do corpo nos cenários comuns. Ainda verifico o status da resposta e trato erros de acordo com o contrato do serviço. Como essas chamadas dependem de rede, uso APIs assíncronas e reutilizo o cliente ou recorro ao `IHttpClientFactory`, em vez de criar um `HttpClient` novo para cada requisição.

## 5. Operação e riscos

Ao transformar essas referências em código, levo alguns cuidados junto:

- **Versão do runtime não é versão da linguagem.** A versão padrão de C# depende do framework de destino e do SDK. Definir `LangVersion` manualmente para uma versão mais nova pode habilitar sintaxe que depende de tipos ou comportamentos ausentes no runtime de destino.
- **LTS e STS têm janelas diferentes.** Antes de iniciar ou atualizar um sistema, consulto a política de suporte. A versão mais nova não é automaticamente a escolha certa para toda aplicação.
- **Uma resposta HTTP não é só o corpo.** Também considero status, timeout, cancelamento, erros e respostas vazias; nos logs, evito registrar dados sensíveis.
- **`HttpClient` tem ciclo de vida.** Criar clientes sem controle a cada chamada pode causar problemas de conexão. Reutilizo instâncias ou uso `IHttpClientFactory`.
- **A tabela é um recorte intencional.** Ela registra operações comuns de `HttpClient`; não representa todas as classes e métodos que compõem .NET.

## 6. Resultado e próximos passos

Ao organizar esta primeira referência, consigo enxergar melhor a relação entre a linguagem que uso e a plataforma onde ela roda. C# nasceu dentro da iniciativa .NET da Microsoft e ganhou recursos de consulta, assincronia, pattern matching e expressões de coleção. O .NET, por sua vez, passou de uma linha centrada no Windows para uma plataforma aberta e multiplataforma, com releases anuais e faixas de suporte diferentes.

Este é o meu ponto de partida para falar de .NET e C#. Nos próximos textos, quero aprofundar a configuração de um projeto C#, o ciclo de vida de `HttpClient`, a construção de APIs com ASP.NET Core e as bibliotecas centrais da plataforma.

## Referências

- [História e versões da linguagem C# — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-version-history)
- [Introdução à especificação da linguagem C# — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/introduction)
- [Código-fonte e desenvolvimento do .NET — GitHub oficial do .NET](https://github.com/dotnet)
- [Histórico e dependências do .NET Framework — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/framework/install/versions-and-dependencies)
- [Ciclo de vida do .NET e .NET Core — Microsoft Learn](https://learn.microsoft.com/en-us/lifecycle/products/microsoft-net-and-net-core)
- [Ciclo de vida do .NET Framework — Microsoft Learn](https://learn.microsoft.com/en-us/lifecycle/products/microsoft-net-framework)
- [Releases, patches e suporte do .NET — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/releases-and-support)
- [Versões e compatibilidade de C# — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-versioning)
- [Fazer requisições HTTP com `HttpClient` — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient)
