import dotenv from 'dotenv';
// Load environment variables from .env file if available
dotenv.config();
function getPort() {
    const args = process.argv.slice(2);
    const portIndex = args.indexOf('--port');
    if (portIndex !== -1 && args[portIndex + 1]) {
        const parsed = parseInt(args[portIndex + 1], 10);
        if (!isNaN(parsed))
            return parsed;
    }
    if (process.env.MCP_SSE_PORT) {
        const parsed = parseInt(process.env.MCP_SSE_PORT, 10);
        if (!isNaN(parsed))
            return parsed;
    }
    if (process.env.PORT) {
        const parsed = parseInt(process.env.PORT, 10);
        if (!isNaN(parsed))
            return parsed;
    }
    return 8001;
}
export const config = {
    apiBaseUrl: (process.env.EXPENSE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, ''),
    apiToken: process.env.EXPENSE_API_TOKEN || '',
    apiEmail: process.env.EXPENSE_API_EMAIL || '',
    apiPassword: process.env.EXPENSE_API_PASSWORD || '',
    // Required for remote MCP clients. Keep this value in the server environment
    // and configure the same bearer token in the ChatGPT custom app.
    mcpAuthToken: process.env.MCP_AUTH_TOKEN || '',
    ssePort: getPort(),
    appName: 'expense-tracker-mcp',
    appVersion: '1.0.0',
};
//# sourceMappingURL=config.js.map