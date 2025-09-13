class ProfileManager {
    constructor() {
        this.userData = null;
        this.transactions = [];
        this.progress = [];
        this.results = [];
        this.objects = [];
    }

    async loadProfileData() {
        try {
            console.log('📊 Starting profile data loading...');
            // Show loading state
            this.showLoadingState();

            // Test with a simple introspection query first
            console.log('🧪 Testing API connection...');
            try {
                const testQuery = 'query { __schema { queryType { name } } }';
                const testResult = await graphqlClient.query(testQuery);
                console.log('✅ API connection test successful:', testResult);
            } catch (testError) {
                console.error('❌ API connection test failed:', testError);
                throw testError;
            }

            // Load all data in parallel - using the correct API structure
            console.log('🔄 Loading user data...');
            const userData = await graphqlClient.getUserInfo();
            console.log('🔄 Loading transaction data...');
            const transactionsData = await graphqlClient.getUserTransactions();
            console.log('🔄 Loading progress data...');
            const progressData = await graphqlClient.getUserProgress();
            console.log('🔄 Loading results data...');
            const resultsData = await graphqlClient.getUserResults();

            // Access data using the correct structure from the API
            // Note: GraphQL client returns data.data, so we access the fields directly
            this.userData = userData.user && userData.user[0] ? userData.user[0] : null;
            this.transactions = transactionsData.transaction || [];
            this.progress = progressData.progress || [];
            this.results = resultsData.result || [];

            // Debug: Log the data we received
            console.log('📊 Data loaded:');
            console.log('User data:', this.userData);
            console.log('Transactions count:', this.transactions.length);
            console.log('Progress count:', this.progress.length);
            console.log('Results count:', this.results.length);
            console.log('Sample transaction:', this.transactions[0]);
            console.log('Sample progress:', this.progress[0]);
            console.log('Sample result:', this.results[0]);

            // Get unique object IDs for detailed object information
            const objectIds = [...new Set([
                ...this.transactions.map(t => t.objectId),
                ...this.progress.map(p => p.objectId),
                ...this.results.map(r => r.objectId)
            ].filter(id => id))];

            if (objectIds.length > 0) {
                const objectsData = await graphqlClient.getObjects(objectIds);
                this.objects = objectsData.object || [];
            }

            // Update UI with loaded data
            this.updateUserInfo();
            this.updateXpInfo();
            this.updateProgressInfo();
            this.updateAuditInfo();
            
            // Load graphs after data is ready
            if (window.graphManager) {
                window.graphManager.createAllGraphs();
            }

        } catch (error) {
            console.error('Error loading profile data:', error);
            this.showError('Failed to load profile data. Please try again.');
        } finally {
            this.hideLoadingState();
        }
    }

    showLoadingState() {
        // Add loading indicators to various sections
        const elements = ['userId', 'userLogin', 'totalXp', 'projectXp', 'exerciseXp', 'totalProjects', 'passedProjects', 'successRate', 'totalAudits', 'passedAudits', 'auditSuccessRate'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '<span class="loading"></span>';
            }
        });
    }

    hideLoadingState() {
        // Remove loading indicators
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(el => el.remove());
    }

    updateUserInfo() {
        if (this.userData) {
            document.getElementById('userId').textContent = this.userData.id || '-';
            document.getElementById('userLogin').textContent = this.userData.login || '-';
        }
    }

    updateXpInfo() {
        // Calculate total XP from transactions
        const totalXp = this.transactions
            .filter(t => t.type === 'xp')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        // Calculate XP by type
        const projectXp = this.transactions
            .filter(t => t.type === 'xp' && this.isProject(t.objectId))
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const exerciseXp = this.transactions
            .filter(t => t.type === 'xp' && this.isExercise(t.objectId))
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        document.getElementById('totalXp').textContent = totalXp.toLocaleString();
        document.getElementById('projectXp').textContent = projectXp.toLocaleString();
        document.getElementById('exerciseXp').textContent = exerciseXp.toLocaleString();
    }

    updateProgressInfo() {
        // Calculate project statistics from progress data
        // First try to get projects from progress data
        let projectResults = this.progress.filter(p => this.isProject(p.objectId));
        
        // If no projects found in progress, try results
        if (projectResults.length === 0) {
            projectResults = this.results.filter(r => this.isProject(r.objectId));
        }
        
        // If still no projects, try to identify projects by object type
        if (projectResults.length === 0 && this.objects.length > 0) {
            const projectObjects = this.objects.filter(o => o.type === 'project');
            console.log('Found project objects:', projectObjects);
            
            // Try to find progress/results for these project objects
            projectResults = this.progress.filter(p => 
                projectObjects.some(po => po.id === p.objectId)
            );
        }
        
        const totalProjects = projectResults.length;
        const passedProjects = projectResults.filter(r => r.grade === 1).length;
        const successRate = totalProjects > 0 ? Math.round((passedProjects / totalProjects) * 100) : 0;

        console.log('Project calculation:', {
            totalProjects,
            passedProjects,
            successRate,
            projectResults: projectResults.length,
            progressData: this.progress.length,
            resultsData: this.results.length,
            objectsData: this.objects.length
        });

        document.getElementById('totalProjects').textContent = totalProjects;
        document.getElementById('passedProjects').textContent = passedProjects;
        document.getElementById('successRate').textContent = `${successRate}%`;
    }

    updateAuditInfo() {
        // Calculate audit statistics from progress data
        // Audits are typically represented by grade 0 (failed) or 1 (passed)
        const auditResults = this.progress.filter(p => p.grade !== null);
        const totalAudits = auditResults.length;
        const passedAudits = auditResults.filter(p => p.grade === 1).length;
        const failedAudits = auditResults.filter(p => p.grade === 0).length;
        const auditSuccessRate = totalAudits > 0 ? Math.round((passedAudits / totalAudits) * 100) : 0;
        const auditFailRate = totalAudits > 0 ? Math.round((failedAudits / totalAudits) * 100) : 0;

        document.getElementById('totalAudits').textContent = totalAudits;
        document.getElementById('passedAudits').textContent = passedAudits;
        document.getElementById('auditSuccessRate').textContent = `${auditSuccessRate}%`;
        document.getElementById('auditFailRate').textContent = `${auditFailRate}%`;
    }

    isProject(objectId) {
        const object = this.objects.find(o => o.id === objectId);
        return object && object.type === 'project';
    }

    isExercise(objectId) {
        const object = this.objects.find(o => o.id === objectId);
        return object && object.type === 'exercise';
    }

    // Get XP data over time for graphs
    getXpOverTimeData() {
        const xpTransactions = this.transactions
            .filter(t => t.type === 'xp')
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        let cumulativeXp = 0;
        return xpTransactions.map(t => {
            cumulativeXp += t.amount || 0;
            return {
                date: new Date(t.createdAt),
                xp: cumulativeXp,
                amount: t.amount || 0
            };
        });
    }

    // Get project success rate data
    getProjectSuccessData() {
        const projectResults = this.results.filter(r => this.isProject(r.objectId));
        const passed = projectResults.filter(r => r.grade === 1).length;
        const failed = projectResults.filter(r => r.grade === 0).length;
        
        return [
            { label: 'Passed', value: passed, color: '#4CAF50' },
            { label: 'Failed', value: failed, color: '#F44336' }
        ];
    }

    // Get XP by type data
    getXpByTypeData() {
        const projectXp = this.transactions
            .filter(t => t.type === 'xp' && this.isProject(t.objectId))
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const exerciseXp = this.transactions
            .filter(t => t.type === 'xp' && this.isExercise(t.objectId))
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        return [
            { label: 'Projects', value: projectXp, color: '#667eea' },
            { label: 'Exercises', value: exerciseXp, color: '#764ba2' }
        ];
    }

    // Get monthly progress data
    getMonthlyProgressData() {
        const monthlyData = {};
        
        this.transactions
            .filter(t => t.type === 'xp')
            .forEach(t => {
                const date = new Date(t.createdAt);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = 0;
                }
                monthlyData[monthKey] += t.amount || 0;
            });

        return Object.entries(monthlyData)
            .map(([month, xp]) => ({
                month: month,
                xp: xp
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }

    // Get audit ratio data
    getAuditRatioData() {
        const auditResults = this.progress.filter(p => p.grade !== null);
        const passed = auditResults.filter(p => p.grade === 1).length;
        const failed = auditResults.filter(p => p.grade === 0).length;
        
        return [
            { label: 'Passed', value: passed, color: '#28a745' },
            { label: 'Failed', value: failed, color: '#dc3545' }
        ];
    }

    // Get failed audits data for bar chart
    getFailedAuditsData() {
        const auditResults = this.progress.filter(p => p.grade !== null);
        const failed = auditResults.filter(p => p.grade === 0).length;
        const passed = auditResults.filter(p => p.grade === 1).length;
        
        return [
            { label: 'Failed Audits', value: failed },
            { label: 'Passed Audits', value: passed }
        ];
    }

    showError(message) {
        // Create a temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '20px';
        errorDiv.style.right = '20px';
        errorDiv.style.zIndex = '1000';
        
        document.body.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Initialize profile manager
const profileManager = new ProfileManager();
window.profileManager = profileManager;