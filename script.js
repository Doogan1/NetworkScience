function defineDragBehavior(simulation) {
    function dragstarted(event) {
        isVertexBeingDragged = true;
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
        isVertexBeingDragged = false;
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
        this.edges = [];
    }

    draw(g, simulation) {
        // Convert the container to a D3 selection if it's not already one
        let gSelection = d3.select(g);
    
        // Bind the vertex data to a circle. If the circle doesn't exist, enter() will create it.
        let d3Circle = gSelection.selectAll(`#vertex-${this.id}`)
            .data([this.position], d => d.id);
    
        // Enter selection: Create the circle if it doesn't exist
        d3Circle.enter().append('circle')
            .attr('class', 'circle')
            .attr('id', `vertex-${this.id}`)
            .attr('r', 20)
            .merge(d3Circle) // Merge enter and update selections
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .call(simulation ? defineDragBehavior(simulation) : () => {});
    
        // If the circles are already created, this will update their positions.
        d3Circle.attr('cx', d => d.x)
            .attr('cy', d => d.y);
    
        // Remove any circles that no longer have corresponding data
        d3Circle.exit().remove();
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
        this.vertexSet[edge.vertex1.id].edges.push(edge);
        this.vertexSet[edge.vertex2.id].edges.push(edge);
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

function addEdge(graph, sourceVertex, targetVertex) {
    const newEdge = new Edge(sourceVertex, targetVertex);

    console.log(newEdge);

    graph.addEdge(newEdge);

    sourceVertex.edges.push(newEdge);
    targetVertex.edges.push(newEdge);
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

function addVertexWithPreferentialAttachment(graph, g, simulation) {
    // Generate a unique ID for the new vertex
    const newVertexId = `${graph.vertexSet.length}`;
    const newVertex = new Vertex(Math.random() * 800, Math.random() * 600, newVertexId);
    graph.addVertex(newVertex);

    // Calculate the total degree of the graph
    let totalDegree = 0;
    graph.vertexSet.forEach(vertex => {
        totalDegree += vertex.edges ? vertex.edges.length : 0;
    });

    // Add edges to existing vertices based on preferential attachment
    graph.vertexSet.forEach(vertex => {
        if (vertex !== newVertex && vertex.edges.length > 0) { // Exclude the new vertex and isolated vertices
            const attachmentProbability = vertex.edges.length / totalDegree;
            if (Math.random() < attachmentProbability) {
                addEdge(graph, newVertex, vertex); // Use the updated addEdge method
            }
        }
    });
    simulation.nodes(graph.vertexSet.map(v => v.position));

    // Update the simulation links with any new edges
    const updatedLinks = graph.edgeSet.map(e => ({
        source: graph.vertexSet.indexOf(e.vertex1),
        target: graph.vertexSet.indexOf(e.vertex2)
    }));
    simulation.force("link").links(updatedLinks);

    // Restart the simulation with the new data
    simulation.alpha(1).restart();
    // Redraw the graph with the new vertex and edges
    graph.draw(g.node(), simulation);; // You'll need to implement this function based on your existing graph drawing logic
}

document.addEventListener('DOMContentLoaded', async () => {
    // Width and height
    var width = 800, height = 600;
    let isVertexBeingDragged = false;
        // Setup the SVG and the group (g) element
    var svg = d3.select("#network").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", function (event) {
            if (!isVertexBeingDragged) {
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
    //const nodes = graph.vertexSet.map(v => v.position);
    //const links = graph.edgeSet.map(e => ({
        //source: graph.vertexSet.indexOf(e.vertex1),
        //target: graph.vertexSet.indexOf(e.vertex2)
    //}));

    
    // Initialize the simulation
    const simulation = d3.forceSimulation(graph.vertexSet.map(v => v.position))
        .force("link", d3.forceLink(graph.edgeSet.map(e => ({
            source: graph.vertexSet.indexOf(e.vertex1),
            target: graph.vertexSet.indexOf(e.vertex2)
        }))).id(d => d.index))
        .force("charge", d3.forceManyBody().strength(-600))
        .force("center", d3.forceCenter(width / 2, height / 2));
    
    document.getElementById('addVertexBtn').addEventListener('click', () => {
        addVertexWithPreferentialAttachment(graph, g, simulation);
    });

    // Handle the simulation "tick"
    simulation.on("tick", () => {
        // Update vertex positions based on simulation
        graph.vertexSet.map(v => v.position).forEach((d, i) => {
            graph.vertexSet[i].position.x = d.x;
            graph.vertexSet[i].position.y = d.y;
        });
        // Redraw the graph
        graph.draw(g.node(), simulation);
    });
});