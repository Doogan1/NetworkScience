function defineDragBehavior(simulation) {
    let isVertexBeingDragged = false;

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

export class Vertex {
    constructor(x, y, id) {
        this.position = { x, y };
        this.id = id;
        this.edges = [];
        this.percentile = 1;
    }

    draw(g, simulation, fillColor) {
        // Convert the container to a D3 selection if it's not already one
        let gSelection = d3.select(g);
    
        // Bind the vertex data to a circle. If the circle doesn't exist, enter() will create it.
        let d3Circle = gSelection.selectAll(`#vertex-${this.id}`)
            .data([this.position], d => d.id);
        
        //Get Value of the vertex scaling slider
        const vertexSizeSlider = document.getElementById('vertex-size-slider');
        const slider = vertexSizeSlider.value;
        // Calculate radius based on percentile in degree distribution
        const radius = (10 + this.percentile * 50) * slider;    //between 10 and 60.  consider adjusting this with a spline and have a "width" and min radius controlled with a slider
        // Enter selection: Create the circle if it doesn't exist
        d3Circle.enter().append('circle')
            .attr('class', 'circle')
            .attr('id', `vertex-${this.id}`)
            .attr('fill', fillColor)
            .attr('r', radius)
            .merge(d3Circle) // Merge enter and update selections
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .call(simulation ? defineDragBehavior(simulation) : () => {})
            .on('mouseover', (event, d) => {
                d3.select(event.target).style('fill', 'yellow');
                d3.select('#tooltip')
                    .style('opacity', 1)
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY + 10}px`)
                    .html(`ID: ${this.id}<br>Degree: ${this.edges.length}`);
            })
            .on('mouseout', () => {
                d3.select(event.target).style('fill', fillColor);
                d3.select('#tooltip').style('opacity', 0);
            });
    
        // If the circles are already created, this will update their positions.
        d3Circle.attr('cx', d => d.x)
            .attr('cy', d => d.y);
    
        // Remove any circles that no longer have corresponding data
        d3Circle.exit().remove();
    }

    updatePercentile(graph) {
        const degrees = graph.vertexSet.map(v => v.edges.length);
        const maxDegree = Math.max(...degrees);
        if (maxDegree > 0) {
            this.percentile = (this.edges.length || 0) / maxDegree;
        } else {
            this.percentile = 0;
        }
    }
    
}

export class Edge {
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

export class Graph {
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

        //define color scale to be used on coloring vertices based on degree percentile rank
        const colorScale = d3.scaleLinear()
                     .domain([0, 1]) // From 0% to 100%
                     .range(["#fff", "red"]);
        // Draw edges
        this.edgeSet.forEach(edge => edge.draw(g));

        //const percentiles = calculateDegreePercentiles(this);

        // Draw vertices
        this.vertexSet.forEach(vertex => {
            const fillColor = colorScale(vertex.percentile);
            vertex.draw(g, simulation, fillColor);
        });
    }

    clear() {
        this.vertexSet = [];
        this.edgeSet = [];
    }
}