/**
 * Obsidian-style Knowledge Graph Visualization
 * Reflects the brain map of nhmatsumoto-blog-engine.
 */

const mountGraph = (container, data) => {
  const isFullScreen = container.dataset.fullScreen === "true";
  const width = container.clientWidth || container.getBoundingClientRect().width || 600;
  const height =
    isFullScreen && window.innerHeight ? window.innerHeight : container.clientHeight || 400;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", [0, 0, width, height]);

  const g = svg.append("g");

  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 8])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  svg.call(zoom);

  const simulation = d3.forceSimulation(data.nodes)
    .force("link", d3.forceLink(data.links).id((d) => d.id).distance(120))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(50));

  const link = g
    .append("g")
    .attr("stroke", "rgba(0,0,0,0.06)")
    .attr("stroke-opacity", 0.4)
    .selectAll("line")
    .data(data.links)
    .join("line")
    .attr("stroke-width", 1);

  const node = g
    .append("g")
    .selectAll("g")
    .data(data.nodes)
    .join("g")
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      if (d.url) {
        const cleanUrl = d.url.startsWith("http") ? d.url : d.url.startsWith("/") ? d.url : `/${d.url}`;
        window.location.href = cleanUrl;
      }
    });

  node
    .append("circle")
    .attr("r", (d) => (d.kind === "project" ? 8 : 6))
    .attr("fill", (d) => {
      if (d.kind === "project") return "#00C2FF";
      if (d.kind === "document") return "#7C5CFF";
      return "#1e293b";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);

  node
    .append("text")
    .attr("x", 14)
    .attr("y", 4)
    .text((d) => d.title)
    .style("font-size", isFullScreen ? "13px" : "11px")
    .style("font-family", "var(--font-ui), sans-serif")
    .style("fill", "#64748b")
    .style("pointer-events", "none")
    .style("text-shadow", "0 1px 2px white");

  node.on("mouseenter", function () {
    d3.select(this)
      .select("circle")
      .attr("r", (d) => (d.kind === "project" ? 12 : 10));
    d3.select(this)
      .select("text")
      .style("font-weight", "bold")
      .style("fill", "#00C2FF");
  });

  node.on("mouseleave", function () {
    d3.select(this)
      .select("circle")
      .attr("r", (d) => (d.kind === "project" ? 8 : 6));
    d3.select(this)
      .select("text")
      .style("font-weight", "normal")
      .style("fill", "#64748b");
  });

  node.call(
    d3
      .drag()
      .on("start", function (event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on("drag", function (event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on("end", function (event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      })
  );

  simulation.on("tick", () => {
    link.attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });
  return { isFullScreen, zoom, svg };
};

const initKnowledgeGraph = async () => {
  const containers = Array.from(document.querySelectorAll("[data-knowledge-graph], [data-brain-map]"));
  if (!containers.length) return;

  try {
    const response = await fetch("/assets/graph-data.json");
    if (!response.ok) throw new Error("Failed to fetch graph data");
    const source = await response.json();

    const mounts = containers
      .map((container) => {
        const dataset = JSON.parse(JSON.stringify(source));
        return mountGraph(container, dataset);
      })
      .filter(Boolean);

    const primary = mounts.find((item) => item?.isFullScreen);
    if (primary) {
      document.getElementById("zoom-in")?.addEventListener("click", () => {
        primary.svg.transition().call(primary.zoom.scaleBy, 1.2);
      });
      document.getElementById("zoom-out")?.addEventListener("click", () => {
        primary.svg.transition().call(primary.zoom.scaleBy, 0.8);
      });
      document.getElementById("zoom-reset")?.addEventListener("click", () => {
        primary.svg.transition().call(primary.zoom.scaleTo, 1);
      });
    }
  } catch (err) {
    console.error("Failed to load knowledge graph:", err);
  }
};

window.addEventListener("load", initKnowledgeGraph);
