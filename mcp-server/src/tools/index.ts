import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { apiClient } from '../api-client.js';
import { ExpenseCategory } from '../types.js';

const CATEGORIES: ExpenseCategory[] = [
  'food',
  'transport',
  'entertainment',
  'shopping',
  'bills',
  'health',
  'other',
];

export const TOOLS: Tool[] = [
  {
    name: 'authenticate',
    description:
      'Authenticate with the Expense Tracker API using user credentials (email & password) to generate a valid session token for subsequent actions.',
    inputSchema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'User email address',
        },
        password: {
          type: 'string',
          description: 'User password',
        },
      },
      required: ['email', 'password'],
    },
  },
  {
    name: 'get_user_profile',
    description:
      'Retrieve information about the currently authenticated user (ID, email, name, role, status).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_expenses',
    description:
      'Query and list expenses with optional filters for category, date range (start_date, end_date), or specific user ID (admin only).',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: CATEGORIES,
          description: 'Optional category filter (food, transport, entertainment, shopping, bills, health, other)',
        },
        start_date: {
          type: 'string',
          description: 'Filter expenses on or after this date (format: YYYY-MM-DD)',
        },
        end_date: {
          type: 'string',
          description: 'Filter expenses on or before this date (format: YYYY-MM-DD)',
        },
        user_id: {
          type: 'string',
          description: 'Optional user UUID (admin only)',
        },
      },
    },
  },
  {
    name: 'get_expense',
    description: 'Retrieve full details of a specific expense by its UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        expense_id: {
          type: 'string',
          description: 'The UUID of the expense record',
        },
      },
      required: ['expense_id'],
    },
  },
  {
    name: 'create_expense',
    description:
      'Create and record a new expense item with amount, description, category, and date.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Expense amount (positive number, e.g., 42.50)',
        },
        description: {
          type: 'string',
          description: 'Detailed description of the expense item',
        },
        category: {
          type: 'string',
          enum: CATEGORIES,
          description: 'Expense category (food, transport, entertainment, shopping, bills, health, other)',
        },
        date: {
          type: 'string',
          description: 'Date of the expense in YYYY-MM-DD format (e.g. 2026-08-30)',
        },
        user_id: {
          type: 'string',
          description: 'Optional target user UUID (admin only, assigns expense to user)',
        },
      },
      required: ['amount', 'description', 'category', 'date'],
    },
  },
  {
    name: 'update_expense',
    description: 'Update one or more fields of an existing expense record by UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        expense_id: {
          type: 'string',
          description: 'The UUID of the expense record to update',
        },
        amount: {
          type: 'number',
          description: 'New amount',
        },
        description: {
          type: 'string',
          description: 'New description',
        },
        category: {
          type: 'string',
          enum: CATEGORIES,
          description: 'New category',
        },
        date: {
          type: 'string',
          description: 'New date in YYYY-MM-DD format',
        },
      },
      required: ['expense_id'],
    },
  },
  {
    name: 'delete_expense',
    description: 'Permanently remove an expense record by its UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        expense_id: {
          type: 'string',
          description: 'The UUID of the expense record to delete',
        },
      },
      required: ['expense_id'],
    },
  },
  {
    name: 'get_summary',
    description:
      'Retrieve aggregated spending summary including total amount, expense count, and category breakdown for a given date range.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date filter in YYYY-MM-DD format',
        },
        end_date: {
          type: 'string',
          description: 'End date filter in YYYY-MM-DD format',
        },
        user_id: {
          type: 'string',
          description: 'Optional user UUID (admin only)',
        },
      },
    },
  },
  {
    name: 'get_insights',
    description:
      'Retrieve AI-powered financial intelligence including safe daily spend, month-end projection, burn rate status, 50/30/20 budget breakdown, and tailored saving recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        monthly_budget: {
          type: 'number',
          description: 'Target monthly budget (e.g. 50000). Defaults to 50000 if not provided.',
        },
        user_id: {
          type: 'string',
          description: 'Optional user UUID (admin only)',
        },
      },
    },
  },
];

export function registerTools(server: Server) {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case 'authenticate': {
          const email = String(args.email || '');
          const password = String(args.password || '');
          const result = await apiClient.login(email, password);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    message: 'Authentication successful',
                    user: result.user,
                    token_type: result.token_type,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'get_user_profile': {
          const user = await apiClient.getCurrentUser();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(user, null, 2),
              },
            ],
          };
        }

        case 'list_expenses': {
          const expenses = await apiClient.listExpenses({
            category: args.category as ExpenseCategory,
            start_date: args.start_date ? String(args.start_date) : undefined,
            end_date: args.end_date ? String(args.end_date) : undefined,
            user_id: args.user_id ? String(args.user_id) : undefined,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    count: expenses.length,
                    expenses,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'get_expense': {
          const expenseId = String(args.expense_id);
          const expense = await apiClient.getExpense(expenseId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(expense, null, 2),
              },
            ],
          };
        }

        case 'create_expense': {
          const newExpense = await apiClient.createExpense({
            amount: Number(args.amount),
            description: String(args.description),
            category: args.category as ExpenseCategory,
            date: String(args.date),
            user_id: args.user_id ? String(args.user_id) : undefined,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    message: 'Expense created successfully',
                    expense: newExpense,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'update_expense': {
          const expenseId = String(args.expense_id);
          const updateData: {
            amount?: number;
            description?: string;
            category?: ExpenseCategory;
            date?: string;
          } = {};

          if (args.amount !== undefined) updateData.amount = Number(args.amount);
          if (args.description !== undefined) updateData.description = String(args.description);
          if (args.category !== undefined) updateData.category = args.category as ExpenseCategory;
          if (args.date !== undefined) updateData.date = String(args.date);

          const updated = await apiClient.updateExpense(expenseId, updateData);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    message: 'Expense updated successfully',
                    expense: updated,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'delete_expense': {
          const expenseId = String(args.expense_id);
          const result = await apiClient.deleteExpense(expenseId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'get_summary': {
          const summary = await apiClient.getSummary({
            start_date: args.start_date ? String(args.start_date) : undefined,
            end_date: args.end_date ? String(args.end_date) : undefined,
            user_id: args.user_id ? String(args.user_id) : undefined,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(summary, null, 2),
              },
            ],
          };
        }

        case 'get_insights': {
          const insights = await apiClient.getInsights({
            monthly_budget: args.monthly_budget ? Number(args.monthly_budget) : undefined,
            user_id: args.user_id ? String(args.user_id) : undefined,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(insights, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error executing tool '${name}': ${error.message || String(error)}`,
          },
        ],
      };
    }
  });
}
