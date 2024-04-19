import { Vertex, Edge, Graph} from './graphClasses.js';
import { calculateDegreePercentiles, calculateGraphDensity, repulsionFromDensity, distanceFromDensity } from './graphStats.js';

var width = 800;
var height = 750;

function addEdge(graph, sourceVertex, targetVertex) {
    const newEdge = new Edge(sourceVertex, targetVertex);

    graph.addEdge(newEdge);

}

function updatePositions(graph) {
    graph.vertexSet.map(v => v.position).forEach((d, i) => {
        graph.vertexSet[i].position.x = d.x;
        graph.vertexSet[i].position.y = d.y;
    });
}

export function setupForceSimulation(graph, simulation, g) {
    const density = calculateGraphDensity(graph);

    // Adjust force strength and distance based on density, stronger repulsion for denser graphs, higher distance for denser graphs
    const repulsionStrength = repulsionFromDensity(density);
    simulation = d3.forceSimulation(graph.vertexSet.map(v => v.position))
        .force("link", d3.forceLink(graph.edgeSet.map(e => ({
            source: graph.vertexSet.indexOf(e.vertex1),
            target: graph.vertexSet.indexOf(e.vertex2)
        }))).id(d => d.index).distance(distanceFromDensity(density, graph.vertexSet.length)))
        .force("charge", d3.forceManyBody().strength(repulsionStrength))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(d => d.radius));

    simulation.alphaDecay(0.1);

    let tickCounter = 0;
    // Handle the simulation "tick"
    simulation.on("tick", () => {
        tickCounter++;
        if (tickCounter % 10 === 0) { // Update every 10 ticks
            updatePositions(graph);
        }
        // Redraw the graph
        graph.draw(g.node(), simulation);
    });

    return simulation;
}

// Update the collision force radius when the vertex sizes change
export function updateCollisionRadius(simulation, graph) {
    simulation.force("collide").radius(d => {
        const vertex = graph.vertexSet.find(v => v.position === d);
        return vertex ? vertex.radius : 10; // Default to 10 if not found
    });
    simulation.alpha(1).restart(); // Reheat and restart the simulation
}

export function createGraphFromJson(json, svgContainer) {
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

export function addKVerticesWithPreferentialAttachment(graph, g, simulation, k) {
    const size = graph.edgeSet.length;
    const order = graph.vertexSet.length;
    // Ensure k is less than or equal to the number of available vertices
    if (k > order) {
        alert("Please select a value of k less than or equal to the number of vertices.")
        return;
    }
    const isNoPrefAttachMode = document.getElementById('noPrefAttachMode').checked;

    // Calculate weights for weighted sampling.
    let weights = [];
    if (isNoPrefAttachMode) {
        weights = graph.vertexSet.map(vertex => 1 / order);
    } else {
        weights = graph.vertexSet.map(vertex => vertex.edges.length / (2 * size));
    }
    
    // Create the new vertex
    const newVertexId = `${graph.vertexSet.length}`;
    const newVertex = new Vertex(Math.random() * 800, Math.random() * 600, newVertexId);
    graph.addVertex(newVertex);
    
    

    function weightedSampleWithoutReplacement(k, weights) {
        let sampledIndices = [];
        for (let i = 0; i < k; i++) {
            let index = -1, r = Math.random();
            while (r > 0) {
                index++;
                r -= weights[index];
            }

            // Add the selected index to the sampled list
            sampledIndices.push(index);
            // Will set the weight of the chosen vertex to 0, so we need to scale the other weights so they all add up to 1 
            weights = weights.map(weight => weight / (1 - weights[index]));
            // Set the weights of the chosen vertex to 0- to prevent re-selection
            weights[index] = 0;
            
        }
        return sampledIndices;
    }

    let sampledIndices = weightedSampleWithoutReplacement(k, weights);
    // connect the new vertex to the sampled vertices
    sampledIndices.forEach(index => {
        //Diagnostic console.log(`Preparing to add a new edge between ${newVertex.id} and ${graph.vertexSet[index].id}.  The index is ${index}`);
        addEdge(graph, newVertex, graph.vertexSet[index]);
    });

    simulation.nodes(graph.vertexSet.map(v => v.position));
    const updatedLinks = graph.edgeSet.map(e => ({
        source: graph.vertexSet.indexOf(e.vertex1),
        target: graph.vertexSet.indexOf(e.vertex2)
    }));
    const density = calculateGraphDensity(graph);
    // Update simulation with new links and repulsion strength
    const repulsionStrengthSlider = document.getElementById('repulsion-strength-slider');
    const repulsionStrength = -parseInt(repulsionStrengthSlider.value,10);
    simulation.force("link", d3.forceLink(graph.edgeSet.map(e => ({
        source: graph.vertexSet.indexOf(e.vertex1),
        target: graph.vertexSet.indexOf(e.vertex2)
    }))).id(d => d.index).distance(distanceFromDensity(density, graph.vertexSet.length)));
    simulation.force("charge", d3.forceManyBody().strength(repulsionStrength));
    simulation.alpha(1).restart();
    
    // Update percentiles for all vertices
    graph.vertexSet.forEach(vertex => {
        vertex.updatePercentile(graph);
    });

    graph.draw(g.node(), simulation);
}

export function addVertexWithPreferentialAttachment(graph, g, simulation) {
    // Generate a unique ID for the new vertex
    const order = graph.vertexSet.length;
    const size = graph.edgeSet.length;

    const isNoPrefAttachMode = document.getElementById('noPrefAttachMode').checked;

    const newVertexId = `${graph.vertexSet.length}`;
    const newVertex = new Vertex(Math.random() * 800, Math.random() * 600, newVertexId);
    graph.addVertex(newVertex);

    // Update percentiles for all vertices
    graph.vertexSet.forEach(vertex => {
        vertex.updatePercentile(graph);
    });

    // introduce flag to redraw edges if no edges are drawn

    let edgeAdded = false;

    // Add edges to existing vertices based on preferential attachment

    while (!edgeAdded) {
        graph.vertexSet.forEach(vertex => {
            if (vertex !== newVertex && vertex.edges.length > 0) { // Exclude the new vertex and isolated vertices
                let attachmentProbability = 0;
                if (isNoPrefAttachMode) {
                    attachmentProbability = 1 / order;
                } else {
                    attachmentProbability = vertex.edges.length / (2 * size);
                }
                if (Math.random() < attachmentProbability) {
                    addEdge(graph, newVertex, vertex); 
                    edgeAdded = true;
                }
            }
        });
    }

    simulation.nodes(graph.vertexSet.map(v => v.position));
    const repulsionStrengthSlider = document.getElementById('repulsion-strength-slider');
    const repulsionStrength = -parseInt(repulsionStrengthSlider.value,10);
    // Update the simulation links with any new edges
    const density = calculateGraphDensity(graph);
    simulation.force("link", d3.forceLink(graph.edgeSet.map(e => ({
        source: graph.vertexSet.indexOf(e.vertex1),
        target: graph.vertexSet.indexOf(e.vertex2)
    }))).id(d => d.index).distance(distanceFromDensity(density, graph.vertexSet.length)));

    simulation.force("charge", d3.forceManyBody().strength(repulsionStrength));

    // Restart the simulation with the new data
    simulation.alpha(1).restart();
    
    // Redraw the graph with the new vertex and edges
    graph.draw(g.node(), simulation); 
}

