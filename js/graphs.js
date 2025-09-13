class GraphManager {
    constructor() {
        this.graphs = {};
    }

    createAllGraphs() {
        if (!window.profileManager) return;

        this.createXpOverTimeGraph();
        this.createSuccessRateGraph();
        this.createXpByTypeGraph();
        this.createMonthlyProgressGraph();
        this.createAuditRatioGraph();
        this.createFailedAuditsGraph();
    }

    createXpOverTimeGraph() {
        const container = document.getElementById('xpOverTimeGraph');
        if (!container) return;

        const data = window.profileManager.getXpOverTimeData();
        if (data.length === 0) {
            container.innerHTML = '<p>No XP data available</p>';
            return;
        }

        const width = 280;
        const height = 200;
        const margin = { top: 20, right: 20, bottom: 40, left: 50 };

        const svg = this.createSVG(container, width, height);
        
        // Create scales
        const xScale = this.createTimeScale(data, width - margin.left - margin.right, margin.left);
        const yScale = this.createLinearScale(data.map(d => d.xp), height - margin.top - margin.bottom, margin.top);

        // Create gradient
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'xpGradient')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', height - margin.bottom)
            .attr('x2', 0).attr('y2', margin.top);

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#667eea')
            .attr('stop-opacity', 0.3);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#667eea')
            .attr('stop-opacity', 0);

        // Create area
        const area = d3.area()
            .x(d => xScale(d.date))
            .y0(height - margin.bottom)
            .y1(d => yScale(d.xp))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(data)
            .attr('class', 'graph-area')
            .attr('d', area);

        // Create line
        const line = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.xp))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(data)
            .attr('class', 'graph-line')
            .attr('d', line);

        // Add dots
        svg.selectAll('.dot')
            .data(data)
            .enter().append('circle')
            .attr('class', 'dot')
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScale(d.xp))
            .attr('r', 3)
            .attr('fill', '#667eea')
            .attr('stroke', 'white')
            .attr('stroke-width', 2);

        // Add axes
        this.addXAxis(svg, xScale, height - margin.bottom, margin.left);
        this.addYAxis(svg, yScale, margin.left, margin.top);

        // Add title
        svg.append('text')
            .attr('class', 'graph-title')
            .attr('x', width / 2)
            .attr('y', 15)
            .attr('text-anchor', 'middle')
            .text('Cumulative XP Over Time');
    }

    createSuccessRateGraph() {
        const container = document.getElementById('successRateGraph');
        if (!container) return;

        const data = window.profileManager.getProjectSuccessData();
        if (data.length === 0) {
            container.innerHTML = '<p>No project data available</p>';
            return;
        }

        const width = 280;
        const height = 200;
        const radius = Math.min(width, height) / 2 - 20;

        const svg = this.createSVG(container, width, height);
        const g = svg.append('g')
            .attr('transform', `translate(${width/2},${height/2})`);

        const pie = d3.pie()
            .value(d => d.value)
            .sort(null);

        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);

        const arcs = g.selectAll('.arc')
            .data(pie(data))
            .enter().append('g')
            .attr('class', 'arc');

        arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.color)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 0.8);
            })
            .on('mouseout', function(event, d) {
                d3.select(this).attr('opacity', 1);
            });

        // Add labels
        arcs.append('text')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('class', 'graph-text')
            .style('font-weight', 'bold')
            .text(d => `${d.data.value} ${d.data.label}`);

        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${width - 100}, 20)`);

        data.forEach((d, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);

            legendItem.append('rect')
                .attr('width', 12)
                .attr('height', 12)
                .attr('fill', d.color);

            legendItem.append('text')
                .attr('x', 16)
                .attr('y', 9)
                .attr('class', 'graph-text')
                .text(d.label);
        });
    }

    createXpByTypeGraph() {
        const container = document.getElementById('xpByTypeGraph');
        if (!container) return;

        const data = window.profileManager.getXpByTypeData();
        if (data.length === 0) {
            container.innerHTML = '<p>No XP data available</p>';
            return;
        }

        const width = 280;
        const height = 200;
        const margin = { top: 20, right: 20, bottom: 40, left: 50 };

        const svg = this.createSVG(container, width, height);

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([margin.left, width - margin.right])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)])
            .range([height - margin.bottom, margin.top]);

        // Create bars
        svg.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'graph-bar')
            .attr('x', d => xScale(d.label))
            .attr('y', d => yScale(d.value))
            .attr('width', xScale.bandwidth())
            .attr('height', d => height - margin.bottom - yScale(d.value))
            .attr('fill', d => d.color)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 0.8);
            })
            .on('mouseout', function(event, d) {
                d3.select(this).attr('opacity', 1);
            });

        // Add value labels on bars
        svg.selectAll('.bar-label')
            .data(data)
            .enter().append('text')
            .attr('class', 'graph-text')
            .attr('x', d => xScale(d.label) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.value) - 5)
            .attr('text-anchor', 'middle')
            .text(d => d.value.toLocaleString());

        // Add axes
        this.addXAxis(svg, xScale, height - margin.bottom, margin.left);
        this.addYAxis(svg, yScale, margin.left, margin.top);
    }

    createMonthlyProgressGraph() {
        const container = document.getElementById('monthlyProgressGraph');
        if (!container) return;

        const data = window.profileManager.getMonthlyProgressData();
        if (data.length === 0) {
            container.innerHTML = '<p>No monthly data available</p>';
            return;
        }

        const width = 280;
        const height = 200;
        const margin = { top: 20, right: 20, bottom: 40, left: 50 };

        const svg = this.createSVG(container, width, height);

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.month))
            .range([margin.left, width - margin.right])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.xp)])
            .range([height - margin.bottom, margin.top]);

        // Create bars
        svg.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'graph-bar')
            .attr('x', d => xScale(d.month))
            .attr('y', d => yScale(d.xp))
            .attr('width', xScale.bandwidth())
            .attr('height', d => height - margin.bottom - yScale(d.xp))
            .attr('fill', '#667eea')
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 0.8);
            })
            .on('mouseout', function(event, d) {
                d3.select(this).attr('opacity', 1);
            });

        // Add value labels
        svg.selectAll('.bar-label')
            .data(data)
            .enter().append('text')
            .attr('class', 'graph-text')
            .attr('x', d => xScale(d.month) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.xp) - 5)
            .attr('text-anchor', 'middle')
            .text(d => d.xp.toLocaleString());

        // Add axes
        this.addXAxis(svg, xScale, height - margin.bottom, margin.left);
        this.addYAxis(svg, yScale, margin.left, margin.top);
    }

    createAuditRatioGraph() {
        const container = document.getElementById('auditRatioGraph');
        if (!container) return;

        const data = window.profileManager.getAuditRatioData();
        if (data.length === 0) {
            container.innerHTML = '<p>No audit data available</p>';
            return;
        }

        const width = 280;
        const height = 200;
        const radius = Math.min(width, height) / 2 - 20;

        const svg = this.createSVG(container, width, height);
        const g = svg.append('g')
            .attr('transform', `translate(${width/2},${height/2})`);

        const pie = d3.pie()
            .value(d => d.value)
            .sort(null);

        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);

        const arcs = g.selectAll('.arc')
            .data(pie(data))
            .enter().append('g')
            .attr('class', 'arc');

        arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => d.data.color)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 0.8);
            })
            .on('mouseout', function(event, d) {
                d3.select(this).attr('opacity', 1);
            });

        // Add labels
        arcs.append('text')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('class', 'graph-text')
            .style('font-weight', 'bold')
            .text(d => `${d.data.value} ${d.data.label}`);

        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${width - 100}, 20)`);

        data.forEach((d, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);

            legendItem.append('rect')
                .attr('width', 12)
                .attr('height', 12)
                .attr('fill', d.color);

            legendItem.append('text')
                .attr('x', 16)
                .attr('y', 9)
                .attr('class', 'graph-text')
                .text(d.label);
        });
    }

    createFailedAuditsGraph() {
        const container = document.getElementById('failedAuditsGraph');
        if (!container) return;

        const data = window.profileManager.getFailedAuditsData();
        if (data.length === 0) {
            container.innerHTML = '<p>No failed audit data available</p>';
            return;
        }

        const width = 280;
        const height = 200;
        const margin = { top: 20, right: 20, bottom: 40, left: 40 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const svg = this.createSVG(container, width, height);
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([0, chartWidth])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)])
            .range([chartHeight, 0]);

        // Create bars
        g.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.label))
            .attr('width', xScale.bandwidth())
            .attr('y', d => yScale(d.value))
            .attr('height', d => chartHeight - yScale(d.value))
            .attr('fill', '#dc3545')
            .attr('stroke', '#c82333')
            .attr('stroke-width', 1)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('opacity', 0.8);
            })
            .on('mouseout', function(event, d) {
                d3.select(this).attr('opacity', 1);
            });

        // Add value labels on bars
        g.selectAll('.bar-label')
            .data(data)
            .enter().append('text')
            .attr('class', 'bar-label')
            .attr('x', d => xScale(d.label) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.value) - 5)
            .attr('text-anchor', 'middle')
            .attr('class', 'graph-text')
            .style('font-weight', 'bold')
            .text(d => d.value);

        // Add axes
        g.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .attr('class', 'graph-text')
            .attr('transform', 'rotate(-45)');

        g.append('g')
            .call(d3.axisLeft(yScale))
            .selectAll('text')
            .attr('class', 'graph-text');
    }

    createSVG(container, width, height) {
        container.innerHTML = '';
        return d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height);
    }

    createTimeScale(data, width, offset) {
        const dates = data.map(d => d.date);
        return d3.scaleTime()
            .domain(d3.extent(dates))
            .range([offset, width + offset]);
    }

    createLinearScale(data, height, offset) {
        return d3.scaleLinear()
            .domain([0, d3.max(data)])
            .range([height + offset, offset]);
    }

    addXAxis(svg, scale, y, x) {
        svg.append('g')
            .attr('transform', `translate(0,${y})`)
            .call(d3.axisBottom(scale).tickFormat(d3.timeFormat('%m/%d')))
            .selectAll('text')
            .attr('class', 'graph-text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.15em')
            .attr('transform', 'rotate(-45)');
    }

    addYAxis(svg, scale, x, y) {
        svg.append('g')
            .attr('transform', `translate(${x},0)`)
            .call(d3.axisLeft(scale).tickFormat(d3.format('~s')))
            .selectAll('text')
            .attr('class', 'graph-text');
    }
}

// Initialize graph manager
const graphManager = new GraphManager();
window.graphManager = graphManager;