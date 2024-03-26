    // Width and height
    var width = 800, height = 600;

    // Setup the SVG and the group (g) element
    var svg = d3.select("#network").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", function (event) {
            g.attr("transform", event.transform);
        }))
        .append("g");

    var g = svg.append("g"); // All visual elements will be added to this group

    // Sample data: nodes and links
    var nodes = [
        {id: "Node 1"}, {id: "Node 2"}, {id: "Node 3"},
        {id: "Node 4"}, {id: "Node 5"}
    ];

    var links = [
        {source: 0, target: 1}, {source: 1, target: 2},
        {source: 2, target: 3}, {source: 3, target: 4},
        {source: 0, target: 4}
    ];

    var drag = d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart(); // Reheat the simulation
        d.fx = d.x; // Fix the position of the node
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x; // Set the fixed position to the current pointer position
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0); // Cool down the simulation
        d.fx = null; // Unfix the position
        d.fy = null;
    }

    // Setup the force layout
    var simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.index))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Create the link lines in the group
    var link = g.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("stroke-width", 2);

    // Create the node circles in the group
    var node = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 10)
        .call(drag);

    // Update positions each tick
    simulation.on("tick", function() {
        link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
    });