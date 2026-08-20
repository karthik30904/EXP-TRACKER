import test from "node:test";
import assert from "node:assert/strict";

import { formatCurrency, getTopCategory, summarizeExpenses } from "../lib/expense-utils.mjs";

test("formatCurrency formats rupee values", () => {
  assert.equal(formatCurrency("25.5"), "₹25.50");
  assert.equal(formatCurrency(100), "₹100.00");
});

test("summarizeExpenses totals and sorts categories", () => {
  const summary = summarizeExpenses([
    { amount: "45.50", category: "food" },
    { amount: "12.00", category: "transport" },
    { amount: "35.00", category: "food" },
  ]);

  assert.equal(summary.totalAmount, 92.5);
  assert.equal(summary.expenseCount, 3);
  assert.deepEqual(summary.byCategory[0], { category: "food", total: 80.5, count: 2 });
});

test("getTopCategory returns the highest category", () => {
  const top = getTopCategory([
    { amount: "45.50", category: "food" },
    { amount: "250.00", category: "bills" },
  ]);

  assert.deepEqual(top, { category: "bills", total: 250, count: 1 });
});
