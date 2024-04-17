import { createGraphFromJson, addKVerticesWithPreferentialAttachment, addVertexWithPreferentialAttachment, setupForceSimulation, updateCollisionRadius} from './graphManipulation.js';
import { chartDataFromGraph, drawDegreeDistributionChart, updateGraphStatistics} from './graphStats.js';
import { Vertex, Edge, applyDrag} from './graphClasses.js';




let graph;
let degreeChartData;

document.addEventListener('DOMContentLoaded', async () => {
    // Width and height
    var width = 800, height = 750;
    let isVertexBeingDragged = false;
        // Setup the SVG and the group (g) element
    var svg = d3.select("#network").append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .call(d3.zoom().on("zoom", function (event) {
            if (!isVertexBeingDragged) {
                g.attr("transform", event.transform);
            }
        }))
        //.append("g");
    
    var g = svg.append("g"); // All visual elements will be added to this group

    populateSavedGraphsDropdown();

    svg.call(d3.zoom().on("zoom", function (event) {
        g.attr("transform", event.transform); // Apply the transformation to the group element
    }));

    const res = await fetch('petersen_graph_data.json');
    const graphData = await res.json();

    graph = createGraphFromJson(graphData, svg.node());

        // Setup the force layout
    //const nodes = graph.vertexSet.map(v => v.position);
    //const links = graph.edgeSet.map(e => ({
        //source: graph.vertexSet.indexOf(e.vertex1),
        //target: graph.vertexSet.indexOf(e.vertex2)
    //}));
    //calculate order and size and display this to the user
    updateGraphStatistics(graph);
    //calculate degree distribution and then draw the chart
    degreeChartData = chartDataFromGraph(graph);
    drawDegreeDistributionChart(degreeChartData);

    
    
    // Initialize the simulation
    // const simulation = d3.forceSimulation(graph.vertexSet.map(v => v.position))
    //     .force("link", d3.forceLink(graph.edgeSet.map(e => ({
    //         source: graph.vertexSet.indexOf(e.vertex1),
    //         target: graph.vertexSet.indexOf(e.vertex2)
    //     }))).id(d => d.index))
    //     .force("charge", d3.forceManyBody().strength(-600))
    //     .force("center", d3.forceCenter(width / 2, height / 2));

    const simulation = setupForceSimulation(graph);
    
    // document.getElementById('addVertexBtn').addEventListener('click', () => {
    //     addVertexWithPreferentialAttachment(graph, g, simulation);
    //     degreeChartData = chartDataFromGraph(graph);
    //     drawDegreeDistributionChart(degreeChartData);
    // });
    // listen for changes in the vertex add mode selection and have the numEdgesInput display if that mode is selected
    document.querySelectorAll('input[name="vertexAddMode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            // Show the input field if the "Specify Number of Edges" mode is selected
            if(document.getElementById('specifyEdgesMode').checked) {
                document.getElementById('numEdgesInput').style.display = 'block';
            } else {
                document.getElementById('numEdgesInput').style.display = 'none';
            }
        });
    });

    let addVertexInterval;

    const addVertexRepeatedly = (k) => {
        if (!k) {
            addVertexWithPreferentialAttachment(graph, g, simulation);
        } else {
            addKVerticesWithPreferentialAttachment(graph, g, simulation, k);
        }
        updateGraphStatistics(graph);
        degreeChartData = chartDataFromGraph(graph);
        drawDegreeDistributionChart(degreeChartData);
    };

    document.getElementById('addVertexBtn').addEventListener('mousedown', () => {
        const isSpecifyEdgesMode = document.getElementById('specifyEdgesMode').checked;
        let k = null;
        if (isSpecifyEdgesMode) {
            k = parseInt(document.getElementById('numEdgesInput').value, 10) || 1;
        }
        addVertexRepeatedly(k); // Add once immediately for responsiveness
        addVertexInterval = setInterval(addVertexRepeatedly, 250, k); // Adjust interval as needed
    });

    let selectedGraphName = "";

    function loadSelectedGraph() {
        loadGraphFromLocal(selectedGraphName);
    };

    document.getElementById('savedGraphsDropdown').addEventListener('change', function() {
        selectedGraphName = this.value;
    });

    document.getElementById('loadGraph').addEventListener('click', loadSelectedGraph);

    const stopAddingVertex = () => {
        if (addVertexInterval) {
            clearInterval(addVertexInterval);
            addVertexInterval = null;
        }
    };

    document.getElementById('addVertexBtn').addEventListener('mouseup', stopAddingVertex);
    document.getElementById('addVertexBtn').addEventListener('mouseleave', stopAddingVertex);

    document.getElementById('resetGraphBtn').addEventListener('click', () => {
        graph.clear();
        resetGraph(svg.node(), g); // Pass the SVG container where your graph is drawn
    });

    const vertexSizeSlider = document.getElementById('vertex-size-slider');
    const vertexSizeOutput = document.getElementById('vertex-size-output');
    vertexSizeSlider.addEventListener('input', function() {
        vertexSizeOutput.textContent = this.value;
      //  updateVertexSizes(this.value);
        updateCollisionRadius(simulation, graph); // Update the collision radius in the simulation
        graph.draw(g.node(), simulation)
    });

    const repulsionStrengthSlider = document.getElementById('repulsion-strength-slider');
    const repulsionStrengthOutput = document.getElementById('repulsion-strength-output');
    repulsionStrengthSlider.addEventListener('input', function() {
        repulsionStrengthOutput.textContent = this.value;
        updateRepulsionStrength(-this.value);
    });
    
    const instructionsCard = document.querySelector('#instructions-card .card-body');
    const toggleBtn = document.getElementById('toggleInstructionsBtn');

    toggleBtn.addEventListener('click', function() {
        // Check the current visibility of the instructions card
        if (instructionsCard.style.display === 'none') {
            instructionsCard.style.display = ''; // Show the card body
            toggleBtn.textContent = 'Hide'; // Update button text
        } else {
            instructionsCard.style.display = 'none'; // Hide the card body
            toggleBtn.textContent = 'Show'; // Update button text
        }
    });

    function updateRepulsionStrength(strength) {
        simulation.force("charge", d3.forceManyBody().strength(+strength));
        simulation.alpha(1).restart(); // Reheat and restart the simulation for changes to take effect
    }
    let tickCounter = 0;
    // Handle the simulation "tick"
    simulation.on("tick", () => {
        tickCounter++;
        if (tickCounter % 10 === 0) { // Update every 10 ticks
            updatePositions();
        }
        // Redraw the graph
        graph.draw(g.node(), simulation);
    });

    document.getElementById('saveBtn').addEventListener('click', function() {
        // Calculate and display graph data
        const numVertices = graph.vertexSet.length;
        const numEdges = graph.edgeSet.length;
        const avgDeg = 2 * numEdges / numVertices;
    
        document.getElementById('numVertices').textContent = `Number of vertices: ${numVertices}`;
        document.getElementById('numEdges').textContent = `Number of edges: ${numEdges}`;
        document.getElementById('avgDeg').textContent = `Average degree: ${avgDeg}`;
    
        // Show the modal
        $('#saveGraphModal').modal('show');
    });
    
    document.getElementById('saveGraph').addEventListener('click', function() {
        const graphName = document.getElementById('graphName').value.trim();
        if (graphName) {
            saveGraphToLocal(graph, graphName);
            $('#saveGraphModal').modal('hide');
        } else {
            alert('Please enter a name for the graph.');
        }
        populateSavedGraphsDropdown();
    });
    
    function saveGraphToLocal(graph, graphName) {
        const prefixedName = 'graph_' + graphName; //Add prefix to graph name
        const graphData = {
            vertices: graph.vertexSet.map(vertex => ({ id: vertex.id, x: vertex.position.x, y: vertex.position.y })),
            edges: graph.edgeSet.map(edge => ({ source: edge.vertex1.id, target: edge.vertex2.id }))
        };
    
        localStorage.setItem(prefixedName, JSON.stringify(graphData));
    }

    function loadGraphFromLocal(graphName) {
        const graphDataString = localStorage.getItem(graphName);
        if (graphDataString) {
            const graphData = JSON.parse(graphDataString);
            
            // Clear current graph
            graph.clear();
    
            // Reconstruct vertices
            graphData.vertices.forEach(vData => {
                const newVertex = new Vertex(vData.x, vData.y, vData.id);
                graph.addVertex(newVertex);
            });
    
            // Reconstruct edges
            graphData.edges.forEach(eData => {
                const sourceVertex = graph.vertexSet.find(v => v.id === eData.source);
                const targetVertex = graph.vertexSet.find(v => v.id === eData.target);
                if (sourceVertex && targetVertex) {
                    const newEdge = new Edge(sourceVertex, targetVertex);
                    graph.addEdge(newEdge);
                }
            });
    
            // Update the visualization
            updateGraphVisualization(simulation);  
        } else {
            alert("No graph data found for the specified name.");
        }
    }
    
    function populateSavedGraphsDropdown() {
        const dropdown = document.getElementById('savedGraphsDropdown');

        // Clear existing options
        while (dropdown.options.length > 1) {  // assuming the first option is "Select a graph to load" and should not be removed
            dropdown.remove(1);
        }
        // Populate with graphs from local storage
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('graph_')) { // Only add stored graphs
                let option = new Option(key.substring(6), key); // Remove prefix
                dropdown.add(option);
            }
        });
    }

    function updateGraphVisualization() {
        // Redraw the graph based on the vertexSet and edgeSet of the current graph object

        // Update percentiles for all vertices
        graph.vertexSet.forEach(vertex => {
            vertex.updatePercentile(graph);
        });

        // Reinitialize simulation with new/old data
        const simulation = setupForceSimulation(graph);
        const repulsionStrengthSlider = document.getElementById('repulsion-strength-slider');
        const repulsionStrength = -parseInt(repulsionStrengthSlider.value,10);
        simulation.nodes(graph.vertexSet.map(v => v.position));

        // Update the simulation links with any new edges
        const updatedLinks = graph.edgeSet.map(e => ({
            source: graph.vertexSet.indexOf(e.vertex1),
            target: graph.vertexSet.indexOf(e.vertex2)
        }));
        simulation.force("link").links(updatedLinks);
        
        simulation.force("charge", d3.forceManyBody().strength(repulsionStrength));

        // Reapply drag behavior
        applyDrag(simulation, g.node());

        // Restart the simulation with the new data
        simulation.alpha(1).restart();
        // Redraw the graph with the new vertex and edges
        graph.draw(g.node(), simulation);
        // Update statistics
        updateGraphStatistics(graph);
        degreeChartData = chartDataFromGraph(graph);
        drawDegreeDistributionChart(degreeChartData);

    }
    
});

function updatePositions() {
    graph.vertexSet.map(v => v.position).forEach((d, i) => {
        graph.vertexSet[i].position.x = d.x;
        graph.vertexSet[i].position.y = d.y;
    });
}
async function resetGraph(svgContainer, g) {
    try {
        const res = await fetch('petersen_graph_data.json');
        const graphData = await res.json();
        // Assuming `graph` is accessible and has a method to clear its current state
        Object.assign(graph, createGraphFromJson(graphData, svgContainer));
        // You might need to reapply the force simulation setup here as well
        degreeChartData = chartDataFromGraph(graph);
        drawDegreeDistributionChart(degreeChartData);
     // Reinitialize simulation with new/old data
        const simulation = setupForceSimulation(graph);

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
        graph.draw(g.node(), simulation);
        // Update statistics
        updateGraphStatistics(graph);
        degreeChartData = chartDataFromGraph(graph);
        drawDegreeDistributionChart(degreeChartData);
    } catch (error) {
        console.error("Failed to reset the graph:", error);
    }
}