class GraphQLClient {
    constructor(endpoint, token = null) {
        this.endpoint = endpoint;
        this.token = token;
    }

    setToken(token) {
        this.token = token;
    }

    async query(query, variables = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query, variables })
        });

        if (!response.ok) {
            throw new Error(`GraphQL HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }
        return data.data;
    }
}

const GRAPHQL_ENDPOINT = 'https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql';
window.graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT);
