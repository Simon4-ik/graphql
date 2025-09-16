class GraphManager {
    constructor() {
        this.graphs = {};
    }

    createAllGraphs() {
        if (!window.profileManager) return;

        this.createXpProgressionGraph();
        this.createXpOverTimeGraph();
        this.createSuccessRateGraph();
        this.createXpByTypeGraph();
        this.createMonthlyProgressGraph();
        this.createAuditRatioGraph();
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
        const margin = { top: 30, right: 30, bottom: 50, left: 60 };

        const svg = this.createSVG(container, width, height);
        
        // Create scales
        const xScale = this.createTimeScale(data, width - margin.left - margin.right, margin.left);
        const yScale = this.createLinearScale(data.map(d => d.xp), height - margin.top - margin.bottom, margin.top);

        // Create gradient for area fill
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'xpGradient')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', height - margin.bottom)
            .attr('x2', 0).attr('y2', margin.top);

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#667eea')
            .attr('stop-opacity', 0.4);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#667eea')
            .attr('stop-opacity', 0.1);

        // Add grid lines
        this.addGridLines(svg, xScale, yScale, width, height, margin);

        // Create area
        const area = d3.area()
            .x(d => xScale(d.date))
            .y0(height - margin.bottom)
            .y1(d => yScale(d.xp))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(data)
            .attr('class', 'graph-area')
            .attr('d', area)
            .attr('fill', 'url(#xpGradient)')
            .attr('opacity', 0.8);

        // Create line
        const line = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.xp))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(data)
            .attr('class', 'graph-line')
            .attr('d', line)
            .attr('fill', 'none')
            .attr('stroke', '#667eea')
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round');

        // Add interactive dots
        const dots = svg.selectAll('.dot')
            .data(data)
            .enter().append('circle')
            .attr('class', 'dot')
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScale(d.xp))
            .attr('r', 0)
            .attr('fill', '#667eea')
            .attr('stroke', 'white')
            .attr('stroke-width', 3)
            .style('cursor', 'pointer');

        // Animate dots
        dots.transition()
            .duration(1000)
            .delay((d, i) => i * 100)
            .attr('r', 5);

        // Add hover effects
        dots.on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 8)
                .attr('fill', '#764ba2');
        })
        .on('mouseout', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 5)
                .attr('fill', '#667eea');
        });

        // Add axes
        this.addXAxis(svg, xScale, height - margin.bottom, margin.left);
        this.addYAxis(svg, yScale, margin.left, margin.top);

        // Add title
        svg.append('text')
            .attr('class', 'graph-title')
            .attr('x', width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text('XP Progression Chart');
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
        const margin = { top: 30, right: 30, bottom: 50, left: 60 };

        const svg = this.createSVG(container, width, height);

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([margin.left, width - margin.right])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)])
            .range([height - margin.bottom, margin.top]);

        // Add grid lines
        this.addGridLines(svg, xScale, yScale, width, height, margin);

        // Create gradient for bars
        const barGradient = svg.append('defs')
            .selectAll('linearGradient')
            .data(data)
            .enter().append('linearGradient')
            .attr('id', (d, i) => `barGradient${i}`)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', 0).attr('y2', 1);

        barGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', d => d.color)
            .attr('stop-opacity', 0.9);

        barGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', d => d.color)
            .attr('stop-opacity', 0.6);

        // Create bars with animation
        const bars = svg.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'graph-bar')
            .attr('x', d => xScale(d.label))
            .attr('y', height - margin.bottom)
            .attr('width', xScale.bandwidth())
            .attr('height', 0)
            .attr('fill', (d, i) => `url(#barGradient${i})`)
            .attr('stroke', d => d.color)
            .attr('stroke-width', 2)
            .attr('rx', 4)
            .attr('ry', 4)
            .style('cursor', 'pointer');

        // Animate bars
        bars.transition()
            .duration(1000)
            .delay((d, i) => i * 200)
            .attr('y', d => yScale(d.value))
            .attr('height', d => height - margin.bottom - yScale(d.value));

        // Add hover effects
        bars.on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.8)
                .attr('stroke-width', 3);
        })
        .on('mouseout', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1)
                .attr('stroke-width', 2);
        });

        // Remove value labels on bars - no numbers displayed

        // Add axes
        this.addXAxisBand(svg, xScale, height - margin.bottom, margin.left);
        this.addYAxis(svg, yScale, margin.left, margin.top);

        // Add title
        svg.append('text')
            .attr('class', 'graph-title')
            .attr('x', width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text('XP by Project Type');

        // Add timestamp
        this.addTimestamp('xpByTypeTimestamp');
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
        const margin = { top: 30, right: 30, bottom: 50, left: 60 };

        const svg = this.createSVG(container, width, height);

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.month))
            .range([margin.left, width - margin.right])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.xp)])
            .range([height - margin.bottom, margin.top]);

        // Add grid lines
        this.addGridLines(svg, xScale, yScale, width, height, margin);

        // Create gradient for bars
        const barGradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'monthlyGradient')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', 0)
            .attr('x2', 0).attr('y2', 1);

        barGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#667eea')
            .attr('stop-opacity', 0.9);

        barGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#764ba2')
            .attr('stop-opacity', 0.6);

        // Create bars with animation
        const bars = svg.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'graph-bar')
            .attr('x', d => xScale(d.month))
            .attr('y', height - margin.bottom)
            .attr('width', xScale.bandwidth())
            .attr('height', 0)
            .attr('fill', 'url(#monthlyGradient)')
            .attr('stroke', '#667eea')
            .attr('stroke-width', 2)
            .attr('rx', 4)
            .attr('ry', 4)
            .style('cursor', 'pointer');

        // Animate bars
        bars.transition()
            .duration(1000)
            .delay((d, i) => i * 150)
            .attr('y', d => yScale(d.xp))
            .attr('height', d => height - margin.bottom - yScale(d.xp));

        // Add hover effects
        bars.on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.8)
                .attr('stroke-width', 3)
                .attr('fill', '#ff6b6b');
        })
        .on('mouseout', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1)
                .attr('stroke-width', 2)
                .attr('fill', 'url(#monthlyGradient)');
        });

        // Remove value labels on bars - no numbers displayed

        // Add axes
        this.addXAxisBand(svg, xScale, height - margin.bottom, margin.left);
        this.addYAxis(svg, yScale, margin.left, margin.top);

        // Add title
        svg.append('text')
            .attr('class', 'graph-title')
            .attr('x', width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text('Monthly Progress Chart');

        // Add timestamp
        this.addTimestamp('monthlyProgressTimestamp');
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

    addXAxisBand(svg, scale, y, x) {
        svg.append('g')
            .attr('transform', `translate(0,${y})`)
            .call(d3.axisBottom(scale))
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

    // Add grid lines to charts
    addGridLines(svg, xScale, yScale, width, height, margin) {
        // Vertical grid lines
        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale)
                .tickSize(-height + margin.top + margin.bottom)
                .tickFormat(''))
            .style('opacity', 0.3)
            .selectAll('line')
            .attr('stroke', '#ddd')
            .attr('stroke-dasharray', '2,2');

        // Horizontal grid lines
        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale)
                .tickSize(-width + margin.left + margin.right)
                .tickFormat(''))
            .style('opacity', 0.3)
            .selectAll('line')
            .attr('stroke', '#ddd')
            .attr('stroke-dasharray', '2,2');
    }

    // Add timestamp to charts
    addTimestamp(elementId) {
        const timestampElement = document.getElementById(elementId);
        if (timestampElement) {
            const now = new Date();
            const timestamp = now.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            timestampElement.textContent = `Last updated: ${timestamp}`;
        }
    }


    // Create XP Progression Comparison
    createXpProgressionGraph() {
        const container = document.getElementById('xpProgressionGraph');
        if (!container) return;

        const userData = window.profileManager.getXpOverTimeData();
        if (userData.length === 0) {
            container.innerHTML = '<p>No progression data available</p>';
            return;
        }

        const width = 280;
        const height = 200;
        const margin = { top: 30, right: 30, bottom: 50, left: 60 };

        const svg = this.createSVG(container, width, height);

        // Create scales
        const xScale = this.createTimeScale(userData, width - margin.left - margin.right, margin.left);
        const yScale = this.createLinearScale(userData.map(d => d.xp), height - margin.top - margin.bottom, margin.top);

        // Add grid lines
        this.addGridLines(svg, xScale, yScale, width, height, margin);

        // Create gradient for user line
        const userGradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'userGradient')
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('x1', 0).attr('y1', height - margin.bottom)
            .attr('x2', 0).attr('y2', margin.top);

        userGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#667eea')
            .attr('stop-opacity', 0.4);

        userGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#667eea')
            .attr('stop-opacity', 0.1);

        // Create user area
        const userArea = d3.area()
            .x(d => xScale(d.date))
            .y0(height - margin.bottom)
            .y1(d => yScale(d.xp))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(userData)
            .attr('class', 'graph-area')
            .attr('d', userArea)
            .attr('fill', 'url(#userGradient)')
            .attr('opacity', 0.8);

        // Create user line
        const line = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScale(d.xp))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(userData)
            .attr('class', 'graph-line')
            .attr('d', line)
            .attr('stroke', '#667eea')
            .attr('stroke-width', 4)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('fill', 'none');

        // Create average line (mock data)
        const avgData = userData.map(d => ({
            date: d.date,
            xp: d.xp * 0.3 // Mock average at 30% of user's XP
        }));

        svg.append('path')
            .datum(avgData)
            .attr('class', 'graph-line')
            .attr('d', line)
            .attr('stroke', '#ff6b6b')
            .attr('stroke-width', 3)
            .attr('stroke-dasharray', '8,4')
            .attr('stroke-linecap', 'round')
            .attr('fill', 'none');

        // Add interactive dots for user data
        const userDots = svg.selectAll('.user-dot')
            .data(userData)
            .enter().append('circle')
            .attr('class', 'user-dot')
            .attr('cx', d => xScale(d.date))
            .attr('cy', d => yScale(d.xp))
            .attr('r', 0)
            .attr('fill', '#667eea')
            .attr('stroke', 'white')
            .attr('stroke-width', 3)
            .style('cursor', 'pointer');

        // Animate user dots
        userDots.transition()
            .duration(1000)
            .delay((d, i) => i * 100)
            .attr('r', 6);

        // Add hover effects for user dots
        userDots.on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 10)
                .attr('fill', '#764ba2');
        })
        .on('mouseout', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 6)
                .attr('fill', '#667eea');
        });

        // Add axes
        this.addXAxis(svg, xScale, height - margin.bottom, margin.left);
        this.addYAxis(svg, yScale, margin.left, margin.top);

        // Add title
        svg.append('text')
            .attr('class', 'graph-title')
            .attr('x', width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text('XP Progression Chart');

        // Add legend
        const legend = svg.append('g')
            .attr('transform', `translate(${width - 120}, 40)`);

        const legendItems = [
            { color: '#667eea', text: 'Your Progress', style: 'solid' },
            { color: '#ff6b6b', text: 'Average', style: 'dashed' }
        ];

        legendItems.forEach((item, i) => {
            const legendItem = legend.append('g')
                .attr('transform', `translate(0, ${i * 25})`);

            legendItem.append('line')
                .attr('x1', 0)
                .attr('x2', 20)
                .attr('y1', 0)
                .attr('y2', 0)
                .attr('stroke', item.color)
                .attr('stroke-width', 4)
                .attr('stroke-dasharray', item.style === 'dashed' ? '8,4' : 'none')
                .attr('stroke-linecap', 'round');

            legendItem.append('text')
                .attr('x', 25)
                .attr('y', 5)
                .attr('class', 'graph-text')
                .attr('font-size', '12px')
                .attr('font-weight', 'bold')
                .text(item.text);
        });
    }


}

// Initialize graph manager
const graphManager = new GraphManager();
window.graphManager = graphManager;