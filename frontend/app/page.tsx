"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  clearAuth,
  fetchWithAuth,
  getUser,
  loginUser,
  registerUser,
  type UserProfile,
} from "./auth";

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
  user_id?: string;
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
  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  // App data state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Initialize auth state on client mount
  useEffect(() => {
    const savedUser = getUser();
    if (savedUser) {
      setCurrentUser(savedUser);
    } else {
      setLoading(false);
    }
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const [expensesResponse, summaryResponse] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/api/v1/expenses`, { signal: controller.signal }),
        fetchWithAuth(`${API_BASE_URL}/api/v1/stats/summary`, { signal: controller.signal }),
      ]);

      if (expensesResponse.status === 401 || summaryResponse.status === 401) {
        clearAuth();
        setCurrentUser(null);
        setError("Session expired. Please log in again.");
        return;
      }

      if (!expensesResponse.ok) {
        throw new Error(`Expenses request failed with status ${expensesResponse.status}`);
      }
      if (!summaryResponse.ok) {
        throw new Error(`Summary request failed with status ${summaryResponse.status}`);
      }

      setExpenses((await expensesResponse.json()) as Expense[]);
      setSummary((await summaryResponse.json()) as Summary);
    } catch (fetchError) {
      console.error("loadData error:", fetchError);
      const message =
        fetchError instanceof DOMException && fetchError.name === "AbortError"
          ? "Request timed out — is the backend running on " + API_BASE_URL + "?"
          : fetchError instanceof Error
            ? fetchError.message
            : "Unable to load dashboard";
      setError(message);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser) {
      void loadData();
    }
  }, [currentUser]);

  const topCategory = useMemo(() => summary?.by_category[0], [summary]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError("");

    try {
      let res;
      if (authMode === "login") {
        res = await loginUser(API_BASE_URL, authEmail, authPassword);
      } else {
        res = await registerUser(API_BASE_URL, authEmail, authPassword, authFullName);
      }
      setCurrentUser(res.user);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthSubmitting(false);
    }
  }

  function handleLogout() {
    clearAuth();
    setCurrentUser(null);
    setExpenses([]);
    setSummary(null);
  }

  function quickFillDemo(role: "user" | "admin") {
    if (role === "admin") {
      setAuthEmail("admin@example.com");
      setAuthPassword("Admin123!");
    } else {
      setAuthEmail("user@example.com");
      setAuthPassword("User123!");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetchWithAuth(
        editingExpenseId
          ? `${API_BASE_URL}/api/v1/expenses/${editingExpenseId}`
          : `${API_BASE_URL}/api/v1/expenses`,
        {
          method: editingExpenseId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );

      if (response.status === 401) {
        clearAuth();
        setCurrentUser(null);
        setError("Session expired. Please log in.");
        return;
      }

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.detail ? JSON.stringify(details.detail) : "Failed to save expense");
      }

      setForm(emptyForm);
      setEditingExpenseId(null);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  }

  function beginEdit(expense: Expense) {
    setEditingExpenseId(expense.id);
    setForm({
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      date: expense.date,
    });
    setError("");
  }

  async function deleteExpense(expense: Expense) {
    if (!window.confirm(`Delete "${expense.description}"? This cannot be undone.`)) {
      return;
    }

    setDeletingExpenseId(expense.id);
    setError("");
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/expenses/${expense.id}`, {
        method: "DELETE",
      });
      if (response.status === 401) {
        clearAuth();
        setCurrentUser(null);
        return;
      }
      if (!response.ok) {
        throw new Error(`Failed to delete expense (${response.status})`);
      }
      if (editingExpenseId === expense.id) {
        setEditingExpenseId(null);
        setForm(emptyForm);
      }
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete expense");
    } finally {
      setDeletingExpenseId(null);
    }
  }

  // If not logged in, render the Auth view
  if (!currentUser) {
    return (
      <main className="shell">
        <header className="navbar">
          <div className="brand">Expense Tracker</div>
          <div className="pill">Phase 3 with RBAC</div>
        </header>

        <section className="auth-container">
          <article className="panel">
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${authMode === "login" ? "active" : ""}`}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab ${authMode === "register" ? "active" : ""}`}
                onClick={() => {
                  setAuthMode("register");
                  setAuthError("");
                }}
              >
                Create Account
              </button>
            </div>

            <h3>{authMode === "login" ? "Welcome back" : "Get started with Expense Tracker"}</h3>
            <p className="notice" style={{ marginTop: 0, marginBottom: "20px" }}>
              {authMode === "login"
                ? "Sign in to access your expenses and personal summaries."
                : "Create an account to start tracking your expenses."}
            </p>

            <form className="form-grid" onSubmit={handleAuthSubmit}>
              {authMode === "register" && (
                <div className="field">
                  <label htmlFor="fullname">Full Name (Optional)</label>
                  <input
                    id="fullname"
                    placeholder="Alice Smith"
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                  />
                </div>
              )}

              <div className="field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                />
              </div>

              <div className="actions" style={{ marginTop: "12px" }}>
                <button className="primary" type="submit" disabled={authSubmitting} style={{ width: "100%" }}>
                  {authSubmitting
                    ? "Authenticating..."
                    : authMode === "login"
                      ? "Sign In"
                      : "Create Account"}
                </button>
              </div>

              {authError && <p className="notice error">{authError}</p>}
            </form>

            <div className="quick-demo">
              <p>Quick Demo Logins (Click to autofill):</p>
              <div className="quick-buttons">
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => {
                    setAuthMode("login");
                    quickFillDemo("user");
                  }}
                >
                  Demo User
                </button>
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => {
                    setAuthMode("login");
                    quickFillDemo("admin");
                  }}
                >
                  Demo Admin
                </button>
              </div>
            </div>
          </article>
        </section>
      </main>
    );
  }

  // Authenticated dashboard
  return (
    <main className="shell">
      <header className="navbar">
        <div className="brand">Expense Tracker</div>
        <div className="user-nav">
          <span className={`role-badge ${currentUser.role}`}>
            {currentUser.role === "admin" ? "Admin" : "User"}
          </span>
          <span className="user-email">{currentUser.full_name || currentUser.email}</span>
          <button className="secondary" type="button" onClick={handleLogout} style={{ padding: "6px 14px", fontSize: "13px" }}>
            Sign Out
          </button>
        </div>
      </header>

      {currentUser.role === "admin" && (
        <div className="admin-banner">
          <span>
            🛡️ <strong>Admin Mode Active:</strong> You have system-wide visibility to review and manage all user records.
          </span>
        </div>
      )}

      <section className="hero">
        <div className="hero-card">
          <span className="eyebrow">Phase 3 • Auth & RBAC Active</span>
          <h1>Track spending with a calmer, clearer workflow.</h1>
          <p>
            Connected to FastAPI with JWT authentication and PostgreSQL storage. Your data is privately isolated to your account.
          </p>
          <div className="hero-meta">
            <span className="pill">Backend: {API_BASE_URL}</span>
            <span className="pill">Logged in: {currentUser.email}</span>
            <span className="pill">Role: {currentUser.role}</span>
          </div>
        </div>

        <div className="hero-side">
          <div className="stat-grid">
            <article className="panel stat-card">
              <h2>Total spent</h2>
              <div className="stat-value">{summary ? money(summary.total_amount) : "-"}</div>
              <div className="stat-subtitle">Across your active expenses</div>
            </article>
            <article className="panel stat-card">
              <h2>Entries</h2>
              <div className="stat-value">{summary?.expense_count ?? "-"}</div>
              <div className="stat-subtitle">Total records in tracker</div>
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
          <h3>{editingExpenseId ? "Edit expense" : "Add an expense"}</h3>
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
                {submitting ? "Saving..." : editingExpenseId ? "Update expense" : "Save expense"}
              </button>
              {editingExpenseId ? (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setEditingExpenseId(null);
                    setForm(emptyForm);
                  }}
                >
                  Cancel edit
                </button>
              ) : null}
              <button className="secondary" type="button" onClick={() => void loadData()}>
                Refresh data
              </button>
            </div>
          </form>
          {error ? <p className="notice error">{error}</p> : <p className="notice">The form communicates securely using JWT authorization.</p>}
        </article>

        <article className="panel">
          <h3>Recent expenses</h3>
          {loading ? (
            <div className="empty">Loading expense data...</div>
          ) : expenses.length === 0 ? (
            <div className="empty">No expenses yet. Add your first one using the form.</div>
          ) : (
            <div className="list">
              {expenses.map((expense) => (
                <article key={expense.id} className="expense-row">
                  <div>
                    <h4>{expense.description}</h4>
                    <p>
                      {expense.category} • {expense.id.slice(0, 8)}
                    </p>
                    <p>{expense.date}</p>
                  </div>
                  <div>
                    <div className="expense-amount">{money(expense.amount)}</div>
                    <div className="expense-date">Stored securely</div>
                    <div className="row-actions">
                      <button className="text-button" type="button" onClick={() => beginEdit(expense)}>
                        Edit
                      </button>
                      <button
                        className="text-button danger-button"
                        type="button"
                        disabled={deletingExpenseId === expense.id}
                        onClick={() => void deleteExpense(expense)}
                      >
                        {deletingExpenseId === expense.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
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
