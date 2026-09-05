import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  Prompt,
} from '@modelcontextprotocol/sdk/types.js';

export const PROMPTS: Prompt[] = [
  {
    name: 'analyze_spending',
    description:
      'Perform a deep-dive analysis of user expenses, category breakdown, burn rate status, and actionable recommendations to cut costs.',
    arguments: [
      {
        name: 'focus_category',
        description: 'Specific category to focus the analysis on (e.g. food, shopping)',
        required: false,
      },
      {
        name: 'monthly_budget',
        description: 'Target monthly budget limit for context',
        required: false,
      },
    ],
  },
  {
    name: 'audit_expenses',
    description:
      'Audit recent expenses to detect anomalies, duplicate charges, unusual spikes, or recurring subscriptions.',
    arguments: [
      {
        name: 'days_to_audit',
        description: 'Number of past days to inspect (default: 30)',
        required: false,
      },
    ],
  },
];

export function registerPrompts(server: Server) {
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts: PROMPTS };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    switch (name) {
      case 'analyze_spending': {
        const focusCategory = args.focus_category ? `focusing especially on the "${args.focus_category}" category` : '';
        const budgetContext = args.monthly_budget ? `considering the target monthly budget of ${args.monthly_budget}` : '';

        return {
          description: 'Analyze spending patterns and suggest budget improvements',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please review my financial status using the Expense Tracker tools.
1. Fetch the latest financial insights and summary using \`get_insights\` and \`get_summary\`.
2. Fetch the recent list of expenses using \`list_expenses\` ${focusCategory}.
3. Provide a structured spending audit ${budgetContext}:
   - Total spent vs remaining budget
   - Top 3 spending categories
   - Safe daily spend recommendation
   - 3 high-impact, realistic cost-saving actions I can take right now.`,
              },
            },
          ],
        };
      }

      case 'audit_expenses': {
        const days = args.days_to_audit || '30';
        return {
          description: 'Audit expenses for anomalies and subscriptions',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Please audit my expense records for the past ${days} days using the \`list_expenses\` and \`get_summary\` tools:
1. Identify any unusually large or outlier transactions.
2. Detect recurring subscriptions (e.g. Netflix, Spotify, gym, software).
3. Check for potential duplicate transactions on the same day.
4. Summarize potential savings from canceling unused recurring items.`,
              },
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });
}
