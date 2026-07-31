---
title: "macos"
description: "macOS virtualizado dentro de um container Docker — experimentação com virtualização de sistemas operacionais."
status: "publicado"
stack: 
  - "Docker"
  - "QEMU"
  - "KVM"
  - "macOS"
tags: 
  - "fork"
repoUrl: "https://github.com/nhmatsumoto/macos"
---

Fork do projeto que permite executar macOS dentro de um container Docker, utilizando QEMU/KVM para virtualização.

### Motivação

Desenvolvimento cross-platform frequentemente exige testar em macOS sem ter acesso a hardware Apple. Este projeto permite criar ambientes macOS efêmeros para:

*   Testes de compatibilidade de aplicações
*   Build de projetos iOS/macOS em CI/CD Linux
*   Experimentação com APIs exclusivas do macOS

### Como funciona

O container utiliza QEMU com aceleração KVM para virtualizar o hardware necessário, incluindo emulação de dispositivos Apple. A imagem do macOS é carregada de um disco virtual dentro do container.

### Considerações

A virtualização de macOS está sujeita aos termos de licenciamento da Apple (EULA), que restringe a execução a hardware Apple genuíno. Este fork é mantido para estudo da tecnologia de virtualização, não para uso em produção.

### Problema e solução

Desenvolvedores que trabalham em Linux/Windows mas precisam testar em macOS enfrentam um gap de acesso. A virtualização via Docker reduz a fricção ao criar ambientes macOS descartáveis, embora com limitações de performance e licenciamento.

### Arquitetura

Container Docker com QEMU como hypervisor, KVM para aceleração de hardware e passthrough de GPU quando disponível. A imagem macOS é montada como disco virtual QCOW2 dentro do container.
