export function formatCurrency(value: string | number): string {
  const amount = typeof value === "number" ? value : Number.parseFloat(value);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function summarizeExpenses(expenses: Array<{ amount: string; category: string }>) {
  const byCategory = new Map<string, { category: string; total: number; count: number }>();
  let total = 0;

  for (const expense of expenses) {
    const amount = Number.parseFloat(expense.amount);
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    total += safeAmount;

    const current = byCategory.get(expense.category) ?? { category: expense.category, total: 0, count: 0 };
    current.total += safeAmount;
    current.count += 1;
    byCategory.set(expense.category, current);
  }

  return {
    totalAmount: total,
    expenseCount: expenses.length,
    byCategory: [...byCategory.values()].sort((left, right) => right.total - left.total),
  };
}

export function getTopCategory(expenses: Array<{ amount: string; category: string }>) {
  const summary = summarizeExpenses(expenses);
  return summary.byCategory[0] ?? null;
}
