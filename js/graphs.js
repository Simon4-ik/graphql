const SVG_NS = 'http://www.w3.org/2000/svg';
const ACCENT = '#28d2bb';
const ACCENT_DIM = 'rgba(40, 210, 187, 0.35)';
const GRID = 'rgba(255, 255, 255, 0.08)';
const TEXT_DIM = 'rgba(225, 245, 244, 0.55)';
const TEXT = '#e6f5f4';
const RED = '#ef5b6e';

class GraphManager {
    renderAll(profile) {
        const transactions = profile.filteredTransactions
            ? profile.filteredTransactions() : profile.xpTransactions;
        const progresses = profile.filteredProgresses
            ? profile.filteredProgresses() : profile.projectProgresses;

        this.renderLevelCircle(profile.level, profile.levelEvent);
        this.renderAuditBars(profile.user.totalUp, profile.user.totalDown, profile.user.auditRatio);
        this.renderConstellation(progresses, profile.program || 'all');
        this.renderXpOverTime(transactions);
        this.renderProjectPassFail(progresses);
    }

    renderLevelCircle(level, event) {
        const container = document.getElementById('levelCircle');
        container.innerHTML = '';
        const W = 160, H = 160, r = 60;
        const svg = makeSvg(W, H);
        const cx = W / 2, cy = H / 2;

        svg.appendChild(el('circle', {
            cx, cy, r, fill: 'none', stroke: GRID, 'stroke-width': 8
        }));

        const ringFill = Math.min(1, (level % 10) / 10 || 1);
        const circumference = 2 * Math.PI * r;
        svg.appendChild(el('circle', {
            cx, cy, r, fill: 'none', stroke: ACCENT, 'stroke-width': 8,
            'stroke-linecap': 'round',
            'stroke-dasharray': `${circumference * ringFill} ${circumference}`,
            transform: `rotate(-90 ${cx} ${cy})`
        }));

        const num = el('text', {
            x: cx, y: cy + 2, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
            'font-size': 42, 'font-weight': 700, fill: TEXT
        });
        num.textContent = level;
        svg.appendChild(num);

        const label = el('text', {
            x: cx, y: cy + 30, 'text-anchor': 'middle',
            'font-size': 11, fill: TEXT_DIM, 'letter-spacing': '0.1em'
        });
        label.textContent = 'LEVEL';
        svg.appendChild(label);

        container.appendChild(svg);

        const eventLabel = document.getElementById('levelEventLabel');
        if (eventLabel) {
            eventLabel.textContent = event && event.object
                ? event.object.name
                : 'No active module';
        }
    }

    renderAuditBars(up, down, ratio) {
        const container = document.getElementById('auditBars');
        container.innerHTML = '';
        const upN = Number(up || 0), downN = Number(down || 0);
        const max = Math.max(upN, downN, 1);
        const W = 600, H = 130;
        const labelX = 90, barX = 100, barRight = W - 110;
        const barLen = barRight - barX;
        const svg = makeSvg(W, H);

        function barRow(y, name, value, color) {
            const len = (value / max) * barLen;
            svg.appendChild(textNode(labelX - 8, y + 6, name, {
                'text-anchor': 'end', 'font-size': 13, fill: TEXT_DIM, 'letter-spacing': '0.05em'
            }));
            svg.appendChild(el('rect', {
                x: barX, y: y - 6, width: barLen, height: 14, rx: 7, fill: 'rgba(255,255,255,0.06)'
            }));
            svg.appendChild(el('rect', {
                x: barX, y: y - 6, width: Math.max(2, len), height: 14, rx: 7, fill: color
            }));
            svg.appendChild(textNode(barX + barLen + 10, y + 6, window.formatXp(value), {
                'font-size': 13, fill: TEXT, 'font-weight': 600
            }));
        }

        barRow(35, 'DONE', upN, ACCENT);
        barRow(75, 'RECEIVED', downN, RED);

        const ratioText = ratio != null ? Number(ratio).toFixed(1) : (downN ? (upN / downN).toFixed(1) : '—');
        svg.appendChild(textNode(W / 2, 115, `Ratio: ${ratioText}`, {
            'text-anchor': 'middle', 'font-size': 14, fill: TEXT, 'font-weight': 600,
            'letter-spacing': '0.05em'
        }));

        container.appendChild(svg);
    }

    renderConstellation(projects, program = 'all') {
        const container = document.getElementById('constellation');
        container.innerHTML = '';
        if (!projects.length) {
            container.textContent = 'No projects yet.';
            return;
        }

        const branchOrder = ['CORE', 'JS', 'GO', 'AI', 'RUST', 'Other'];
        const grouped = new Map(branchOrder.map(b => [b, []]));
        for (const p of projects) {
            const branch = classifyProject(p);
            if (!grouped.has(branch)) grouped.set(branch, []);
            grouped.get(branch).push(p);
        }
        for (const [, list] of grouped) {
            list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
        const branches = [...grouped.entries()].filter(([, list]) => list.length > 0);

        const isMobile = window.innerWidth < 700;
        const isNarrow = window.innerWidth < 480;
        const PER_PROJECT = isNarrow ? 56 : isMobile ? 70 : 90;
        const ROW_H = isMobile ? 130 : 160;
        const labelW = isMobile ? 100 : 130;
        const padding = isMobile ? 18 : 30;
        const maxCount = Math.max(...branches.map(([, list]) => list.length), 1);
        const W = Math.max(1100, labelW + padding * 2 + maxCount * PER_PROJECT);
        const H = branches.length * ROW_H + 20;

        const svg = el('svg', {
            viewBox: `0 0 ${W} ${H}`,
            xmlns: SVG_NS,
            width: W,
            height: H,
            preserveAspectRatio: 'xMidYMid meet'
        });

        const defs = el('defs');
        defs.innerHTML = `
            <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.6"/>
                <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
            </radialGradient>`;
        svg.appendChild(defs);

        branches.forEach(([branchName, list], rowIdx) => {
            const yMid = rowIdx * ROW_H + ROW_H / 2 + 10;
            const xStart = labelW + padding;

            svg.appendChild(textNode(labelW - 18, yMid - 6, branchName, {
                'text-anchor': 'end',
                'font-size': isMobile ? 18 : 22,
                'font-weight': 700,
                'letter-spacing': '0.08em',
                fill: ACCENT
            }));
            svg.appendChild(textNode(labelW - 18, yMid + 14, `${list.filter(p => Number(p.grade) >= 1).length} / ${list.length}`, {
                'text-anchor': 'end',
                'font-size': isMobile ? 10 : 11,
                fill: TEXT_DIM,
                'letter-spacing': '0.08em'
            }));

            const positions = list.map((p, i) => {
                const x = xStart + i * PER_PROJECT + PER_PROJECT / 2;
                const phase = (i / Math.max(1, list.length - 1)) * Math.PI;
                const y = yMid + Math.sin(phase) * -22 + Math.cos(phase * 2) * 5;
                return { x, y, project: p };
            });

            for (let i = 0; i < positions.length - 1; i++) {
                const a = positions[i], b = positions[i + 1];
                const mx = (a.x + b.x) / 2;
                const my = Math.min(a.y, b.y) - 18;
                svg.appendChild(el('path', {
                    d: `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`,
                    fill: 'none',
                    stroke: GRID,
                    'stroke-width': 1
                }));
            }

            for (const pos of positions) {
                const passed = Number(pos.project.grade) >= 1;
                const failed = Number(pos.project.grade) === 0;
                const name = (pos.project.object && pos.project.object.name)
                    || (pos.project.path || '').split('/').pop() || 'project';

                if (passed) {
                    svg.appendChild(el('circle', {
                        cx: pos.x, cy: pos.y, r: 20, fill: 'url(#starGlow)'
                    }));
                }

                const color = passed ? ACCENT : (failed ? RED : TEXT_DIM);
                svg.appendChild(starPath(pos.x, pos.y, 8, 3.5, color, passed ? color : 'none'));

                svg.appendChild(textNode(pos.x, pos.y + 22, name.length > 16 ? name.slice(0, 15) + '…' : name, {
                    'text-anchor': 'middle',
                    'font-size': 10,
                    fill: passed ? TEXT : TEXT_DIM,
                    'letter-spacing': '0.04em'
                }));
            }

            if (rowIdx < branches.length - 1) {
                svg.appendChild(el('line', {
                    x1: padding, y1: (rowIdx + 1) * ROW_H + 10,
                    x2: W - padding, y2: (rowIdx + 1) * ROW_H + 10,
                    stroke: GRID, 'stroke-width': 1, 'stroke-dasharray': '2 6'
                }));
            }
        });

        container.appendChild(svg);
    }

    renderXpOverTime(transactions) {
        const container = document.getElementById('xpOverTimeGraph');
        container.innerHTML = '';
        if (!transactions.length) {
            container.textContent = 'No XP data available.';
            return;
        }

        const sorted = [...transactions].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        let cumulative = 0;
        const points = sorted.map(t => {
            cumulative += Number(t.amount || 0);
            return { date: new Date(t.createdAt), xp: cumulative };
        });

        const W = 600, H = 280;
        const M = { top: 20, right: 24, bottom: 36, left: 64 };
        const innerW = W - M.left - M.right;
        const innerH = H - M.top - M.bottom;

        const minDate = points[0].date.getTime();
        const maxDate = points[points.length - 1].date.getTime();
        const dateSpan = Math.max(1, maxDate - minDate);
        const maxXp = points[points.length - 1].xp || 1;

        const x = d => M.left + ((d.getTime() - minDate) / dateSpan) * innerW;
        const y = v => M.top + innerH - (v / maxXp) * innerH;

        const svg = makeSvg(W, H);

        const defs = el('defs');
        defs.innerHTML = `
            <linearGradient id="xpGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.45"/>
                <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
            </linearGradient>`;
        svg.appendChild(defs);

        appendGrid(svg, M, innerW, innerH, 5);
        appendYTicks(svg, M, innerH, maxXp, v => window.formatXp(v));
        appendXTicks(svg, M, innerW, innerH, [
            { pos: 0, label: formatDate(new Date(minDate)) },
            { pos: 0.5, label: formatDate(new Date(minDate + dateSpan / 2)) },
            { pos: 1, label: formatDate(new Date(maxDate)) }
        ]);

        const path = points.map((p, i) =>
            `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(2)},${y(p.xp).toFixed(2)}`
        ).join(' ');

        const lastX = x(points[points.length - 1].date);
        const firstX = x(points[0].date);
        const baseY = M.top + innerH;
        const area = `${path} L${lastX.toFixed(2)},${baseY} L${firstX.toFixed(2)},${baseY} Z`;

        svg.appendChild(el('path', { d: area, fill: 'url(#xpGradient)' }));
        svg.appendChild(el('path', {
            d: path, fill: 'none', stroke: ACCENT, 'stroke-width': 2,
            'stroke-linejoin': 'round'
        }));

        container.appendChild(svg);
    }

    renderProjectPassFail(progresses) {
        const container = document.getElementById('successRateGraph');
        container.innerHTML = '';
        const finished = progresses.filter(p => p.grade !== null && p.grade !== undefined);
        if (!finished.length) {
            container.textContent = 'No project data available.';
            return;
        }

        const passed = finished.filter(p => Number(p.grade) >= 1).length;
        const failed = finished.length - passed;
        const total = passed + failed;

        const W = 600, H = 280;
        const cx = W / 2 - 60, cy = H / 2;
        const r = 95, ir = 60;

        const svg = makeSvg(W, H);

        const passAngle = (passed / total) * 2 * Math.PI;

        if (passed > 0) {
            svg.appendChild(donutPath(cx, cy, r, ir, 0, passAngle, ACCENT));
        }
        if (failed > 0) {
            svg.appendChild(donutPath(cx, cy, r, ir, passAngle, 2 * Math.PI, RED));
        }

        const pct = el('text', {
            x: cx, y: cy - 4, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
            'font-size': 32, 'font-weight': 700, fill: TEXT
        });
        pct.textContent = `${Math.round((passed / total) * 100)}%`;
        svg.appendChild(pct);

        const sub = el('text', {
            x: cx, y: cy + 22, 'text-anchor': 'middle',
            'font-size': 11, fill: TEXT_DIM, 'letter-spacing': '0.1em'
        });
        sub.textContent = 'PASSED';
        svg.appendChild(sub);

        appendLegend(svg, W - 170, cy - 30, [
            { label: `Passed · ${passed}`, color: ACCENT },
            { label: `Failed · ${failed}`, color: RED }
        ]);

        container.appendChild(svg);
    }
}

function el(name, attrs = {}) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
}

function textNode(x, y, content, attrs = {}) {
    const t = el('text', { x, y, ...attrs });
    t.textContent = content;
    return t;
}

function makeSvg(w, h) {
    return el('svg', {
        viewBox: `0 0 ${w} ${h}`,
        xmlns: SVG_NS,
        width: '100%',
        height: 'auto'
    });
}

function appendGrid(svg, M, innerW, innerH, steps) {
    for (let i = 0; i <= steps; i++) {
        const y = M.top + innerH - (i / steps) * innerH;
        svg.appendChild(el('line', {
            x1: M.left, y1: y, x2: M.left + innerW, y2: y,
            stroke: GRID, 'stroke-width': 1
        }));
    }
}

function appendXTicks(svg, M, innerW, innerH, ticks) {
    for (const t of ticks) {
        const x = M.left + t.pos * innerW;
        const y = M.top + innerH;
        svg.appendChild(textNode(x, y + 18, t.label, {
            'text-anchor': 'middle', 'font-size': 11, fill: TEXT_DIM
        }));
    }
}

function appendYTicks(svg, M, innerH, maxV, fmt) {
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        const v = (maxV * i) / steps;
        const y = M.top + innerH - (i / steps) * innerH;
        svg.appendChild(textNode(M.left - 10, y + 4, fmt(v), {
            'text-anchor': 'end', 'font-size': 11, fill: TEXT_DIM
        }));
    }
}

function appendLegend(svg, x, y, items) {
    items.forEach((item, i) => {
        const yy = y + i * 24;
        svg.appendChild(el('rect', {
            x, y: yy, width: 12, height: 12, fill: item.color, rx: 2
        }));
        svg.appendChild(textNode(x + 20, yy + 10, item.label, {
            'font-size': 12, fill: TEXT
        }));
    });
}

function donutPath(cx, cy, r, ir, startAngle, endAngle, color) {
    if (Math.abs(endAngle - startAngle - 2 * Math.PI) < 1e-6) {
        const ring = el('path', {
            d: `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} ` +
               `M ${cx - ir} ${cy} A ${ir} ${ir} 0 1 0 ${cx + ir} ${cy} A ${ir} ${ir} 0 1 0 ${cx - ir} ${cy} Z`,
            fill: color, 'fill-rule': 'evenodd'
        });
        return ring;
    }
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.sin(startAngle);
    const y1 = cy - r * Math.cos(startAngle);
    const x2 = cx + r * Math.sin(endAngle);
    const y2 = cy - r * Math.cos(endAngle);
    const xi1 = cx + ir * Math.sin(endAngle);
    const yi1 = cy - ir * Math.cos(endAngle);
    const xi2 = cx + ir * Math.sin(startAngle);
    const yi2 = cy - ir * Math.cos(startAngle);

    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} ` +
              `L ${xi1} ${yi1} A ${ir} ${ir} 0 ${largeArc} 0 ${xi2} ${yi2} Z`;
    return el('path', { d, fill: color });
}

function starPath(cx, cy, outer, inner, fill, fillColor) {
    const points = [];
    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outer : inner;
        points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return el('polygon', {
        points: points.join(' '),
        fill: fillColor === 'none' ? 'rgba(40, 210, 187, 0.05)' : fillColor,
        stroke: fill,
        'stroke-width': 1.5,
        'stroke-linejoin': 'round'
    });
}

function formatDate(d) {
    return d.toLocaleDateString(undefined, { year: '2-digit', month: 'short' });
}

function classifyProject(project) {
    const path = project.path || '';

    if (path.startsWith('/astanahub/module/piscine-js/')) return 'JS';
    if (path.startsWith('/astanahub/module/piscine-ai/')) return 'AI';
    if (path.startsWith('/astanahub/module/piscine-rust/')) return 'RUST';
    if (path.startsWith('/astanahub/piscinego/')) return 'GO';
    if (path.startsWith('/astanahub/module/')) return 'CORE';
    return 'Other';
}

window.graphManager = new GraphManager();

let __resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(__resizeTimer);
    __resizeTimer = setTimeout(() => {
        const pm = window.profileManager;
        if (pm && pm.user) window.graphManager.renderAll(pm);
    }, 180);
});
