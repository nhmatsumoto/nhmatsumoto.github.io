---
title: "Java-Servlet-Pages"
description: "Aplicação web com Java Servlets e JSP — fundamentos de desenvolvimento web no ecossistema Java."
status: "publicado"
stack: 
  - "Java"
  - "Servlets"
  - "JSP"
  - "Tomcat"
tags: 
  - "Java"
repoUrl: "https://github.com/nhmatsumoto/Java-Servlet-Pages"
---

Projeto de estudo de desenvolvimento web com Java Servlets e JavaServer Pages (JSP), utilizando Apache Tomcat como container.

### Conceitos cobertos

*   **Ciclo de vida de Servlets** — init, service, destroy
*   **Requisições HTTP** — tratamento de GET, POST, redirecionamento e forwarding
*   **Sessões e cookies** — gerenciamento de estado entre requisições
*   **Filtros** — interceptação e processamento de requisições antes de chegar ao servlet
*   **Padrão MVC** — separação entre model (JavaBeans), view (JSP) e controller (Servlets)

### Contexto

Embora frameworks modernos como Spring Boot abstraiam a maioria desses conceitos, entender Servlets é fundamental para compreender como o ecosistema web Java funciona por baixo. Todo o Spring MVC é construído sobre a Servlet API.

### Problema e solução

Frameworks modernos abstraem demais os fundamentos de HTTP no Java. Este projeto expõe diretamente a Servlet API para construir entendimento sólido de como requisições são processadas antes de trabalhar com abstrações de alto nível.

### Arquitetura

Aplicação web tradicional Java EE: web.xml para configuração de servlets e filtros, JSP para renderização de views, JavaBeans como modelos de dados. Deployada como WAR no Apache Tomcat.
