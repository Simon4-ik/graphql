class ProfileManager {
    constructor() {
        this.user = null;
        this.xpTransactions = [];
        this.projectProgresses = [];
        this.level = 0;
        this.levelEvent = null;
        this.program = 'all';
    }

    filterByProgram(items, program) {
        switch (program) {
            case 'core-education':
                return items.filter(t =>
                    t.path && t.path.startsWith('/astanahub/module/') &&
                    !t.path.includes('/piscine-js/') &&
                    !t.path.includes('/piscine-ai/') &&
                    !t.path.includes('/piscine-rust/')
                );
            case 'piscine-js':
                return items.filter(t =>
                    t.path && t.path.startsWith('/astanahub/module/piscine-js/')
                );
            case 'piscine-go':
                return items.filter(t =>
                    t.path && t.path.startsWith('/astanahub/piscinego/')
                );
            case 'piscine-ai':
                return items.filter(t =>
                    t.path && t.path.startsWith('/astanahub/module/piscine-ai/')
                );
            case 'piscine-rust':
                return items.filter(t =>
                    t.path && t.path.startsWith('/astanahub/module/piscine-rust/')
                );
            default:
                return items;
        }
    }

    setProgram(program) {
        this.program = program || 'all';
        this.renderStats();
        if (window.graphManager) window.graphManager.renderAll(this);

        const hint = document.getElementById('programHint');
        if (hint) {
            const tx = this.filteredTransactions().length;
            const pr = this.filteredProgresses().length;
            const labels = {
                'all': 'Showing all activity',
                'core-education': 'Core Education only',
                'piscine-js': 'Piscine JS only',
                'piscine-go': 'Piscine Go only',
                'piscine-ai': 'Piscine AI only',
                'piscine-rust': 'Piscine Rust only'
            };
            hint.textContent = `${labels[this.program] || labels.all} · ${tx} XP entries · ${pr} projects`;
        }
    }

    filteredTransactions() {
        return this.filterByProgram(this.xpTransactions, this.program);
    }

    filteredProgresses() {
        return this.filterByProgram(this.projectProgresses, this.program);
    }

    async loadProfileData() {
        try {
            const data = await window.graphqlClient.query(`
                query Profile {
                    user {
                        id
                        login
                        firstName
                        lastName
                        email
                        campus
                        auditRatio
                        totalUp
                        totalDown
                        events(order_by: { level: desc }, limit: 5) {
                            level
                            event {
                                id
                                path
                                object { id name type }
                            }
                        }
                    }
                    transaction(
                        where: { type: { _eq: "xp" }, eventId: { _is_null: false } }
                        order_by: { createdAt: asc }
                    ) {
                        id
                        amount
                        createdAt
                        path
                        object { id name type }
                    }
                    progress(
                        where: { object: { type: { _eq: "project" } } }
                        order_by: { createdAt: asc }
                    ) {
                        id
                        grade
                        isDone
                        createdAt
                        path
                        object { id name type }
                    }
                }
            `);

            this.user = (data.user && data.user[0]) || null;
            this.xpTransactions = data.transaction || [];
            this.projectProgresses = data.progress || [];

            if (!this.user) throw new Error('No user returned from API.');

            const moduleEvent = (this.user.events || []).find(e =>
                e.event && e.event.object && e.event.object.type === 'module'
            );
            const topEvent = moduleEvent || (this.user.events && this.user.events[0]) || null;
            this.level = topEvent ? topEvent.level : 0;
            this.levelEvent = topEvent && topEvent.event ? topEvent.event : null;

            this.renderHeader();
            this.renderIdentity();
            this.setupProgramTabs();
            this.setProgram(this.program);
        } catch (err) {
            console.error('Failed to load profile:', err);
            if (/JWTExpired|invalid-jwt|JWSError/i.test(err.message)) {
                window.authManager.handleLogout();
                window.authManager.showError('Your session expired. Please sign in again.');
                return;
            }
            const main = document.querySelector('.profile-main');
            if (main) {
                main.insertAdjacentHTML('afterbegin',
                    `<div class="error-message" style="margin-bottom:20px">${err.message}</div>`);
            }
        }
    }

    renderHeader() {
        document.getElementById('headerLogin').textContent = this.user.login;
        document.getElementById('headerLevel').textContent = this.level;
    }

    renderIdentity() {
        const u = this.user;
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.login;
        document.getElementById('userFullName').textContent = fullName;
        document.getElementById('userLogin').textContent = u.login;
        document.getElementById('userId').textContent = u.id;
        document.getElementById('userEmail').textContent = u.email || '—';
        document.getElementById('userCampus').textContent = u.campus || '—';

        const initials = fullName
            .split(/\s+/).filter(Boolean).slice(0, 2)
            .map(s => s[0].toUpperCase()).join('') || u.login.slice(0, 2).toUpperCase();
        document.getElementById('avatar').textContent = initials;
    }

    setupProgramTabs() {
        const tabs = document.getElementById('programTabs');
        if (!tabs || tabs.dataset.bound === '1') return;
        tabs.addEventListener('click', (e) => {
            const btn = e.target.closest('.program-tab');
            if (!btn) return;
            tabs.querySelectorAll('.program-tab').forEach(t => {
                const active = t === btn;
                t.classList.toggle('is-active', active);
                t.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            this.setProgram(btn.dataset.program);
        });
        tabs.dataset.bound = '1';
    }

    renderStats() {
        const tx = this.filteredTransactions();
        const pr = this.filteredProgresses();

        const totalXp = tx.reduce((s, t) => s + Number(t.amount || 0), 0);
        document.getElementById('totalXp').textContent = formatXp(totalXp);

        const totalProjects = pr.length;
        const passedProjects = pr.filter(p => Number(p.grade) >= 1).length;
        document.getElementById('totalProjects').textContent = totalProjects;
        document.getElementById('passedProjects').textContent = passedProjects;

        const ratio = this.user.auditRatio != null
            ? Number(this.user.auditRatio).toFixed(1)
            : '0.0';
        document.getElementById('auditRatio').textContent = ratio;

        const status = document.getElementById('auditRatioStatus');
        const r = parseFloat(ratio);
        if (r >= 1) {
            status.textContent = 'Great job!';
            status.className = 'stat-sub stat-sub-good';
        } else if (r >= 0.5) {
            status.textContent = 'Careful, buddy.';
            status.className = 'stat-sub stat-sub-warn';
        } else {
            status.textContent = 'Audit more!';
            status.className = 'stat-sub stat-sub-bad';
        }
    }
}

function formatXp(n) {
    n = Number(n) || 0;
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + ' MB';
    if (n >= 1_000) return (n / 1_000).toFixed(2) + ' kB';
    return n + ' B';
}

window.profileManager = new ProfileManager();
window.formatXp = formatXp;
