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

function calculateDegreePercentiles(graph) {
    const degrees = graph.vertexSet.map(vertex => vertex.edges.length || 0); // Assuming `edges` count as degree
    const sortedDegrees = [...degrees].sort((a, b) => a - b);
    const maxDegree = sortedDegrees[sortedDegrees.length - 1];

    // Calculate percentile for each degree
    const percentiles = degrees.map(degree => degree / maxDegree);
    return percentiles;
}

class Vertex {
    constructor(x, y, id) {
        this.position = { x, y };
        this.id = id;
        this.edges = [];
    }

    draw(g, simulation, fillColor) {
        // Convert the container to a D3 selection if it's not already one
        let gSelection = d3.select(g);
    
        // Bind the vertex data to a circle. If the circle doesn't exist, enter() will create it.
        let d3Circle = gSelection.selectAll(`#vertex-${this.id}`)
            .data([this.position], d => d.id);
    
        // Enter selection: Create the circle if it doesn't exist
        d3Circle.enter().append('circle')
            .attr('class', 'circle')
            .attr('id', `vertex-${this.id}`)
            .attr('fill', fillColor)
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

    draw(g, simulation, percentiles) {
        // Clear previous SVG elements
        g.innerHTML = '';

        //define color scale to be used on coloring vertices based on degree percentile rank
        const colorScale = d3.scaleLinear()
                     .domain([0, 1]) // From 0% to 100%
                     .range(["#fff", "red"]);

        // Draw edges
        this.edgeSet.forEach(edge => edge.draw(g));

        //const percentiles = calculateDegreePercentiles(this);

        // Draw vertices
        this.vertexSet.forEach((vertex, i) => {
            const fillColor = colorScale(percentiles[i]);
            vertex.draw(g, simulation, fillColor);
        });
    }
}

function addEdge(graph, sourceVertex, targetVertex) {
    const newEdge = new Edge(sourceVertex, targetVertex);

    graph.addEdge(newEdge);

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

    // introduce flag to redraw edges if no edges are drawn

    let edgeAdded = false;
    // Calculate the total degree of the graph
    let totalDegree = 0;
    graph.vertexSet.forEach(vertex => {
        totalDegree += vertex.edges ? vertex.edges.length : 0;
    });

    // Add edges to existing vertices based on preferential attachment

    while (!edgeAdded) {
        graph.vertexSet.forEach(vertex => {
            if (vertex !== newVertex && vertex.edges.length > 0) { // Exclude the new vertex and isolated vertices
                const attachmentProbability = vertex.edges.length / totalDegree;
                if (Math.random() < attachmentProbability) {
                    addEdge(graph, newVertex, vertex); // Use the updated addEdge method
                    edgeAdded = true;
                }
            }
        });
    }

    simulation.nodes(graph.vertexSet.map(v => v.position));

    // Update the simulation links with any new edges
    const updatedLinks = graph.edgeSet.map(e => ({
        source: graph.vertexSet.indexOf(e.vertex1),
        target: graph.vertexSet.indexOf(e.vertex2)
    }));
    simulation.force("link").links(updatedLinks);

    // Restart the simulation with the new data
    simulation.alpha(1).restart();
    percentiles = calculateDegreePercentiles(graph);
    // Redraw the graph with the new vertex and edges
    graph.draw(g.node(), simulation, percentiles); // You'll need to implement this function based on your existing graph drawing logic
}

function chartDataFromGraph(graph) {
    // Object to store degree counts
    const degreeCounts = {};

    // Calculate degrees (Assuming each edge contributes to the degree of both vertices)
    graph.vertexSet.forEach(vertex => {
        // The degree is simply the length of the edges array for the vertex
        const degree = vertex.edges.length || 0; // Fallback to 0 if no edges are defined
        // Increment the count for this degree
        if (degreeCounts[degree]) {
            degreeCounts[degree] += 1;
        } else {
            degreeCounts[degree] = 1;
        }
    });



    // Convert the degreeCounts object to an array suitable for D3
    const chartData = Object.keys(degreeCounts).map(degree => ({
        degree: parseInt(degree), // Convert key back to integer
        count: degreeCounts[degree]
    }));

    // Sort by degree to ensure the chart is ordered
    chartData.sort((a, b) => a.degree - b.degree);

    return chartData;
}

function drawDegreeDistributionChart(data) {
    const svg = d3.select("#degreeDistributionChart");
    svg.selectAll("*").remove(); // Clear the SVG for redrawing

    const margin = { top: 20, right: 20, bottom: 30, left: 40 },
          width = +svg.attr("width") - margin.left - margin.right,
          height = +svg.attr("height") - margin.top - margin.bottom;

    // Create a scale for your x axis based on degree
    const x = d3.scaleBand()
                .range([0, width])
                .padding(0.1)
                .domain(data.map(d => d.degree));

    // Create a scale for your y axis based on count
    const y = d3.scaleLinear()
                .range([height, 0])
                .domain([0, d3.max(data, d => d.count)]);

    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left},${margin.top})`);

    // X Axis
    g.append("g")
     .attr("transform", `translate(0,${height})`)
     .call(d3.axisBottom(x));

    // Y Axis
    g.append("g")
     .call(d3.axisLeft(y));

    // Bars
    g.selectAll(".bar")
     .data(data)
     .enter().append("rect")
     .attr("class", "bar")
     .attr("x", d => x(d.degree))
     .attr("y", d => y(d.count))
     .attr("width", x.bandwidth())
     .attr("height", d => height - y(d.count))
     .attr("fill", "steelblue"); // Add fill to customize bar color
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

    //calculate degree distribution and then draw the chart
    degreeChartData = chartDataFromGraph(graph);
    drawDegreeDistributionChart(degreeChartData);

    //calculate percentiles for coloring vertices
    percentiles = calculateDegreePercentiles(graph);
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
        degreeChartData = chartDataFromGraph(graph);
        drawDegreeDistributionChart(degreeChartData);
    });

    document.getElementById('resetGraphBtn').addEventListener('click', () => {
        resetGraph(svg.node(), g); // Pass the SVG container where your graph is drawn
    });
    
    // Handle the simulation "tick"
    simulation.on("tick", () => {
        // Update vertex positions based on simulation
        graph.vertexSet.map(v => v.position).forEach((d, i) => {
            graph.vertexSet[i].position.x = d.x;
            graph.vertexSet[i].position.y = d.y;
        });
        // Redraw the graph
        graph.draw(g.node(), simulation, percentiles);
    });
});

async function resetGraph(svgContainer, g) {
    try {
        const res = await fetch('petersen_graph_data.json');
        const graphData = await res.json();
        // Assuming `graph` is accessible and has a method to clear its current state
        //graph.clear(); // Clear current graph state
        const graph = createGraphFromJson(graphData, svgContainer);
        // You might need to reapply the force simulation setup here as well
     // Reinitialize simulation with new/old data
        var width = 800, height = 600;
        const simulation = d3.forceSimulation(graph.vertexSet.map(v => v.position))
        .force("link", d3.forceLink(graph.edgeSet.map(e => ({
            source: graph.vertexSet.indexOf(e.vertex1),
            target: graph.vertexSet.indexOf(e.vertex2)
        }))).id(d => d.index))
        .force("charge", d3.forceManyBody().strength(-600))
        .force("center", d3.forceCenter(width / 2, height / 2));

        simulation.nodes(graph.vertexSet.map(v => v.position));

        // Update the simulation links with any new edges
        const updatedLinks = graph.edgeSet.map(e => ({
            source: graph.vertexSet.indexOf(e.vertex1),
            target: graph.vertexSet.indexOf(e.vertex2)
        }));
        simulation.force("link").links(updatedLinks);
    
        // Restart the simulation with the new data
        simulation.alpha(1).restart();
        percentiles = calculateDegreePercentiles(graph);
        // Redraw the graph with the new vertex and edges
        graph.draw(g.node(), simulation, percentiles);
    } catch (error) {
        console.error("Failed to reset the graph:", error);
    }
}