class AuthManager {
    constructor() {
        this.token = null;
        this.userId = null;
        this.init();
    }

    init() {
        const stored = localStorage.getItem('jwt_token');
        if (stored && !this.isTokenExpired(stored)) {
            this.token = stored;
            this.userId = this.extractUserIdFromToken(stored);
        }

        if (this.token && this.userId) {
            window.graphqlClient.setToken(this.token);
            this.showProfilePage();
        } else {
            localStorage.removeItem('jwt_token');
            this.showLoginPage();
        }

        this.setupEventListeners();
    }

    isTokenExpired(token) {
        const payload = this.decodePayload(token);
        if (!payload || !payload.exp) return false;
        return Date.now() >= payload.exp * 1000;
    }

    decodePayload(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            let p = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (p.length % 4) p += '=';
            return JSON.parse(atob(p));
        } catch {
            return null;
        }
    }

    setupEventListeners() {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            this.showError('Please enter username/email and password.');
            return;
        }

        const btn = document.querySelector('.login-btn');
        btn.textContent = 'Signing in...';
        btn.disabled = true;

        try {
            const token = await this.authenticate(username, password);
            this.token = token;
            this.userId = this.extractUserIdFromToken(token);
            if (!this.userId) throw new Error('Token is missing user id.');

            localStorage.setItem('jwt_token', token);
            window.graphqlClient.setToken(token);
            this.hideError();
            this.showProfilePage();
        } catch (err) {
            this.showError(err.message || 'Login failed.');
        } finally {
            btn.textContent = 'Sign In';
            btn.disabled = false;
        }
    }

    async authenticate(username, password) {
        const credentials = btoa(`${username}:${password}`);
        const response = await fetch('https://01.tomorrow-school.ai/api/auth/signin', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Invalid credentials.');
            throw new Error(`Authentication failed (${response.status}).`);
        }

        const text = (await response.text()).trim();
        // Server returns either "<jwt>" (quoted JSON string), {"token":"<jwt>"}, or raw <jwt>.
        let token = null;
        try {
            const parsed = JSON.parse(text);
            if (typeof parsed === 'string') token = parsed;
            else if (parsed && typeof parsed === 'object') {
                token = parsed.token || parsed.jwt || parsed.access_token || parsed.accessToken;
            }
        } catch {
            token = text;
        }

        if (!token || token.split('.').length !== 3) {
            throw new Error('Authentication response did not contain a JWT.');
        }
        return token;
    }

    extractUserIdFromToken(token) {
        const decoded = this.decodePayload(token);
        if (!decoded) return null;
        const claims = decoded['https://hasura.io/jwt/claims'] || {};
        return parseInt(
            decoded.sub || decoded.user_id || decoded.id || decoded.userId ||
            claims['x-hasura-user-id'],
            10
        ) || null;
    }

    handleLogout() {
        this.token = null;
        this.userId = null;
        localStorage.removeItem('jwt_token');
        window.graphqlClient.setToken(null);
        document.getElementById('loginForm').reset();
        this.hideError();
        this.showLoginPage();
    }

    showLoginPage() {
        document.getElementById('loginPage').style.display = 'block';
        document.getElementById('profilePage').style.display = 'none';
    }

    showProfilePage() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('profilePage').style.display = 'block';
        if (window.profileManager) window.profileManager.loadProfileData();
    }

    showError(message) {
        const el = document.getElementById('errorMessage');
        el.textContent = message;
        el.style.display = 'block';
    }

    hideError() {
        document.getElementById('errorMessage').style.display = 'none';
    }
}

const authManager = new AuthManager();
window.authManager = authManager;
