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
    .force("link", d3.forceLink(data.links).id((d) => d.id).distance((d) => {
      // Shorter distance for hierarchy levels
      if (d.source.kind === "central" || d.target.kind === "central") return 150;
      if (d.source.kind === "group" || d.target.kind === "group") return 100;
      return 60;
    }))
    .force("charge", d3.forceManyBody().strength((d) => {
      if (d.kind === "central") return -1000;
      if (d.kind === "group") return -500;
      return -100;
    }))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius((d) => (d.size || 6) * 2 + 10));

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
    .attr("r", (d) => d.size || 6)
    .attr("fill", (d) => d.color || "#1e293b")
    .attr("stroke", (d) => (d.glow ? "rgba(255,255,255,0.8)" : "#fff"))
    .attr("stroke-width", (d) => (d.kind === "central" ? 3 : 1.5))
    .style("filter", (d) => d.glow ? "drop-shadow(0 0 8px rgba(255,255,255,0.5))" : "none");

  node
    .append("text")
    .attr("x", (d) => (d.size || 6) + 6)
    .attr("y", 4)
    .text((d) => d.title)
    .style("font-size", (d) => {
        if (d.kind === "central") return "16px";
        if (d.kind === "group") return "14px";
        return isFullScreen ? "12px" : "10px";
    })
    .style("font-family", "var(--font-ui), sans-serif")
    .style("fill", (d) => (d.kind === "central" || d.kind === "group" ? "#f8fafc" : "#94a3b8"))
    .style("pointer-events", "none")
    .style("font-weight", (d) => (d.kind === "central" || d.kind === "group" ? "bold" : "normal"))
    .style("text-shadow", "0 1px 3px rgba(0,0,0,0.3)");

  node.on("mouseenter", function (event, d) {
    d3.select(this)
      .select("circle")
      .transition()
      .duration(200)
      .attr("r", (d.size || 6) * 1.5);
    
    d3.select(this)
      .select("text")
      .transition()
      .duration(200)
      .style("fill", d.color || "#00C2FF")
      .style("opacity", 1);
  });

  node.on("mouseleave", function (event, d) {
    d3.select(this)
      .select("circle")
      .transition()
      .duration(200)
      .attr("r", d.size || 6);
    
    d3.select(this)
      .select("text")
      .transition()
      .duration(200)
      .style("fill", (d.kind === "central" || d.kind === "group" ? "#f8fafc" : "#94a3b8"));
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
