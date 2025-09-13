class AuthManager {
    constructor() {
        this.token = null; // Don't load from localStorage immediately
        this.userId = null;
        this.init();
    }

    init() {
        // Check if user is already logged in
        const storedToken = localStorage.getItem('jwt_token');
        if (storedToken) {
            this.token = storedToken;
            this.userId = this.extractUserIdFromToken(storedToken);
            if (this.userId) {
                this.showProfilePage();
            } else {
                // Invalid token, clear it
                localStorage.removeItem('jwt_token');
                this.showLoginPage();
            }
        } else {
            this.showLoginPage();
        }

        // Set up event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            this.showError('Please enter both username/email and password');
            return;
        }

        try {
            // Show loading state
            const loginBtn = document.querySelector('.login-btn');
            const originalText = loginBtn.textContent;
            loginBtn.textContent = 'Signing in...';
            loginBtn.disabled = true;

            console.log('Attempting login for username:', username); // Debug log

            const token = await this.authenticate(username, password);
            
            if (token) {
                this.token = token;
                this.userId = this.extractUserIdFromToken(token);
                localStorage.setItem('jwt_token', token);
                
                // Update GraphQL client with token if it exists
                if (window.graphqlClient) {
                    console.log('🔑 Setting token in GraphQL client...');
                    window.graphqlClient.setToken(token);
                } else {
                    console.log('❌ GraphQL client not available! Retrying...');
                    // Retry after a short delay
                    setTimeout(() => {
                        if (window.graphqlClient) {
                            console.log('🔑 Setting token in GraphQL client (retry)...');
                            window.graphqlClient.setToken(token);
                        } else {
                            console.log('❌ GraphQL client still not available after retry!');
                        }
                    }, 100);
                }
                
                this.hideError();
                this.showProfilePage();
            } else {
                this.showError('Invalid credentials. Please try again.');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError(error.message || 'Login failed. Please check your credentials and try again.');
        } finally {
            // Reset button state
            const loginBtn = document.querySelector('.login-btn');
            if (loginBtn) {
                loginBtn.textContent = 'Sign In';
                loginBtn.disabled = false;
            }
        }
    }

    async authenticate(username, password) {
        const authEndpoint = 'https://01.tomorrow-school.ai/api/auth/signin';
        
        // Create Basic Auth header
        const credentials = btoa(`${username}:${password}`);
        
        console.log('Authenticating with endpoint:', authEndpoint);
        console.log('Username length:', username.length);
        console.log('Password length:', password.length);
        
        try {
            // Method 1: POST with Basic Auth
            let response = await fetch(authEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            console.log('POST response status:', response.status);
            console.log('POST response headers:', [...response.headers.entries()]);

            // If POST fails, try GET
            if (!response.ok && response.status === 404) {
                console.log('POST failed, trying GET method...');
                
                response = await fetch(authEndpoint, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
                console.log('GET response status:', response.status);
            }

            // If still failing, try POST with JSON body
            if (!response.ok && response.status === 404) {
                console.log('GET failed, trying POST with JSON body...');
                
                response = await fetch(authEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });
                
                console.log('POST JSON response status:', response.status);
            }

            if (!response.ok) {
                let errorText = '';
                try {
                    errorText = await response.text();
                } catch (e) {
                    errorText = 'Unknown error';
                }
                
                console.error('Authentication failed:', response.status, errorText);
                
                if (response.status === 401) {
                    throw new Error('Invalid credentials. Please check your username/email and password.');
                } else if (response.status === 403) {
                    throw new Error('Access forbidden. Please check if your account is active.');
                } else if (response.status === 404) {
                    throw new Error('Authentication endpoint not found. Please contact support.');
                } else if (response.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                }
                throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
            }

            // Parse response
            let data;
            let token;
            
            const contentType = response.headers.get('content-type');
            console.log('Response content-type:', contentType);
            
            if (contentType && contentType.includes('application/json')) {
                try {
                    data = await response.json();
                    console.log('Authentication response data (JSON):', data);
                    
                    // Check if the response is a direct JWT token string
                    if (typeof data === 'string' && data.includes('.') && data.split('.').length === 3) {
                        token = data.trim();
                        console.log('JWT token found as direct string in JSON response');
                    } else if (typeof data === 'object') {
                        // Standard token extraction from object
                        token = data.token || data.jwt || data.access_token || data.accessToken || data.authToken;
                        console.log('Token extracted from object:', token ? 'found' : 'not found');
                    }
                } catch (jsonError) {
                    console.error('Failed to parse JSON response:', jsonError);
                    throw new Error('Invalid response format from server');
                }
            } else {
                // Try to get the response as text (might be a raw JWT token)
                const responseText = await response.text();
                console.log('Authentication response data (text):', responseText.substring(0, 50) + '...');
                
                // Check if it looks like a JWT token (3 parts separated by dots)
                if (responseText.includes('.') && responseText.split('.').length === 3) {
                    token = responseText.trim();
                    console.log('Detected JWT token in text response');
                } else {
                    throw new Error('Response is not JSON and not a valid JWT token');
                }
            }
            
            if (!token) {
                console.error('No token found in response:', data);
                throw new Error('Authentication successful but no token received. Please contact support.');
            }

            console.log('Successfully extracted token');
            return token;
            
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your internet connection and try again.');
            }
            console.error('Authentication error:', error);
            throw error;
        }
    }

    extractUserIdFromToken(token) {
        try {
            // JWT tokens have 3 parts separated by dots
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.error('Invalid token format - not 3 parts:', parts.length);
                return null;
            }

            // Decode the payload (second part)
            // Add padding if needed for base64 decoding
            let payload = parts[1];
            while (payload.length % 4) {
                payload += '=';
            }
            
            const decodedPayload = JSON.parse(atob(payload));
            console.log('Decoded token payload:', decodedPayload);
            
            const userId = decodedPayload.user_id || decodedPayload.sub || decodedPayload.id || decodedPayload.userId;
            console.log('Extracted user ID:', userId);
            
            return userId;
        } catch (error) {
            console.error('Error extracting user ID from token:', error);
            return null;
        }
    }

    handleLogout() {
        this.token = null;
        this.userId = null;
        localStorage.removeItem('jwt_token');
        
        if (window.graphqlClient) {
            window.graphqlClient.setToken(null);
        }
        
        this.showLoginPage();
        
        // Clear form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.reset();
        }
        this.hideError();
    }

    showLoginPage() {
        const loginPage = document.getElementById('loginPage');
        const profilePage = document.getElementById('profilePage');
        
        if (loginPage) loginPage.style.display = 'block';
        if (profilePage) profilePage.style.display = 'none';
    }

    showProfilePage() {
        const loginPage = document.getElementById('loginPage');
        const profilePage = document.getElementById('profilePage');
        
        if (loginPage) loginPage.style.display = 'none';
        if (profilePage) profilePage.style.display = 'block';
        
        // Load profile data
        if (window.profileManager) {
            window.profileManager.loadProfileData();
        }
    }

    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
        console.error('Auth Error:', message);
    }

    hideError() {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    isAuthenticated() {
        return !!this.token && !!this.userId;
    }

    getToken() {
        return this.token;
    }

    getUserId() {
        return this.userId;
    }
}

// Initialize authentication manager
const authManager = new AuthManager();