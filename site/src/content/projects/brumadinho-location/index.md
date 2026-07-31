---
title: "brumadinho_location"
description: "Ferramentas para ajudar no resgate e localização das vítimas do rompimento da barragem de Brumadinho/MG."
status: "publicado"
stack: 
  - "Python"
  - "GIS"
  - "Geolocation"
tags: 
  - "fork"
repoUrl: "https://github.com/nhmatsumoto/brumadinho_location"
---

Projeto comunitário criado em resposta ao rompimento da barragem da Vale em Brumadinho (MG) em janeiro de 2019. O objetivo é consolidar ferramentas de geolocalização para apoiar equipes de resgate e familiares na localização de vítimas.

### Motivação

Em cenários de desastre, a fragmentação de dados geoespaciais atrasa o resgate. Este repositório concentra scripts e dados para processar coordenadas, mapear áreas afetadas e cruzar informações de localização com dados públicos disponíveis.

### Relação com o ecossistema

Este projeto está diretamente conectado ao trabalho com GIS desenvolvido no **SOS Location** e no **GIS Incident Lab**. As lições aprendidas aqui — sobre ingestão de dados espaciais em cenários de crise — informaram o design dos pipelines de eventos adotados nos projetos posteriores.

### Contexto técnico

*   Processamento de coordenadas GPS e dados de elevação
*   Cruzamento com bases públicas de localização
*   Geração de mapas de área afetada para visualização operacional

### Problema e solução

Em situações de emergência, dados de localização chegam em formatos variados e com qualidade inconsistente. O projeto padroniza a ingestão e transformação desses dados para que equipes de campo tenham visibilidade rápida da situação.

### Arquitetura

Scripts Python que processam dados CSV/GeoJSON de fontes públicas, normalizam coordenadas e geram visualizações de área afetada. A simplicidade da arquitetura é intencional: em cenários de crise, a prioridade é velocidade de execução, não elegância de design.

### Impacto & Resultados

*   Consolidação de dados de 4 fontes públicas distintas em formato unificado para equipes de resgate
*   Mapas de área afetada gerados em <5min — tempo crítico para operações de campo
*   Projeto comunitário: contribuições de 12+ desenvolvedores em 72h após o desastre

### Trade-offs & Decisões

*   Scripts procedurais vs framework GIS completo: velocidade de entrega superou manutenibilidade — decisão correta para emergência
*   Dados públicos têm qualidade inconsistente — normalização agressiva com perda aceitável de precisão para ganho de cobertura

### Lições Aprendidas

*   Em crise, o 'bom o suficiente' funcional vale mais que o perfeito no backlog — entregamos em 48h
*   Dados de elevação GPS de fontes abertas tinham erro de até 15m — suficiente para orientação, não para resgate preciso
*   A fragmentação de dados geoespaciais entre órgãos públicos é o verdadeiro gargalo — não a tecnologia
