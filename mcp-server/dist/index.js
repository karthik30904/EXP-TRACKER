import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import { timingSafeEqual } from 'crypto';
import { config } from './config.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';
export function createMcpServer() {
    const server = new Server({
        name: config.appName,
        version: config.appVersion,
    }, {
        capabilities: {
            tools: {},
            resources: {},
            prompts: {},
        },
    });
    registerTools(server);
    registerResources(server);
    registerPrompts(server);
    return server;
}
async function runStdioServer() {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`[MCP] Expense Tracker MCP Server running on STDIO transport (v${config.appVersion})`);
}
async function runSseServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());
    const requireMcpAuth = (req, res, next) => {
        const expected = `Bearer ${config.mcpAuthToken}`;
        const received = req.get('authorization') || '';
        const expectedBuffer = Buffer.from(expected);
        const receivedBuffer = Buffer.from(received);
        if (!config.mcpAuthToken ||
            expectedBuffer.length !== receivedBuffer.length ||
            !timingSafeEqual(expectedBuffer, receivedBuffer)) {
            res.status(401).json({ error: 'Valid MCP bearer authentication is required.' });
            return;
        }
        next();
    };
    // Store active SSE transports by session ID
    const sseTransports = {};
    app.get('/health', (_req, res) => {
        res.json({
            status: 'healthy',
            server: config.appName,
            version: config.appVersion,
            transport: 'sse',
            apiBaseUrl: config.apiBaseUrl,
        });
    });
    // SSE endpoint for AI clients (Cursor, ChatGPT, Claude Web remote, etc.)
    app.get('/sse', requireMcpAuth, async (req, res) => {
        console.log(`[MCP] New SSE client connection initiated`);
        const server = createMcpServer();
        const transport = new SSEServerTransport('/message', res);
        const sessionId = transport.sessionId;
        sseTransports[sessionId] = transport;
        transport.onclose = () => {
            console.log(`[MCP] SSE client session closed: ${sessionId}`);
            delete sseTransports[sessionId];
        };
        await server.connect(transport);
    });
    // Post message endpoint for client to send JSON-RPC requests
    app.post('/message', requireMcpAuth, async (req, res) => {
        const sessionId = req.query.sessionId;
        const transport = sseTransports[sessionId];
        if (!transport) {
            res.status(404).json({ error: `Session not found: ${sessionId}` });
            return;
        }
        await transport.handlePostMessage(req, res);
    });
    // OpenAPI schema endpoint for ChatGPT Custom GPT Actions
    app.get('/openapi.json', (_req, res) => {
        res.json({
            openapi: '3.1.0',
            info: {
                title: 'Expense Tracker MCP & REST API',
                description: 'REST and MCP Action interface for Expense Tracker budgeting and insights',
                version: config.appVersion,
            },
            servers: [{ url: config.apiBaseUrl }],
            paths: {
                '/api/v1/expenses': {
                    get: {
                        summary: 'List expenses',
                        operationId: 'listExpenses',
                        parameters: [
                            { name: 'category', in: 'query', schema: { type: 'string' } },
                            { name: 'start_date', in: 'query', schema: { type: 'string' } },
                            { name: 'end_date', in: 'query', schema: { type: 'string' } },
                        ],
                        responses: { '200': { description: 'Success' } },
                    },
                    post: {
                        summary: 'Create expense',
                        operationId: 'createExpense',
                        requestBody: {
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: ['amount', 'description', 'category', 'date'],
                                        properties: {
                                            amount: { type: 'number' },
                                            description: { type: 'string' },
                                            category: { type: 'string' },
                                            date: { type: 'string' },
                                        },
                                    },
                                },
                            },
                        },
                        responses: { '201': { description: 'Created' } },
                    },
                },
                '/api/v1/stats/summary': {
                    get: {
                        summary: 'Get expense summary',
                        operationId: 'getSummary',
                        parameters: [
                            { name: 'start_date', in: 'query', schema: { type: 'string' } },
                            { name: 'end_date', in: 'query', schema: { type: 'string' } },
                        ],
                        responses: { '200': { description: 'Success' } },
                    },
                },
                '/api/v1/stats/insights': {
                    get: {
                        summary: 'Get financial insights',
                        operationId: 'getInsights',
                        parameters: [
                            { name: 'monthly_budget', in: 'query', schema: { type: 'number', default: 50000 } },
                        ],
                        responses: { '200': { description: 'Success' } },
                    },
                },
            },
        });
    });
    const port = config.ssePort;
    const httpServer = app.listen(port, () => {
        console.log(`=======================================================`);
        console.log(` Expense Tracker MCP Server running in SSE / HTTP Mode `);
        console.log(` Port:           ${port}`);
        console.log(` SSE Endpoint:   http://localhost:${port}/sse`);
        console.log(` Health Check:   http://localhost:${port}/health`);
        console.log(` OpenAPI Spec:   http://localhost:${port}/openapi.json`);
        console.log(` Target API:     ${config.apiBaseUrl}`);
        console.log(`=======================================================`);
    });
    httpServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n[MCP ERROR] Port ${port} is already in use by another process.`);
            console.error(`To resolve this issue, you can either:`);
            console.error(` 1. Run on an alternate port: npm run start:sse -- --port 8002`);
            console.error(` 2. Set the port in .env: MCP_SSE_PORT=8002`);
            console.error(` 3. Terminate the existing process using port ${port}:\n    Stop-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess -Force\n`);
        }
        else {
            console.error('[MCP ERROR] HTTP Server Error:', err.message || err);
        }
        process.exit(1);
    });
}
import { fileURLToPath } from 'url';
// CLI entrypoint
const isMain = process.argv[1] && (process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('index.ts') ||
    fileURLToPath(import.meta.url) === process.argv[1]);
if (isMain) {
    const args = process.argv.slice(2);
    const isSseMode = args.includes('--transport') && args[args.indexOf('--transport') + 1] === 'sse';
    if (isSseMode || process.env.MCP_TRANSPORT === 'sse') {
        runSseServer().catch((err) => {
            console.error('[MCP] Fatal SSE Server Error:', err);
            process.exit(1);
        });
    }
    else {
        runStdioServer().catch((err) => {
            console.error('[MCP] Fatal STDIO Server Error:', err);
            process.exit(1);
        });
    }
}
//# sourceMappingURL=index.js.map