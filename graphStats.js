export function calculateDegreePercentiles(graph) {
    const degrees = graph.vertexSet.map(vertex => vertex.edges.length || 0); // Assuming `edges` count as degree
    const sortedDegrees = [...degrees].sort((a, b) => a - b);
    const maxDegree = sortedDegrees[sortedDegrees.length - 1];

    // Calculate percentile for each degree
    let percentiles = degrees.map(degree => degree / maxDegree);

    return percentiles;
}

export function chartDataFromGraph(graph) {
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

export function drawDegreeDistributionChart(data) {
    const svg = d3.select("#degreeDistributionChart");
    svg.selectAll("*").remove(); // Clear the SVG for redrawing

    const margin = { top: 20, right: 20, bottom: 30, left: 40 }

    const boundingRect = svg.node().getBoundingClientRect();
    const width = boundingRect.width - margin.left - margin.right;
    const height = boundingRect.height - margin.top - margin.bottom;

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

export function updateGraphStatistics(graph) {
    const vertexCount = graph.vertexSet.length;
    const edgeCount = graph.edgeSet.length;
    const avgDeg = (2 * edgeCount) / vertexCount;

    // Update the HTML content
    document.getElementById('vertex-count').textContent = vertexCount;
    document.getElementById('edge-count').textContent = edgeCount;
    document.getElementById('avg-degree').textContent = avgDeg.toFixed(2);
}