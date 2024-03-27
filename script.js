function defineDragBehavior(simulation) {
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.sourceEvent.stopPropagation(); // Stop event propagation
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.sourceEvent.stopPropagation(); // Stop event propagation
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

class Vertex {
    constructor(x, y, id) {
        this.position = { x, y };
        this.id = id;
    }

    draw(g, simulation) {
        let d3Circle = d3.select(`#vertex-${this.id}`).datum(this.position);
        
        if (!this.circle) {
            this.circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            this.circle.setAttribute('class', 'circle');
        }
        
        this.circle.setAttribute('id', `vertex-${this.id}`);
        this.circle.setAttribute("cx", this.position.x);
        this.circle.setAttribute("cy", this.position.y);
        this.circle.setAttribute("r", 20);

        g.appendChild(this.circle);

        if (simulation) {
            const dragBehavior = defineDragBehavior(simulation);
            d3Circle.call(dragBehavior);
        }
    }

    
    
}

class Edge {
    constructor(vertex1, vertex2) {
        this.vertex1 = vertex1;
        this.vertex2 = vertex2;
    }

    draw(g) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", this.vertex1.position.x);
        line.setAttribute("y1", this.vertex1.position.y);
        line.setAttribute("x2", this.vertex2.position.x);
        line.setAttribute("y2", this.vertex2.position.y);
        line.setAttribute("class", "edge");
        g.appendChild(line);
    }
}

class Graph {
    constructor() {
        this.vertexSet = [];
        this.edgeSet = [];
    }

    addVertex(vertex) {
        this.vertexSet.push(vertex);
    }

    addEdge(edge) {
        this.edgeSet.push(edge);
    }

    draw(g, simulation) {
        // Clear previous SVG elements
        g.innerHTML = '';

        // Draw edges
        this.edgeSet.forEach(edge => edge.draw(g));

        // Draw vertices
        this.vertexSet.forEach(vertex => {
            // Ensure 'this' inside 'draw' refers to the 'Vertex' instance
            vertex.draw(g, simulation);
        });
    }
}    

function createGraphFromJson(json, svgContainer) {
    const graph = new Graph();
    const viewBox = svgContainer.viewBox.baseVal;
    //svgElement = document.getElementById(svgContainer);
    // Adjusting vertex creation to account for object format
    Object.keys(json.vertices).forEach(key => {
        const vertex = json.vertices[key];
        const newVertex = new Vertex(vertex.x * 380, vertex.y * 280, key);
        graph.addVertex(newVertex);
    });

    // Adjusting edge creation to account for the array of pairs format
    json.edges.forEach(pair => {
        const vertex1 = graph.vertexSet[pair[0]];
        const vertex2 = graph.vertexSet[pair[1]];
        const newEdge = new Edge(vertex1, vertex2);
        graph.addEdge(newEdge);
    });

    // Draw graph on the provided SVG container
    //graph.vertexSet.forEach(vertex => svgElement.appendChild(vertex.createSvgElement()));
    //graph.edgeSet.forEach(edge => svgElement.appendChild(edge.createSvgElement()));

    return graph;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Width and height
    var width = 800, height = 600;

        // Setup the SVG and the group (g) element
    var svg = d3.select("#network").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", function (event) {
            if (!event.target.classList.contains("circle")) {
                g.attr("transform", event.transform);
            }
        }))
        //.append("g");

    var g = svg.append("g"); // All visual elements will be added to this group
    
    svg.call(d3.zoom().on("zoom", function (event) {
        g.attr("transform", event.transform); // Apply the transformation to the group element
    }));

    const res = await fetch('petersen_graph_data.json');
    const graphData = await res.json();

    let graph = createGraphFromJson(graphData, svg.node());

        // Setup the force layout
    const nodes = graph.vertexSet.map(v => v.position);
    const links = graph.edgeSet.map(e => ({
        source: graph.vertexSet.indexOf(e.vertex1),
        target: graph.vertexSet.indexOf(e.vertex2)
    }));

    // Initialize the simulation
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.index))
        .force("charge", d3.forceManyBody().strength(-600))
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Handle the simulation "tick"
    simulation.on("tick", () => {
        // Update vertex positions based on simulation
        nodes.forEach((d, i) => {
            graph.vertexSet[i].position.x = d.x;
            graph.vertexSet[i].position.y = d.y;
        });
        // Redraw the graph
        graph.draw(g.node(), simulation);
    });
});