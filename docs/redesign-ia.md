# Arquitetura de Informação - Redesign do nhmatsumoto.github.io

> Documento de IA produzido **antes de qualquer tela**. Decisão de estrutura primeiro;
> Figma/código depois. Fundamentado no conteúdo real do repositório (125 artigos, 33 projetos,
> 5 documentos, site trilíngue pt-BR/en-US/ja-JP).

**Produto:** caderno técnico de engenharia ("engineering notebook") do Hiro Matsumoto.
**Usuários:** (1) engenheiros/pares chegando de busca ou link direto a um artigo; (2) recrutadores/tech leads avaliando profundidade; (3) o próprio autor usando como memória de trabalho.
**Ação primária a completar:** *encontrar e ler o artigo técnico certo* - e, a partir dele, descobrir mais (artigo relacionado, projeto, documento) ou conectar.

---

## 1. Inventário de conteúdo (por frequência de uso)

### Alta frequência - toda visita
| O que o usuário faz | Onde mora hoje |
|---|---|
| Ler **um artigo** técnico (corpo, código, matemática) | `/posts/<slug>/` |
| Escanear **artigos recentes / em destaque** | home |
| **Buscar** por tema/palavra-chave | command palette (⌘K) |
| **Trocar idioma** (PT / EN / JA) | toggle global |
| **Trocar tema** (claro / escuro) | toggle global |
| **Copiar bloco de código** | dentro do artigo |

### Frequência média - visita exploratória
| O que o usuário faz | Onde mora hoje |
|---|---|
| Filtrar/navegar **por tema** (arquitetura, .NET, IA, DDD, GIS…) | índice de posts (fraco hoje) |
| Seguir **posts relacionados** ao fim do artigo | rodapé do artigo |
| Explorar um **projeto** (repo, stack, status, roadmap) | `/projects/<slug>/` |
| Ler um **documento** técnico (ADR, arquitetura) | `/documents/<slug>/` |
| Ver **série/cluster** (ex.: `sos-location`, 48 posts) | inexistente hoje |

### Baixa frequência - pontual / uma vez
| O que o usuário faz | Onde mora hoje |
|---|---|
| Entender **quem é o autor** | `/about/` |
| **Conectar** (GitHub, LinkedIn, e-mail) | about / contato / footer |
| Assinar **RSS/feed** | `/feed.xml` |
| Ver **atividade** (daily notes geradas de commits) | `/daily/` |
| Achar um post antigo específico | arquivo / busca |

**Insight de inventário:** o site tem 4 tipos de conteúdo (posts, projetos, documentos, daily) tratados como 4 silos de mesmo peso no menu - mas **~95% do valor e do tráfego está em "ler um artigo"**. A IA atual distribui atenção de forma plana; o redesign precisa subordinar tudo ao ato de ler e descobrir artigos.

---

## 2. Hierarquia de navegação (máx. 2–3 níveis, vocabulário do usuário)

### Problema de vocabulário (corporativo → real)
| Rótulo atual | Como o usuário pensa | Decisão |
|---|---|---|
| **publicações** | "artigos", "textos", "posts", "blog" | → **Artigos** |
| **documentos** | "notas", "docs técnicos", "ADRs" | → **Notas** (subtítulo: docs & ADRs) |
| **daily** | "atividade", "o que ele anda fazendo" | mover p/ rodapé + perfil; **fora do menu principal** |
| **projetos** | "projetos", "repositórios", "sistemas" | mantém **Projetos** |
| **sobre / contato** | "quem é", "como falar com ele" | fundir em **Sobre** (com contato dentro) |

> "Publicações" carrega um tom acadêmico/corporativo que não bate com como leitores técnicos buscam ("artigo sobre CQRS", "post de DDD"). "Documentos" e "daily" são jargão interno do sistema, não do leitor.

### Estrutura proposta (2 níveis)
```
Nível 0 (global, sempre visível): Logo · [Artigos] [Projetos] [Notas] [Sobre] · Buscar(⌘K) · Idioma · Tema

Nível 1 - Artigos  (/posts/)
  └─ filtros por Tema · Idioma · Tempo de leitura · Recência
  └─ Nível 2: Artigo individual (/posts/<slug>/)
        └─ relacionados · projeto/nota vinculados · série

Nível 1 - Projetos (/projects/)
  └─ filtros por Status · Stack · Tags
  └─ Nível 2: Projeto individual (/projects/<slug>/)  → repo, stack, roadmap, posts ligados

Nível 1 - Notas (/documents/)
  └─ agrupadas por categoria (arquitetura, agentes, APIs…)
  └─ Nível 2: Nota individual (/documents/<slug>/)

Nível 1 - Sobre (/about/)
  └─ perfil + contato + idiomas + feed/RSS + daily (atividade)
```

**Regra:** menu principal nunca passa de **4 destinos + busca**. Tudo abaixo é filtro ou detalhe, nunca novo item de menu.

---

## 3. Fluxos primários (entrada → objetivo concluído)

### Fluxo A - Leitura vinda de busca externa *(maior volume)*
1. Usuário busca no Google → cai direto em `/posts/<slug>/`
2. Lê o artigo (sem ter passado pela home)
3. **Vê no topo: "onde estou" (breadcrumb tema) + idioma do conteúdo**
4. Ao fim, encontra **2–3 relacionados** + projeto/nota vinculados
5. ✅ Clica em outro artigo → vira leitor de 2+ páginas (objetivo: profundidade de sessão)

### Fluxo B - Explorador por tema
1. Entra pela **home**
2. Escolhe um **tema** (Arquitetura, .NET, IA/Agentes, DDD, GIS…)
3. Vê **lista filtrada** com tempo de leitura e idiomas disponíveis
4. Abre o artigo
5. ✅ Lê e segue para relacionado/série

### Fluxo C - Avaliação por recrutador / tech lead *(maior impacto de negócio)*
1. Entra pela home ou por `/about/`
2. Lê **Sobre** (quem é, foco, snapshot)
3. Vai a **Projetos** → abre 1–2 projetos âncora (ex.: SOS-Location)
4. Confere stack/roadmap → segue para o **repo** ou para artigos do projeto
5. ✅ **Conecta** (LinkedIn / GitHub / e-mail)

### Fluxo D - Leitor recorrente
1. Entra pela home
2. Vê **"recentes / novo desde sua última visita"**
3. ✅ Abre o último artigo

### Fluxo E - Pesquisador profundo
1. Está num artigo
2. Segue link para uma **Nota** (ADR/arquitetura) ou **série** (`sos-location`)
3. Cruza com o **Projeto** correspondente
4. ✅ Sai com modelo mental completo de um sistema

---

## 4. Pontos de fricção antecipados (onde o usuário abandona)

1. **Entrada órfã (Fluxo A).** 95% das visitas caem num artigo sem contexto do site. Se não houver "o que é isto / mais como isto / idioma", o usuário lê e sai (bounce de 1 página). *Causa: artigo desenhado como folha isolada, sem ancoragem ao todo.*

2. **Descompasso de idioma.** Conteúdo é pt-BR primário; leitor EN/JA chega e ou não há tradução, ou o toggle troca a UI mas não avisa que *aquele* artigo não está traduzido. *Causa: idioma da UI ≠ idioma do conteúdo; estado não comunicado.*

3. **Parede de 125 artigos sem filtro real.** No índice, sem filtro por tema/tempo/idioma, o usuário rola uma lista cronológica longa e desiste de achar o relevante. *Causa: taxonomia existe nas tags mas não vira navegação.*

4. **Rótulos ambíguos no menu.** "Publicações", "Documentos", "Daily" não dizem ao leitor o que há atrás. Ele não clica no que não entende → seções inteiras ficam invisíveis. *Causa: vocabulário do sistema, não do usuário (ver §2).*

> Quarto ponto crítico priorizado, mas vale registrar o 5º latente: **ergonomia de leitura longa no mobile** (largura de medida, código com scroll horizontal, toggles fora de alcance do polegar).

---

## 5. Taxonomia de conteúdo (achar em < 3 cliques)

### Categorias (temas - derivadas das tags reais)
Agrupar as ~40 tags soltas em **7 temas** estáveis:

| Tema (rótulo do usuário) | Tags reais que absorve |
|---|---|
| **Arquitetura & Sistemas** | arquitetura, architecture, distributed_systems, microservices, scalability, consistencia, trade-offs |
| **.NET & Backend** | dotnet, csharp, backend, api, performance, design-patterns |
| **IA & Agentes** | ia, agentes, simulacao |
| **DDD & Modelagem** | ddd, modelagem, produto |
| **Dados & GIS** | gis, mapa, dados, sos-location, sos |
| **Frontend** | frontend, flutter |
| **Carreira & Cultura** | engenharia, história, operacoes, pagamentos, daily |

### Labels / metadados por item
- **Tipo**: Artigo · Projeto · Nota (filtro transversal na busca)
- **Idiomas disponíveis**: PT · EN · JA (badge no card e no índice)
- **Tempo de leitura**: por idioma
- **Série**: ex. `sos-location` (48 posts) e `daily` (45) viram **coleções navegáveis**, não tags soltas
- **Status** (projetos): ativo / arquivado / fork
- **Stack** (projetos): chips filtráveis

### Filtros mínimos para < 3 cliques
- Índice de Artigos: **[Tema] [Idioma] [Recência]** (≤ 2 cliques até a lista certa, +1 para abrir)
- Busca global ⌘K: cross-type, com filtro por **Tipo** e por **Tema**
- Em todo artigo de série: chip "Ver série completa →"

---

## 6. Mapa de telas (nome · função · telas adjacentes)

| # | Tela | Função | Adjacências |
|---|---|---|---|
| T1 | **Home / Notebook** | Orientar: quem é, recentes, atalhos por tema, projeto âncora | → Artigos, Projetos, Sobre, Artigo |
| T2 | **Artigo (detalhe)** | Ler conteúdo longo + código + relacionados | ← busca/índice/externo · → relacionado, série, projeto/nota, Tema |
| T3 | **Índice de Artigos** | Descobrir por tema/idioma/recência | → Artigo · ← Home |
| T4 | **Busca (overlay ⌘K)** | Achar qualquer coisa cross-type | sobreposta a qualquer tela |
| T5 | **Projeto (detalhe)** | Avaliar sistema: stack, status, roadmap, repo, artigos ligados | ← Índice projetos · → repo, Artigo |
| T6 | **Índice de Projetos** | Listar/ filtrar sistemas | → Projeto · ← Home |
| T7 | **Sobre + Contato** | Quem é, foco, snapshot, links de conexão, RSS, atividade | → GitHub/LinkedIn/e-mail · ← Home |
| T8 | **Nota (detalhe)** | Ler doc técnico/ADR | ← Índice notas · → Artigo/Projeto ligado |
| T9 | **Índice de Notas** | Listar docs por categoria | → Nota · ← Home |
| T10 | **Série/Coleção** | Agrupar posts de um tema-âncora (sos-location, daily) | → Artigo · ← Artigo/Tema |
| T11 | **Daily / Atividade** | Log auto-gerado (baixa prioridade, vive sob Sobre) | ← Sobre |
| T12 | **404 / Redirects** | Recuperar de URL legada/quebrada | → Home, Busca |

---

## 7. Priorização por impacto (o que desenhar primeiro)

Ordenado por **volume de uso × impacto no objetivo de negócio**:

| Prioridade | Tela(s) | Por quê |
|---|---|---|
| **P0 - primeiro** | **T2 Artigo** | Maior volume absoluto; toda entrada de busca termina aqui; é o ativo de SEO e a 1ª impressão real. Resolver fricções 1 e 2 aqui rende mais que qualquer outra tela. |
| **P1** | **T1 Home** + **T3 Índice de Artigos** com taxonomia (§5) | Hub de orientação + descoberta; ataca fricções 3 e 4. Sem isto o Artigo continua órfão. |
| **P2** | **T4 Busca ⌘K** | Caminho mais rápido para a ação primária; alavanca a taxonomia nova. |
| **P3** | **T5/T6 Projetos** | Núcleo do Fluxo C (recrutador) - maior impacto de negócio, menor volume. |
| **P4** | **T7 Sobre + Contato** | Conversão (conectar); pontual mas decisiva no Fluxo C. |
| **P5 - depois** | **T8/T9 Notas, T10 Série, T11 Daily** | Cauda longa; alto valor para o pesquisador profundo, baixo volume. T10 (série) sobe se `sos-location` virar vitrine. |

**Sequência recomendada de design/implementação:**
`T2 → T1 + T3 (com §5) → T4 → T5/T6 → T7 → resto`.

---

## Próximo passo
Este é o nível "arquitetura". Antes de tocar nos templates (`scripts/engine/renderer/`) e no CSS,
o próximo entregável seria o **wireframe de baixa fidelidade do T2 (Artigo)** - a tela P0 -
resolvendo as fricções 1, 2 e 4 com a nova navegação e taxonomia.
