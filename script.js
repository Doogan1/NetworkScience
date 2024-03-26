    // Width and height
    var width = 800, height = 600;

    // Setup the SVG
    var svg = d3.select("#network").append("svg")
        .attr("width", width)
        .attr("height", height);

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

    // Setup the force layout
    var simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(function(d) { return d.index; }))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Create the link lines.
    var link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter().append("line")
        .attr("stroke-width", 2);

    // Create the node circles.
    var node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .enter().append("circle")
        .attr("r", 10)
        .attr("fill", "red");

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