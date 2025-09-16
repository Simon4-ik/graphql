class GraphQLClient {
    constructor(endpoint, token = null) {
        this.endpoint = endpoint;
        this.token = token;
    }

    setToken(token) {
        this.token = token;
        console.log('🔑 Token set in GraphQL client:', token ? 'Token received' : 'Token cleared');
    }

    async query(query, variables = {}) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
            console.log('🔑 Using token for query:', query.substring(0, 50) + '...');
            console.log('🔑 Token preview:', this.token.substring(0, 50) + '...');
        } else {
            console.log('❌ No token available for query:', query.substring(0, 50) + '...');
        }

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    query: query,
                    variables: variables
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.errors) {
                console.error('GraphQL errors:', data.errors);
                console.error('Full response:', data);
                throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
            }

            console.log('✅ Query successful, data received');
            return data.data;
        } catch (error) {
            console.error('GraphQL query error:', error);
            throw error;
        }
    }

    // Introspection query to discover available fields
    async getSchemaInfo() {
        const query = `
            query IntrospectionQuery {
                __schema {
                    queryType {
                        name
                        fields {
                            name
                            type {
                                name
                                kind
                                ofType {
                                    name
                                    kind
                                }
                            }
                        }
                    }
                }
            }
        `;
        
        try {
            const result = await this.query(query);
            console.log('Available query fields:', result.__schema.queryType.fields.map(f => f.name));
            return result;
        } catch (error) {
            console.error('Failed to get schema info:', error);
            throw error;
        }
    }

    // Discover the correct schema first
    async discoverSchema() {
        // Try multiple introspection approaches
        const introspectionQueries = [
            // Standard introspection
            `query IntrospectionQuery {
                __schema {
                    queryType {
                        fields {
                            name
                            description
                        }
                    }
                }
            }`,
            // Simpler introspection
            `query {
                __schema {
                    queryType {
                        fields {
                            name
                        }
                    }
                }
            }`,
            // Even simpler
            `query {
                __schema {
                    queryType {
                        fields
                    }
                }
            }`
        ];

        for (const query of introspectionQueries) {
            try {
                console.log('Trying introspection query...');
                const result = await this.query(query);
                console.log('Introspection result:', result);
                
                // Check if we got valid schema data
                if (result && result.__schema && result.__schema.queryType && result.__schema.queryType.fields) {
                    const fields = result.__schema.queryType.fields;
                    console.log('Found fields from introspection:', fields.map(f => f.name || f));
                    return result;
                } else {
                    console.log('Introspection result structure unexpected:', result);
                }
            } catch (error) {
                console.log('Introspection failed:', error.message);
                continue;
            }
        }

        // If introspection fails, try to discover fields by testing common ones
        console.log('Introspection failed, trying field discovery...');
        return await this.discoverFieldsByTesting();
    }

    // Discover fields by testing common field names
    async discoverFieldsByTesting() {
        // Hasura-specific field patterns (based on the JWT token showing Hasura)
        const hasuraFields = [
            // User fields
            'user', 'users', 'user_by_pk', 'user_aggregate',
            // Transaction fields  
            'transaction', 'transactions', 'transaction_by_pk', 'transaction_aggregate',
            'xp', 'xp_transaction', 'xp_transaction_by_pk', 'xp_transaction_aggregate',
            // Progress fields
            'progress', 'progresses', 'progress_by_pk', 'progress_aggregate',
            'grade', 'grades', 'grade_by_pk', 'grade_aggregate',
            // Result fields
            'result', 'results', 'result_by_pk', 'result_aggregate',
            'submission', 'submissions', 'submission_by_pk', 'submission_aggregate',
            // Object fields
            'object', 'objects', 'object_by_pk', 'object_aggregate',
            'exercise', 'exercises', 'exercise_by_pk', 'exercise_aggregate',
            'project', 'projects', 'project_by_pk', 'project_aggregate',
            // Audit fields
            'audit', 'audits', 'audit_by_pk', 'audit_aggregate'
        ];

        const availableFields = [];

        for (const fieldName of hasuraFields) {
            try {
                // Try different Hasura query patterns
                const testQueries = [
                    `query { ${fieldName} { __typename } }`,
                    `query { ${fieldName}(limit: 1) { __typename } }`,
                    `query { ${fieldName}(where: {}) { __typename } }`,
                    `query { ${fieldName}(limit: 1, offset: 0) { __typename } }`
                ];

                let fieldFound = false;
                for (const testQuery of testQueries) {
                    try {
                        const result = await this.query(testQuery);
                        if (result && !result.errors) {
                            availableFields.push(fieldName);
                            console.log(`Found field: ${fieldName}`);
                            fieldFound = true;
                            break; // Found it, no need to try other patterns
                        }
                    } catch (error) {
                        // Try next pattern
                        console.log(`Field ${fieldName} failed with pattern: ${error.message}`);
                    }
                }
                
                if (!fieldFound) {
                    console.log(`Field ${fieldName} not found with any pattern`);
                }
            } catch (error) {
                console.log(`Field ${fieldName} error: ${error.message}`);
            }
        }

        console.log('Discovered fields:', availableFields);
        
        if (availableFields.length === 0) {
            throw new Error('No fields discovered. The API might have restricted access or different field names.');
        }
        
        return {
            __schema: {
                queryType: {
                    fields: availableFields.map(name => ({ name }))
                }
            }
        };
    }

    // Simple query - get user information
    async getUserInfo() {
        const userId = this.extractUserIdFromCurrentToken();
        if (!userId) {
            throw new Error('User ID not found in token');
        }
        
        return await this.query(`
            query GetUserInfo($userId: Int!) {
                user(where: { id: { _eq: $userId } }) {
                    id
                    profile
                    attrs
                    campus
                    createdAt
                }
            }
        `, { userId: parseInt(userId) });
    }

    // Simple query - get transactions
    async getUserTransactions() {
        const userId = this.extractUserIdFromCurrentToken();
        if (!userId) {
            throw new Error('User ID not found in token');
        }
        
        return await this.query(`
            query GetUserTransactions($userId: Int!) {
                transaction(where: { userId: { _eq: $userId } }) {
                    id
                    type
                    amount
                    objectId
                    eventId
                    userId
                    createdAt
                    path
                    campus
                    attrs
                }
            }
        `, { userId: parseInt(userId) });
    }

    // Simple query - get progress
    async getUserProgress() {
        const userId = this.extractUserIdFromCurrentToken();
        if (!userId) {
            throw new Error('User ID not found in token');
        }
        
        return await this.query(`
            query GetUserProgress($userId: Int!) {
                progress(where: { userId: { _eq: $userId } }) {
                    id
                    userId
                    groupId
                    eventId
                    objectId
                    grade
                    isDone
                    version
                    createdAt
                    updatedAt
                    path
                    campus
                }
            }
        `, { userId: parseInt(userId) });
    }

    // Simple query - get results
    async getUserResults() {
        const userId = this.extractUserIdFromCurrentToken();
        if (!userId) {
            throw new Error('User ID not found in token');
        }
        
        return await this.query(`
            query GetUserResults($userId: Int!) {
                result(where: { userId: { _eq: $userId } }) {
                    id
                    userId
                    groupId
                    objectId
                    eventId
                    grade
                    type
                    isLast
                    version
                    attrs
                    createdAt
                    updatedAt
                    path
                    campus
                }
            }
        `, { userId: parseInt(userId) });
    }

    // Helper method to extract user ID from current token
    extractUserIdFromCurrentToken() {
        if (!this.token) return null;
        
        try {
            const parts = this.token.split('.');
            if (parts.length !== 3) return null;
            
            let payload = parts[1];
            while (payload.length % 4) {
                payload += '=';
            }
            
            const decodedPayload = JSON.parse(atob(payload));
            return decodedPayload.sub || decodedPayload.user_id || decodedPayload.id || decodedPayload.userId;
        } catch (error) {
            console.error('Error extracting user ID from token:', error);
            return null;
        }
    }

    // Query with arguments - get specific object by ID
    async getObject(objectId) {
        const query = `
            query GetObject($objectId: Int!) {
                object(where: { id: { _eq: $objectId } }) {
                    id
                    name
                    type
                    attrs
                    createdAt
                    updatedAt
                    campus
                }
            }
        `;
        return await this.query(query, { objectId });
    }

    // Query with arguments - get multiple objects by IDs
    async getObjects(objectIds = []) {
        if (!objectIds || objectIds.length === 0) {
            return { object: [] };
        }
        
        const query = `
            query GetObjects($objectIds: [Int!]) {
                object(where: { id: { _in: $objectIds } }) {
                    id
                    name
                    type
                    attrs
                    createdAt
                    updatedAt
                    campus
                }
            }
        `;
        return await this.query(query, { objectIds });
    }

    // Nested query - get results with user information
    async getResultsWithUser() {
        const query = `
            query {
                result {
                    id
                    grade
                    type
                    createdAt
                    path
                    user {
                        id
                        login
                    }
                }
            }
        `;
        return await this.query(query);
    }

    // Nested query - get transactions with object details
    async getTransactionsWithObjects() {
        const query = `
            query {
                transaction {
                    id
                    type
                    amount
                    objectId
                    createdAt
                    path
                    object {
                        id
                        name
                        type
                    }
                }
            }
        `;
        return await this.query(query);
    }

    // Get user rank and level information
    async getUserRankAndLevel() {
        const userId = this.extractUserIdFromCurrentToken();
        if (!userId) {
            throw new Error('User ID not found in token');
        }
        
        return await this.query(`
            query GetUserRankAndLevel($userId: Int!) {
                user(where: { id: { _eq: $userId } }) {
                    id
                    profile
                    attrs
                    campus
                    createdAt
                    updatedAt
                }
            }
        `, { userId: parseInt(userId) });
    }

    // Get user groups
    async getUserGroups() {
        const userId = this.extractUserIdFromCurrentToken();
        if (!userId) {
            throw new Error('User ID not found in token');
        }
        
        return await this.query(`
            query GetUserGroups($userId: Int!) {
                group_user(where: { userId: { _eq: $userId } }) {
                    id
                    userId
                    groupId
                    confirmed
                    createdAt
                    updatedAt
                    group {
                        id
                        objectId
                        eventId
                        captainId
                        path
                        campus
                        createdAt
                        updatedAt
                    }
                }
            }
        `, { userId: parseInt(userId) });
    }

    // Get user events
    async getUserEvents() {
        const userId = this.extractUserIdFromCurrentToken();
        if (!userId) {
            throw new Error('User ID not found in token');
        }
        
        return await this.query(`
            query GetUserEvents($userId: Int!) {
                event_user(where: { userId: { _eq: $userId } }) {
                    id
                    userId
                    eventId
                    createdAt
                    event {
                        id
                        createdAt
                        endAt
                        registrationId
                        objectId
                        parentId
                        status
                        path
                        campus
                        code
                    }
                }
            }
        `, { userId: parseInt(userId) });
    }

    // Get audit statistics
    async getAuditStats() {
        const userId = this.extractUserIdFromCurrentToken();
        if (!userId) {
            throw new Error('User ID not found in token');
        }
        
        return await this.query(`
            query GetAuditStats($userId: Int!) {
                audit(where: { auditorId: { _eq: $userId } }) {
                    id
                    groupId
                    auditorId
                    grade
                    attrs
                    createdAt
                    updatedAt
                    resultId
                    version
                    endAt
                    private
                }
            }
        `, { userId: parseInt(userId) });
    }

    // Get audits where user is being audited
    async getAuditsForUser() {
        const userId = this.extractUserIdFromCurrentToken();
        if (!userId) {
            throw new Error('User ID not found in token');
        }
        
        return await this.query(`
            query GetAuditsForUser($userId: Int!) {
                group_user(where: { userId: { _eq: $userId } }) {
                    group {
                        audit {
                            id
                            groupId
                            auditorId
                            grade
                            attrs
                            createdAt
                            updatedAt
                            resultId
                            version
                            endAt
                        }
                    }
                }
            }
        `, { userId: parseInt(userId) });
    }



    // Get XP distribution data for comparison
    async getXpDistribution() {
        const query = `
            query {
                transaction {
                    id
                    type
                    amount
                    userId
                    createdAt
                }
            }
        `;
        return await this.query(query);
    }

    // Get all objects (fallback when no specific IDs)
    async getAllObjects(limit = 100) {
        const query = `
            query GetAllObjects($limit: Int!) {
                object(limit: $limit, order_by: { createdAt: desc }) {
                    id
                    name
                    type
                    attrs
                    createdAt
                    updatedAt
                    campus
                }
            }
        `;
        return await this.query(query, { limit });
    }

    // Get objects by type
    async getObjectsByType(objectType, limit = 50) {
        const query = `
            query GetObjectsByType($objectType: String!, $limit: Int!) {
                object(where: { type: { _eq: $objectType } }, limit: $limit, order_by: { createdAt: desc }) {
                    id
                    name
                    type
                    attrs
                    createdAt
                    updatedAt
                    campus
                }
            }
        `;
        return await this.query(query, { objectType, limit });
    }

    // Get user records (bans, etc.)
    async getUserRecords() {
        const userId = this.extractUserIdFromCurrentToken();
        if (!userId) {
            throw new Error('User ID not found in token');
        }
        
        return await this.query(`
            query GetUserRecords($userId: Int!) {
                record(where: { userId: { _eq: $userId } }) {
                    id
                    userId
                    authorId
                    message
                    banEndAt
                    createdAt
                }
            }
        `, { userId: parseInt(userId) });
    }

    // Get user matches (for bonus exercises)
    async getUserMatches() {
        const userId = this.extractUserIdFromCurrentToken();
        if (!userId) {
            throw new Error('User ID not found in token');
        }
        
        return await this.query(`
            query GetUserMatches($userId: Int!) {
                match(where: { userId: { _eq: $userId } }) {
                    id
                    createdAt
                    updatedAt
                    objectId
                    userId
                    matchId
                    confirmed
                    bet
                    result
                    path
                    campus
                    eventId
                }
            }
        `, { userId: parseInt(userId) });
    }


}

// Initialize GraphQL client
const GRAPHQL_ENDPOINT = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql';
let graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT);

// Make GraphQL client available globally
window.graphqlClient = graphqlClient;