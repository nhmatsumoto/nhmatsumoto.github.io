/**
 * Obsidian-style Knowledge Graph Visualization
 * Uses D3.js to render a force-directed graph of blog posts and their connections.
 */

const initKnowledgeGraph = async () => {
  const container = document.querySelector('[data-knowledge-graph]');
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight || 400;

  try {
    const response = await fetch('/assets/graph-data.json');
    if (!response.ok) throw new Error('Failed to fetch graph data');
    const data = await response.json();

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [0, 0, width, height]);

    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .attr('stroke', 'rgba(0,0,0,0.08)')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(data.links)
      .join('line');

    const node = svg.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (d.url) window.location.href = d.url;
      });

    node.append('circle')
      .attr('r', 6)
      .attr('fill', d => d.kind === 'project' ? 'hsl(221, 83%, 53%)' : '#1e293b')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    node.append('text')
      .attr('x', 12)
      .attr('y', 4)
      .text(d => d.title)
      .style('font-size', '12px')
      .style('font-family', 'sans-serif')
      .style('fill', '#64748b');

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    node.call(d3.drag()
      .on('start', function (event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on('drag', function (event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on('end', function (event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }));

  } catch (err) {
    console.error('Failed to load knowledge graph:', err);
  }
};

window.addEventListener('load', initKnowledgeGraph);
