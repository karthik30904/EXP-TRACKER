"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type ExpenseCategory =
  | "food"
  | "transport"
  | "entertainment"
  | "shopping"
  | "bills"
  | "health"
  | "other";

type Expense = {
  id: string;
  amount: string;
  description: string;
  category: ExpenseCategory;
  date: string;
};

type SummaryItem = {
  category: ExpenseCategory;
  total: string;
  count: number;
};

type Summary = {
  total_amount: string;
  expense_count: number;
  by_category: SummaryItem[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

const emptyForm = {
  amount: "",
  description: "",
  category: "food" as ExpenseCategory,
  date: new Date().toISOString().slice(0, 10),
};

function money(value: string | number) {
  const amount = typeof value === "number" ? value : Number.parseFloat(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default function HomePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [expensesResponse, summaryResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/expenses`, { cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/v1/stats/summary`, { cache: "no-store" }),
      ]);

      if (!expensesResponse.ok) {
        throw new Error(`Expenses request failed with ${expensesResponse.status}`);
      }
      if (!summaryResponse.ok) {
        throw new Error(`Summary request failed with ${summaryResponse.status}`);
      }

      setExpenses((await expensesResponse.json()) as Expense[]);
      setSummary((await summaryResponse.json()) as Summary);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const topCategory = useMemo(() => summary?.by_category[0], [summary]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.detail ? JSON.stringify(details.detail) : "Failed to create expense");
      }

      setForm(emptyForm);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-card">
          <span className="eyebrow">Phase 2 dashboard</span>
          <h1>Track spending with a calmer, clearer workflow.</h1>
          <p>
            The dashboard connects the FastAPI backend to a polished browser experience so you can add
            expenses, review the current list, and see summary totals in one place.
          </p>
          <div className="hero-meta">
            <span className="pill">Backend: {API_BASE_URL}</span>
            <span className="pill">Live expense list</span>
            <span className="pill">Summary cards</span>
          </div>
        </div>

        <div className="hero-side">
          <div className="stat-grid">
            <article className="panel stat-card">
              <h2>Total spent</h2>
              <div className="stat-value">{summary ? money(summary.total_amount) : "-"}</div>
              <div className="stat-subtitle">Across all current expenses</div>
            </article>
            <article className="panel stat-card">
              <h2>Entries</h2>
              <div className="stat-value">{summary?.expense_count ?? "-"}</div>
              <div className="stat-subtitle">Items available in the API</div>
            </article>
          </div>
          <article className="panel stat-card">
            <h2>Top category</h2>
            <div className="stat-value">{topCategory ? topCategory.category : "-"}</div>
            <div className="stat-subtitle">
              {topCategory ? `${topCategory.count} record${topCategory.count === 1 ? "" : "s"}` : "No summary yet"}
            </div>
          </article>
        </div>
      </section>

      <section className="main-grid">
        <article className="panel">
          <h3>Add an expense</h3>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="amount">Amount</label>
              <input
                id="amount"
                inputMode="decimal"
                placeholder="25.00"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                placeholder="Lunch with the team"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value as ExpenseCategory })}
              >
                <option value="food">Food</option>
                <option value="transport">Transport</option>
                <option value="entertainment">Entertainment</option>
                <option value="shopping">Shopping</option>
                <option value="bills">Bills</option>
                <option value="health">Health</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                required
              />
            </div>

            <div className="actions">
              <button className="primary" type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save expense"}
              </button>
              <button className="secondary" type="button" onClick={() => void loadData()}>
                Refresh data
              </button>
            </div>
          </form>
          {error ? <p className="notice error">{error}</p> : <p className="notice">The form talks directly to the API.</p>}
        </article>

        <article className="panel">
          <h3>Recent expenses</h3>
          {loading ? (
            <div className="empty">Loading expense data...</div>
          ) : expenses.length === 0 ? (
            <div className="empty">No expenses yet. Add the first one from the form.</div>
          ) : (
            <div className="list">
              {expenses.map((expense) => (
                <article key={expense.id} className="expense-row">
                  <div>
                    <h4>{expense.description}</h4>
                    <p>
                      {expense.category} - {expense.id.slice(0, 8)}
                    </p>
                    <p>{expense.date}</p>
                  </div>
                  <div>
                    <div className="expense-amount">{money(expense.amount)}</div>
                    <div className="expense-date">Posted in the tracker</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
