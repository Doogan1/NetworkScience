import { createGraphFromJson, addKVerticesWithPreferentialAttachment, addVertexWithPreferentialAttachment, setupForceSimulation} from './graphManipulation.js';
import { calculateDegreePercentiles, chartDataFromGraph, drawDegreeDistributionChart, updateGraphStatistics, repulsionFromDensity} from './graphStats.js';




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

    //calculate percentiles for coloring vertices
    let percentiles = calculateDegreePercentiles(graph);
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

    
    
    // Handle the simulation "tick"
    simulation.on("tick", () => {
        // Update vertex positions based on simulation
        graph.vertexSet.map(v => v.position).forEach((d, i) => {
            graph.vertexSet[i].position.x = d.x;
            graph.vertexSet[i].position.y = d.y;
        });
        let percentiles = calculateDegreePercentiles(graph);
        // Redraw the graph
        graph.draw(g.node(), simulation, percentiles);
    });
});

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
        let percentiles = calculateDegreePercentiles(graph);
        // Redraw the graph with the new vertex and edges
        graph.draw(g.node(), simulation, percentiles);
        // Update statistics
        updateGraphStatistics(graph);
        degreeChartData = chartDataFromGraph(graph);
        drawDegreeDistributionChart(degreeChartData);
    } catch (error) {
        console.error("Failed to reset the graph:", error);
    }
}