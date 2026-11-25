import { component$ } from "@builder.io/qwik";
import { topicSlug } from "../../lib/content/knowledge";

const lessons = [
  ["Arrays", "Elementos do mesmo tipo em posições contíguas, acessados por índice. Ler uma posição custa O(1); inserir no meio exige deslocar os seguintes.", "Para [4, 8, 2], o índice 1 contém 8."],
  ["Strings", "Sequências de caracteres. Em muitas linguagens são imutáveis, então concatenar repetidamente pode copiar o conteúdo.", "Para inverter 'sol', percorra os caracteres do fim ao início: 'los'."],
  ["Hash maps", "Associam uma chave a um valor usando uma função hash. Busca e inserção são O(1) em média, com colisões possíveis.", "mapa['ana'] = 3 registra que Ana apareceu três vezes."],
  ["Two pointers", "Dois índices percorrem uma sequência, muitas vezes de extremidades opostas, evitando buscas aninhadas.", "Em [1, 2, 4, 7], procure soma 6: ponteiros em 1 e 7 (soma 8), depois 1 e 4 (soma 5), depois 2 e 4 (soma 6)."],
  ["Sliding window", "Uma janela contígua cresce e encolhe enquanto mantém um estado, útil para subarrays e substrings.", "Maior soma de 3 itens em [2, 1, 5, 1]: janela [2,1,5] soma 8."],
  ["Stacks", "Pilha LIFO: o último elemento inserido é o primeiro removido. Push e pop são O(1).", "Empilhe A, depois B. O próximo pop retorna B."],
  ["Queues", "Fila FIFO: o primeiro elemento inserido é o primeiro removido. Usada em processamento por ordem de chegada.", "Enfileire A e B. O próximo dequeue retorna A."],
  ["Binary search", "Em dados ordenados, compara o meio e descarta metade do intervalo a cada passo. Custa O(log n).", "Em [2, 5, 8, 12, 16], buscar 12 começa pelo 8 e continua à direita."],
  ["Linked lists", "Nós guardam um valor e uma referência ao próximo. Inserir após um nó conhecido é O(1), mas localizar por índice é O(n).", "A → B → C. Remover B liga A diretamente a C."],
  ["Recursion", "Uma função resolve instâncias menores de si mesma e precisa de um caso base para parar.", "fatorial(4) = 4 × fatorial(3), até fatorial(1) = 1."],
  ["Binary trees", "Cada nó tem até dois filhos. Busca em árvore balanceada custa O(log n), mas pode chegar a O(n) se inclinada.", "Na árvore 8 com filhos 3 e 10, valores menores que 8 seguem à esquerda."],
  ["Heaps", "Árvore quase completa que mantém o maior ou menor elemento na raiz. Inserir e remover a raiz custam O(log n).", "Min-heap de [5, 2, 7] mantém 2 na raiz."],
  ["Priority queues", "Fila que remove o item de maior prioridade, normalmente implementada com heap.", "Tarefas com prioridades 2, 1 e 3 são atendidas na ordem 3, 2, 1."],
  ["Sorting algorithms", "Ordenam elementos. Merge sort e heapsort garantem O(n log n); insertion sort pode ser eficiente em listas pequenas.", "Ordenar [4, 1, 3] produz [1, 3, 4]."],
  ["BFS", "Busca em largura visita um grafo por camadas usando fila. Encontra caminhos mínimos em grafos sem pesos.", "De A, visita primeiro todos os vizinhos diretos antes dos próximos níveis."],
  ["DFS", "Busca em profundidade explora um caminho até o fim antes de voltar. Pode usar pilha ou recursão.", "A → B → D, depois retorna para explorar o próximo vizinho."],
  ["Backtracking", "Constrói uma solução parcial, testa restrições e desfaz escolhas quando o ramo não pode funcionar.", "Para combinações de [1,2], escolhe 1, tenta 2, depois desfaz e tenta outro ramo."],
  ["DP", "Programação dinâmica guarda resultados de subproblemas repetidos, por memoização ou tabela.", "Fibonacci guarda F(0), F(1) e calcula F(n) uma única vez."],
  ["Greedy algorithm", "Escolhe a melhor opção local a cada passo. Funciona quando essas escolhas garantem uma solução global ótima.", "Para selecionar o máximo de reuniões sem sobreposição, escolha a que termina primeiro."],
  ["Union-find", "Estrutura para manter conjuntos disjuntos. find identifica o representante e union combina conjuntos.", "Ao conectar A-B e B-C, consultas confirmam que A e C pertencem ao mesmo grupo."],
  ["Tries", "Árvore de prefixos para palavras. Busca depende do tamanho da palavra, útil em autocomplete.", "'casa' e 'casaco' compartilham o caminho c → a → s → a."],
  ["Topological sort", "Ordena vértices de um grafo acíclico dirigido respeitando dependências.", "Compilar biblioteca antes do aplicativo que a utiliza."],
  ["Dijkstra's", "Calcula menores distâncias em grafos com pesos não negativos usando uma fila de prioridades.", "Se A→B custa 4 e A→C→B custa 1+2, escolhe o caminho de custo 3."],
];

export const AlgorithmsGuide = component$(() => (
  <section class="algorithms-guide" aria-labelledby="algorithms-guide-title">
    <header class="systems-section-header">
      <p class="section-kicker">GUIA DE ESTUDO</p>
      <h2 id="algorithms-guide-title">Como funcionam, com exemplos visuais</h2>
      <p>Leia cada conceito, acompanhe o exemplo e use o índice acima para localizar o tema. As ilustrações mostram passos e relações entre elementos.</p>
    </header>
    <div class="algorithms-diagrams">
      <article><h3>Pilha e fila</h3><pre class="mermaid">{`flowchart LR
  subgraph Pilha
    direction TB
    S1["topo: B"] --> S2["A"]
  end
  subgraph Fila
    direction LR
    Q1["primeiro: A"] --> Q2["B"] --> Q3["último"]
  end`}</pre></article>
      <article><h3>Busca binária</h3><pre class="mermaid">{`flowchart TD
  A["[2, 5, 8, 12, 16]"] --> B{"meio = 8; alvo 12"}
  B -->|maior| C["[12, 16]"]
  C --> D["encontrado: 12"]`}</pre></article>
      <article><h3>Percurso em grafo</h3><pre class="mermaid">{`graph LR
  A((A)) --- B((B))
  A --- C((C))
  B --- D((D))
  C --- E((E))
  classDef visit fill:#b8e3d0,stroke:#176b50
  class A,B,C,D,E visit
  linkStyle 0,1,2,3 stroke:#176b50,stroke-width:2px`}</pre></article>
    </div>
    <div class="algorithms-lessons">
      {lessons.map(([title, explanation, example]) => (
        <article class="algorithms-lesson" id={`lesson-${topicSlug(title)}`} key={title}>
          <h3>{title}</h3>
          <p>{explanation}</p>
          <p><strong>Exemplo.</strong> {example}</p>
          <a class="algorithms-topic-link" href={`#topic-${topicSlug(title)}`}>Voltar ao índice</a>
        </article>
      ))}
    </div>
  </section>
));
