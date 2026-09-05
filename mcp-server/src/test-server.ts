import { createMcpServer } from './index.js';
import { TOOLS } from './tools/index.js';
import { RESOURCES } from './resources/index.js';
import { PROMPTS } from './prompts/index.js';

async function runTests() {
  console.log('--- Testing Expense Tracker MCP Server Initialization ---');

  const server = createMcpServer();
  if (!server) {
    throw new Error('Failed to create MCP server instance');
  }
  console.log('✓ MCP Server instantiated successfully');

  // Verify Tools
  console.log(`\n--- Verifying Registered Tools (${TOOLS.length} total) ---`);
  const expectedTools = [
    'authenticate',
    'get_user_profile',
    'list_expenses',
    'get_expense',
    'create_expense',
    'update_expense',
    'delete_expense',
    'get_summary',
    'get_insights',
  ];

  for (const toolName of expectedTools) {
    const found = TOOLS.find((t) => t.name === toolName);
    if (!found) {
      throw new Error(`Missing expected tool: ${toolName}`);
    }
    console.log(`✓ Tool '${toolName}': ${(found.description || '').slice(0, 60)}...`);
  }

  // Verify Resources
  console.log(`\n--- Verifying Registered Resources (${RESOURCES.length} total) ---`);
  const expectedResources = [
    'expenses://categories',
    'expenses://summary/current',
    'expenses://insights/latest',
  ];

  for (const uri of expectedResources) {
    const found = RESOURCES.find((r) => r.uri === uri);
    if (!found) {
      throw new Error(`Missing expected resource: ${uri}`);
    }
    console.log(`✓ Resource '${uri}': ${found.name}`);
  }

  // Verify Prompts
  console.log(`\n--- Verifying Registered Prompts (${PROMPTS.length} total) ---`);
  const expectedPrompts = ['analyze_spending', 'audit_expenses'];

  for (const promptName of expectedPrompts) {
    const found = PROMPTS.find((p) => p.name === promptName);
    if (!found) {
      throw new Error(`Missing expected prompt: ${promptName}`);
    }
    console.log(`✓ Prompt '${promptName}': ${(found.description || '').slice(0, 60)}...`);
  }

  console.log('\n========================================');
  console.log(' ALL MCP SERVER VERIFICATION CHECKS PASSED');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
