/**
 * Obsidian-style Knowledge Graph Visualization
 * Uses D3.js to render a force-directed graph of blog posts and their connections.
 */

const initKnowledgeGraph = async () => {
    const container = document.querySelector('[data-knowledge-graph]');
    if (!container) return;

    const isFullScreen = container.dataset.fullScreen === 'true';
    const width = container.clientWidth;
    const height = container.clientHeight || (isFullScreen ? window.innerHeight : 400);

    try {
        const response = await fetch('/assets/graph-data.json');
        if (!response.ok) throw new Error('Failed to fetch graph data');
        const data = await response.json();

        const svg = d3.select(container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [0, 0, width, height]);

        const g = svg.append('g'); // Group for zoom/pan

        // Zoom setup
        const zoom = d3.zoom()
            .scaleExtent([0.1, 8])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        if (isFullScreen) {
            svg.call(zoom);
            
            // External Controls
            document.getElementById('zoom-in')?.addEventListener('click', () => svg.transition().call(zoom.scaleBy, 1.2));
            document.getElementById('zoom-out')?.addEventListener('click', () => svg.transition().call(zoom.scaleBy, 0.8));
            document.getElementById('zoom-reset')?.addEventListener('click', () => svg.transition().call(zoom.transform, d3.zoomIdentity));
        }

        const simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.links).id(d => d.id).distance(120))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(50));

        const link = g.append('g')
            .attr('stroke', 'rgba(0,0,0,0.06)')
            .attr('stroke-opacity', 0.4)
            .selectAll('line')
            .data(data.links)
            .join('line')
            .attr('stroke-width', 1);

        const node = g.append('g')
            .selectAll('g')
            .data(data.nodes)
            .join('g')
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                if (d.url) {
                    // Prepend / for relative links if necessary
                    const cleanUrl = d.url.startsWith('http') ? d.url : (d.url.startsWith('/') ? d.url : '/' + d.url);
                    window.location.href = cleanUrl;
                }
            });

        // Background circle for highlight
        node.append('circle')
            .attr('r', d => d.kind === 'project' ? 8 : 6)
            .attr('fill', d => {
                if (d.kind === 'project') return '#00C2FF';
                if (d.kind === 'document') return '#7C5CFF';
                return '#1e293b';
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        // Hover Effect
        node.on('mouseenter', function() {
            d3.select(this).select('circle').attr('r', d => (d.kind === 'project' ? 12 : 10));
            d3.select(this).select('text').style('font-weight', 'bold').style('fill', '#00C2FF');
        }).on('mouseleave', function() {
            d3.select(this).select('circle').attr('r', d => (d.kind === 'project' ? 8 : 6));
            d3.select(this).select('text').style('font-weight', 'normal').style('fill', '#64748b');
        });

        node.append('text')
            .attr('x', 14)
            .attr('y', 4)
            .text(d => d.title)
            .style('font-size', isFullScreen ? '13px' : '11px')
            .style('font-family', 'var(--font-ui), sans-serif')
            .style('fill', '#64748b')
            .style('pointer-events', 'none')
            .style('text-shadow', '0 1px 2px white');

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
