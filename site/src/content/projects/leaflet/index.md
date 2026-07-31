---
title: "Leaflet"
description: "Biblioteca JavaScript para mapas interativos mobile-friendly — referência para projetos GIS."
status: "publicado"
stack: 
  - "JavaScript"
  - "GIS"
  - "Maps"
  - "WebGL"
tags: 
  - "fork"
repoUrl: "https://github.com/nhmatsumoto/Leaflet"
---

Fork do Leaflet, a biblioteca JavaScript open-source mais utilizada para renderização de mapas interativos na web.

### Papel no ecossistema

Leaflet é a camada de visualização de mapas utilizada nos projetos **SOS Location**, **brumadinho_location** e **GIS Incident Lab**. Manter o fork permite:

*   Estudar internals de renderização de tiles e layers
*   Testar plugins customizados antes de integrar nos projetos
*   Avaliar performance com grandes volumes de marcadores

### Capacidades técnicas

*   **Tile layers** — suporte a múltiplos provedores (OpenStreetMap, Mapbox, etc.)
*   **GeoJSON** — renderização nativa de dados geoespaciais
*   **Markers e popups** — interação com pontos de interesse
*   **Layer control** — composição de camadas para visualização operacional
*   **Mobile-first** — touch events e gestos nativos

### Relevância para projetos de crise

Em projetos de resposta a desastres, a capacidade de renderizar milhares de pontos com performance e de funcionar offline (tile caching) é crítica para equipes de campo.

### Problema e solução

Mapas interativos na web precisam ser leves, rápidos e funcionar em dispositivos móveis de campo. Leaflet resolve isso com uma API minimalista e extensível, sem a complexidade de soluções como Google Maps ou Mapbox GL.

### Arquitetura

Biblioteca modular com core responsável por renderização de tiles, gerenciamento de layers e controle de viewport. Extensível via plugins que adicionam funcionalidades como clustering, heatmaps e draw tools.
