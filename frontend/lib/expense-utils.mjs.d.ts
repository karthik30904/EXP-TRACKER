export declare function formatCurrency(value: string | number): string;
export declare function summarizeExpenses(expenses: Array<{ amount: string; category: string }>): {
  totalAmount: number;
  expenseCount: number;
  byCategory: Array<{ category: string; total: number; count: number }>;
};
export declare function getTopCategory(
  expenses: Array<{ amount: string; category: string }>
): { category: string; total: number; count: number } | null;
