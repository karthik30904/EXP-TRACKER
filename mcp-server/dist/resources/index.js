import { ListResourcesRequestSchema, ReadResourceRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { apiClient } from '../api-client.js';
export const RESOURCES = [
    {
        uri: 'expenses://categories',
        name: 'Expense Categories',
        description: 'List of all supported expense categories in the system.',
        mimeType: 'application/json',
    },
    {
        uri: 'expenses://summary/current',
        name: 'Current Spending Summary',
        description: 'Current aggregated spending total and breakdown across categories.',
        mimeType: 'application/json',
    },
    {
        uri: 'expenses://insights/latest',
        name: 'Latest Financial Insights',
        description: 'Smart AI financial metrics, safe daily spend calculation, and budget health.',
        mimeType: 'application/json',
    },
];
export function registerResources(server) {
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
        return { resources: RESOURCES };
    });
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const { uri } = request.params;
        try {
            switch (uri) {
                case 'expenses://categories': {
                    const categories = [
                        'food',
                        'transport',
                        'entertainment',
                        'shopping',
                        'bills',
                        'health',
                        'other',
                    ];
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify({ categories }, null, 2),
                            },
                        ],
                    };
                }
                case 'expenses://summary/current': {
                    const summary = await apiClient.getSummary();
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify(summary, null, 2),
                            },
                        ],
                    };
                }
                case 'expenses://insights/latest': {
                    const insights = await apiClient.getInsights();
                    return {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify(insights, null, 2),
                            },
                        ],
                    };
                }
                default:
                    throw new Error(`Resource not found: ${uri}`);
            }
        }
        catch (error) {
            throw new Error(`Failed to read resource '${uri}': ${error.message || String(error)}`);
        }
    });
}
//# sourceMappingURL=index.js.map