import { component$ } from "@builder.io/qwik";
import { topicSlug } from "../../lib/content/knowledge";

const lessons = [
  [
    "Arrays",
    "Um array guarda uma sequência ordenada em posições contíguas de memória. O índice dá acesso direto em O(1), mas inserir ou remover no meio pode exigir deslocar vários elementos e custar O(n). Arrays são úteis quando a quantidade de itens é conhecida ou quando precisamos percorrer os dados em ordem.",
    "Em [4, 8, 2], o índice 1 contém 8. Inserir 6 entre 4 e 8 desloca os outros valores.",
    "flowchart LR\n  A[\"índice 0: 4\"] --> B[\"índice 1: 8\"] --> C[\"índice 2: 2\"]"
  ],
  [
    "Strings",
    "Uma string representa texto como uma sequência de caracteres. Ela pode ser percorrida por posição, comparada ou dividida em partes. Em muitas linguagens é imutável, por isso concatenar em um laço pode criar cópias sucessivas e custar O(n²). Para muitas junções, prefira um buffer ou lista e faça a junção ao final.",
    "Para inverter 'sol', leia as posições 2, 1 e 0, produzindo 'los'.",
    "flowchart LR\n  A[\"s\"] --> B[\"o\"] --> C[\"l\"]\n  C -. inverter .-> D[\"l\"] --> E[\"o\"] --> F[\"s\"]"
  ],
  [
    "Hash maps",
    "Um mapa hash guarda pares chave-valor. A função hash transforma a chave em uma posição de armazenamento, permitindo busca, inserção e remoção em O(1) médio. Colisões acontecem quando chaves diferentes chegam à mesma posição e precisam ser tratadas. A ordem dos itens pode não ser garantida.",
    "Ao ler a palavra 'ana', consulte e atualize mapa['ana']. Depois de três ocorrências, o valor armazenado é 3.",
    "flowchart LR\n  A[\"chave: ana\"] --> B[\"hash(ana)\"] --> C[\"posição 4\"] --> D[\"valor: 3\"]"
  ],
  [
    "Two pointers",
    "A técnica mantém dois índices sobre uma sequência, avançando-os conforme o resultado parcial. Em um array ordenado, é comum colocar um ponteiro em cada ponta. A soma pequena demais faz avançar o da esquerda, e a soma grande demais faz recuar o da direita. Um percurso linear reduz O(n²) para O(n).",
    "Em [1, 2, 4, 7], procure soma 6. 1+7=8, recue a direita; 1+4=5, avance a esquerda; 2+4=6.",
    "flowchart LR\n  A[\"1 L\"] --- B[\"2\"] --- C[\"4\"] --- D[\"7 R\"]\n  D -. soma 8 .-> E[\"move R\"]"
  ],
  [
    "Sliding window",
    "Uma janela deslizante representa um intervalo contíguo. Em vez de recalcular tudo ao mover a janela, removemos a contribuição que saiu e somamos a que entrou. Para janela de tamanho fixo, o percurso costuma ser O(n). Para condições variáveis, expandimos e contraímos os limites mantendo uma invariável.",
    "A maior soma de 3 itens em [2, 1, 5, 1] é max(2+1+5, 1+5+1)=8.",
    "flowchart LR\n  A[\"2\"] --- B[\"1\"] --- C[\"5\"] --- D[\"1\"]\n  A -. janela 1 .-> C"
  ],
  [
    "Stacks",
    "Pilha segue LIFO, último a entrar é o primeiro a sair. push adiciona no topo e pop remove o topo, ambos em O(1). É usada para chamadas de função, desfazer ações, validar parênteses e implementar busca em profundidade. A pilha pode crescer até consumir memória, então problemas profundos podem exigir uma versão iterativa.",
    "Empilhe A e depois B. O topo é B, então a próxima operação pop devolve B.",
    "flowchart TB\n  B[\"topo: B\"] --> A[\"A\"]"
  ],
  [
    "Queues",
    "Fila segue FIFO, primeiro a entrar é o primeiro a sair. Enqueue adiciona ao fim e dequeue remove do início. Com implementação por lista ligada ou buffer circular, as duas operações custam O(1). É adequada para processar tarefas por chegada e para busca em largura.",
    "Enfileire A e depois B. A sai primeiro, embora B esteja mais perto da entrada.",
    "flowchart LR\n  A[\"saída: A\"] --> B[\"B\"] --> C[\"entrada\"]"
  ],
  [
    "Binary search",
    "Busca binária exige dados ordenados. Compara o alvo ao elemento central e descarta a metade que não pode conter a resposta. O intervalo restante cai pela metade em cada passo, dando O(log n). Para evitar erros, use limites consistentes e cuidado com overflow ao calcular o meio.",
    "Em [2, 5, 8, 12, 16], procure 12. O meio é 8, então descarte a esquerda e depois encontre 12.",
    "flowchart TD\n  A[\"2 5 8 12 16\"] --> B{\"meio 8 < 12\"}\n  B --> C[\"12 16\"] --> D[\"12 encontrado\"]"
  ],
  [
    "Linked lists",
    "Lista ligada é formada por nós com valor e referência ao próximo. Inserir ou remover é O(1) quando já temos o nó anterior, mas procurar um elemento por posição é O(n), pois percorremos a lista. Listas duplamente ligadas guardam também referência ao anterior, com maior custo de memória.",
    "A → B → C. Para remover B, altere next de A para apontar a C.",
    "flowchart LR\n  A[\"A\"] --> B[\"B\"] --> C[\"C\"]\n  A -. após remover B .-> C"
  ],
  [
    "Recursion",
    "Recursão resolve um problema chamando a mesma função para uma entrada menor. Toda recursão precisa de caso base e de progresso em direção a ele. Cada chamada ocupa a pilha de execução, então profundidade grande pode causar estouro. Uma versão iterativa pode economizar essa memória.",
    "fatorial(4)=4×fatorial(3), que continua até fatorial(1)=1. Os resultados retornam em ordem inversa.",
    "flowchart TD\n  A[\"fatorial(4)\"] --> B[\"4 × fatorial(3)\"] --> C[\"3 × fatorial(2)\"] --> D[\"caso base: 1\"]"
  ],
  [
    "Binary trees",
    "Árvore binária é uma estrutura hierárquica em que cada nó tem até dois filhos. Em uma árvore de busca, valores menores costumam ficar à esquerda e maiores à direita. Busca, inserção e remoção custam O(h), sendo h a altura. Balanceamento mantém h próximo de log₂(n); uma árvore inclinada pode chegar a O(n).",
    "Na árvore de busca cuja raiz é 8, para encontrar 3 seguimos à esquerda e comparamos com 3.",
    "flowchart TD\n  A((8)) --> B((3))\n  A --> C((10))\n  B --> D((1))\n  B --> E((6))"
  ],
  [
    "Heaps",
    "Heap binário é uma árvore quase completa que preserva uma regra de ordem entre pai e filhos. No min-heap, pai ≤ filhos, então o mínimo está na raiz. Inserção sobe o elemento até restaurar a regra. Remover a raiz troca-a pelo último elemento e o desce. Ambas operações custam O(log n).",
    "Inserir 2 em um min-heap [5, 7] coloca 2 na raiz após subir e trocar com 5.",
    "flowchart TD\n  A((2)) --> B((5))\n  A --> C((7))"
  ],
  [
    "Priority queues",
    "Fila de prioridade sempre expõe o item mais urgente ou mais importante. Um heap permite consultar a prioridade extrema em O(1) e inserir ou remover em O(log n). Defina claramente se prioridade maior significa mais urgente e como desempatar valores iguais.",
    "Tarefas com prioridade 2, 1 e 3 são removidas na ordem 3, 2, 1 quando o maior valor vence.",
    "flowchart TD\n  A[\"próxima: prioridade 3\"] --> B[\"prioridade 2\"] --> C[\"prioridade 1\"]"
  ],
  [
    "Sorting algorithms",
    "Ordenação rearranja dados segundo uma relação, como números crescentes. Insertion sort é simples e pode ser O(n²), mas funciona bem em entradas pequenas ou quase ordenadas. Merge sort divide e intercala em O(n log n), usando memória extra. Quicksort é O(n log n) médio e O(n²) no pior caso. Escolha considerando estabilidade, memória e distribuição dos dados.",
    "Ordenar [4, 1, 3]: compare e coloque 1 antes, depois insira 3 entre 1 e 4, resultando [1, 3, 4].",
    "flowchart TD\n  A[\"4 1 3\"] --> B[\"1 4 3\"] --> C[\"1 3 4\"]"
  ],
  [
    "BFS",
    "Busca em largura explora primeiro os vizinhos mais próximos da origem. Uma fila mantém a fronteira e um conjunto de visitados evita ciclos e duplicação. Em grafo com lista de adjacência, custa O(V+E). Em grafos sem pesos, a primeira chegada a cada vértice fornece o caminho com menos arestas.",
    "Partindo de A, visita A, depois todos os vizinhos B e C, e só então D e E.",
    "flowchart TD\n  A((A)) --> B((B))\n  A --> C((C))\n  B --> D((D))\n  C --> E((E))"
  ],
  [
    "DFS",
    "Busca em profundidade segue um vizinho até não poder avançar e então retrocede. Pode ser implementada com recursão ou pilha explícita. Com lista de adjacência custa O(V+E). Serve para componentes, ciclos e ordenação topológica, mas não garante caminho mínimo em grafo geral.",
    "Uma ordem possível começando em A é A, B, D, voltar a A e então C, E.",
    "flowchart TD\n  A((A)) --> B((B)) --> D((D))\n  A --> C((C)) --> E((E))"
  ],
  [
    "Backtracking",
    "Backtracking explora escolhas em profundidade, verifica restrições logo que possível e desfaz a escolha ao retornar. Podar ramos impossíveis reduz o trabalho, embora muitos problemas ainda tenham custo exponencial. É comum em permutações, sudoku e combinação de opções.",
    "Para formar subconjuntos de [1,2], escolha incluir ou excluir 1 e, em cada ramo, faça o mesmo para 2.",
    "flowchart TD\n  A[\"início\"] --> B[\"incluir 1\"]\n  A --> C[\"excluir 1\"]\n  B --> D[\"incluir ou excluir 2\"]\n  C --> E[\"incluir ou excluir 2\"]"
  ],
  [
    "DP",
    "Programação dinâmica aplica-se quando subproblemas se repetem e soluções ótimas podem ser compostas de soluções menores. Memoização guarda resultados durante a recursão. Tabulação preenche uma tabela em ordem. Isso troca memória por menos recomputações, frequentemente reduzindo tempo exponencial a polinomial.",
    "Fibonacci recursivo recalcula F(3) várias vezes. Memoização calcula F(3) uma vez e reutiliza o resultado.",
    "flowchart TD\n  A[\"F(5)\"] --> B[\"F(4)\"]\n  A --> C[\"F(3)\"]\n  B --> C\n  C --> D[\"memorizar F(3)\"]"
  ],
  [
    "Greedy algorithm",
    "Algoritmo guloso escolhe a melhor opção disponível naquele instante e não volta atrás. A estratégia só é correta quando o problema tem uma propriedade que prova que escolhas locais conduzem ao ótimo global. Sem essa prova, a solução pode falhar. É comum em interval scheduling e árvores geradoras mínimas.",
    "Para selecionar mais reuniões sem conflito, ordenar por horário de término e aceitar a próxima compatível produz uma solução ótima.",
    "flowchart LR\n  A[\"reunião termina 10\"] --> B[\"aceita\"] --> C[\"próxima compatível\"]"
  ],
  [
    "Union-find",
    "Disjoint set union mantém uma partição em conjuntos. find retorna o representante do conjunto. union conecta dois conjuntos. Compressão de caminho e união por tamanho tornam operações quase constantes na prática, O(α(n)) amortizado. Não é apropriada para remover relações já adicionadas.",
    "Após union(A,B) e union(B,C), find(A) e find(C) retornam o mesmo representante.",
    "flowchart LR\n  A((A)) --> R((raiz))\n  B((B)) --> R\n  C((C)) --> R"
  ],
  [
    "Tries",
    "Trie organiza chaves por prefixos. Cada aresta representa um caractere e cada nó pode marcar fim de palavra. Buscar ou inserir custa O(L), sendo L o tamanho da palavra, independente do total de palavras, com custo de memória potencialmente alto.",
    "'casa' e 'casaco' compartilham o prefixo c-a-s-a; depois, 'casaco' continua com c-o.",
    "flowchart LR\n  R((raiz)) --> C((c)) --> A((a)) --> S((s)) --> F((a))\n  F --> X((c)) --> O((o))"
  ],
  [
    "Topological sort",
    "Ordenação topológica coloca cada vértice antes dos vértices que dependem dele. Só existe em grafo dirigido acíclico. O algoritmo de Kahn processa vértices sem dependências pendentes usando fila; DFS também pode produzi-la. Ambos custam O(V+E).",
    "Se o aplicativo depende da biblioteca, primeiro ordene a biblioteca e depois o aplicativo.",
    "flowchart LR\n  A[\"biblioteca\"] --> B[\"serviço\"] --> C[\"aplicativo\"]"
  ],
  [
    "Dijkstra's",
    "Dijkstra encontra menores distâncias de uma origem quando todos os pesos são não negativos. Mantém distâncias tentativas em uma fila de prioridades e relaxa as arestas ao retirar o vértice mais promissor. Com heap e lista de adjacência custa O((V+E) log V). Para pesos negativos use outro algoritmo, como Bellman-Ford.",
    "A→B custa 4, A→C custa 1 e C→B custa 2. O melhor caminho até B é A→C→B, custo 3.",
    "flowchart LR\n  A((A)) -->|4| B((B))\n  A -->|1| C((C)) -->|2| B"
  ]
];

export const AlgorithmsGuide = component$(() => (
  <section class="algorithms-guide" aria-labelledby="algorithms-guide-title">
    <section class="algorithms-foundations" aria-labelledby="algorithms-foundations-title">
      <header class="systems-section-header">
        <p class="section-kicker">FUNDAMENTOS</p>
        <h2 id="algorithms-foundations-title">Os blocos que todo algoritmo usa</h2>
        <p>Antes de escolher uma estrutura ou técnica, entenda como os dados são representados e como medir o custo de um procedimento.</p>
      </header>
      <div class="algorithms-foundation-grid">
        <article><h3>Números e valores primitivos</h3><p><strong>Inteiros</strong> representam contagens e índices. Verifique limites e overflow ao somar ou multiplicar.</p><p><strong>Reais</strong> representam medidas fracionárias, mas têm precisão finita. Comparações exatas podem falhar por arredondamento.</p><p><strong>Booleanos</strong> guardam verdadeiro ou falso e controlam condições. <strong>Caracteres</strong> representam unidades de texto, cujo tamanho e codificação variam entre linguagens.</p></article>
        <article><h3>Variáveis, expressões e controle</h3><p>Variáveis dão nomes a valores. Expressões combinam valores e operadores. Condições escolhem um caminho, e laços repetem passos.</p><p>Um algoritmo correto define entrada, resultado esperado e o que acontece nos casos extremos, como coleção vazia ou um único elemento.</p></article>
        <article><h3>Estruturas básicas de dados</h3><p>Arrays e listas guardam sequências. Matrizes representam grades. Registros ou objetos agrupam campos relacionados. Conjuntos mantêm elementos únicos.</p><p>A escolha depende das operações importantes: acesso por índice, busca por chave, inserção, remoção ou preservação da ordem.</p></article>
        <article><h3>Como ler complexidade</h3><p>Big O descreve como tempo ou memória crescem com o tamanho da entrada. O(1) é constante, O(log n) cresce devagar, O(n) percorre os dados e O(n²) costuma vir de pares de laços.</p><p>Considere também melhor, médio e pior caso. Complexidade orienta a escolha, mas dados, memória e simplicidade de implementação também importam.</p></article>
      </div>
    </section>
    <header class="systems-section-header">
      <p class="section-kicker">GUIA DE ESTUDO</p>
      <h2 id="algorithms-guide-title">Como funcionam, com exemplos visuais</h2>
      <p>Leia cada conceito, acompanhe o exemplo e use o índice acima para localizar o tema. As ilustrações mostram passos e relações entre elementos.</p>
    </header>
    
    <div class="algorithms-lessons">
      {lessons.map(([title, explanation, example, diagram]) => (
        <article class="algorithms-lesson" id={`lesson-${topicSlug(title)}`} key={title}>
          <h3>{title}</h3>
          <p>{explanation}</p>
          <p><strong>Exemplo.</strong> {example}</p>
          <pre class="mermaid algorithms-lesson-diagram">{diagram}</pre>
          <a class="algorithms-topic-link" href={`#topic-${topicSlug(title)}`}>Voltar ao índice</a>
        </article>
      ))}
    </div>
  </section>
));
