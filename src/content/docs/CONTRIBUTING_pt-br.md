---
title: "Contributing Guide"
pubDate: 2026-03-12
description: "Guidelines for contributing to the Ronaldinho-Agent repository."
tags: ["Contributing", "Community"]
---

# Contribuindo para o Ronaldinho-Agent 🚀

> [!IMPORTANT]
> **Aviso de Codinome**: "Ronaldinho-Agent" é atualmente um codinome do projeto. Nenhuma marca ou nome oficial foi estabelecido ainda.

[Read this guide in English (EN)](../../CONTRIBUTING.md)

Estamos animados com o seu interesse em contribuir para o Ronaldinho-Agent! Como um ecossistema autônomo construído sobre governança e performance rigorosas, valorizamos contribuições determinísticas de alta qualidade.

## 🛠️ Como Contribuir

1. **Fork do Repositório**: Crie sua própria cópia do projeto.
2. **Clone Localmente**: Trabalhe em seu ambiente local.
3. **Crie uma Branch**: Use nomes descritivos como `feature/new-skill` ou `fix/auth-bug`.
4. **Siga a Governança**:
   - Garanta que todas as ações sejam registradas em JSONL.
   - Crie TaskSpecs para mudanças significativas.
   - Se uma tarefa manual for repetida duas vezes, automatize-a em `dev_scripts/` ou `.toolbox/`.
5. **Teste Localmente**: Ronaldinho é um agente "Local-Only". Garanta que suas mudanças não exijam APIs externas não autorizadas.
6. **Envie um Pull Request**: Descreva suas mudanças claramente usando nosso modelo de PR.

## 💂️ Segurança em Primeiro Lugar

- **Nunca** envie chaves de API ou configurações sensíveis.
- Limpe os logs antes do envio.
- Todo código deve respeitar os padrões do `SecurityGuard`.

## 🤝 Padrões da Comunidade

Seja respeitoso e profissional. Estamos construindo o futuro da engenharia autônoma juntos!
