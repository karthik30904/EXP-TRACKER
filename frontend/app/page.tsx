"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { formatCurrency, getTopCategory, summarizeExpenses } from "../lib/expense-utils";

type ExpenseCategory = "food" | "transport" | "entertainment" | "shopping" | "bills" | "health" | "other";

type Expense = {
  id: string;
  amount: string;
  description: string;
  category: ExpenseCategory;
  date: string;
  user_id: string;
  created_at: string;
  updated_at: string;
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

type AuthRole = "user" | "admin";

type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  role: AuthRole;
  created_at: string;
  updated_at: string;
};

type ExpenseForm = {
  amount: string;
  description: string;
  category: ExpenseCategory;
  date: string;
};

type LoginForm = {
  email: string;
  password: string;
};

type RegisterForm = {
  full_name: string;
  email: string;
  password: string;
};

type AuthResponse = {
  access_token: string;
  token_type: string;
  user: SessionUser;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";
const SESSION_STORAGE_KEY = "expense-tracker-session";

function createEmptyExpenseForm(): ExpenseForm {
  return {
    amount: "",
    description: "",
    category: "food",
    date: new Date().toISOString().slice(0, 10),
  };
}

function createLoginForm(): LoginForm {
  return {
    email: "user@example.com",
    password: "User123!",
  };
}

function createRegisterForm(): RegisterForm {
  return {
    full_name: "",
    email: "",
    password: "",
  };
}

function expenseToForm(expense: Expense): ExpenseForm {
  return {
    amount: expense.amount,
    description: expense.description,
    category: expense.category,
    date: expense.date,
  };
}

function buildExpensePayload(form: ExpenseForm) {
  return {
    amount: form.amount,
    description: form.description.trim(),
    category: form.category,
    date: form.date,
  };
}

function parseApiError(details: unknown, fallback: string) {
  if (details && typeof details === "object" && "detail" in details) {
    const detail = (details as { detail?: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
        .filter(Boolean)
        .join("; ");
    }
    if (detail != null) {
      return JSON.stringify(detail);
    }
  }

  return fallback;
}

function formatExpenseSummary(expense: Expense) {
  return `${expense.category} - ${expense.id.slice(0, 8)}`;
}

function readStoredSession(): { token: string; user: SessionUser } | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { token?: string; user?: SessionUser };
    if (parsed.token && parsed.user) {
      return { token: parsed.token, user: parsed.user };
    }
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  return null;
}

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(createEmptyExpenseForm());
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const [loginForm, setLoginForm] = useState<LoginForm>(createLoginForm());
  const [registerForm, setRegisterForm] = useState<RegisterForm>(createRegisterForm());
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState<"login" | "register" | null>(null);

  const localSummary = useMemo(() => summarizeExpenses(expenses), [expenses]);

  async function apiRequest(path: string, init: RequestInit = {}, sessionToken?: string) {
    const headers = new Headers(init.headers);
    if (!headers.has("Content-Type") && init.body != null) {
      headers.set("Content-Type", "application/json");
    }
    if (sessionToken) {
      headers.set("Authorization", `Bearer ${sessionToken}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const details = await response.json().catch(() => null);
      throw new Error(parseApiError(details, `Request failed with ${response.status}`));
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async function loadDashboard(sessionToken: string) {
    setDashboardLoading(true);
    setDashboardError("");

    try {
      const [expensesData, summaryData] = await Promise.all([
        apiRequest("/api/v1/expenses", { cache: "no-store" }, sessionToken),
        apiRequest("/api/v1/stats/summary", { cache: "no-store" }, sessionToken),
      ]);
      setExpenses(expensesData as Expense[]);
      setSummary(summaryData as Summary);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Unable to load dashboard");
    } finally {
      setDashboardLoading(false);
    }
  }

  function saveSession(nextToken: string, nextUser: SessionUser) {
    setToken(nextToken);
    setUser(nextUser);
    setAuthError("");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ token: nextToken, user: nextUser })
      );
    }
    void loadDashboard(nextToken);
  }

  function clearSession() {
    setToken(null);
    setUser(null);
    setExpenses([]);
    setSummary(null);
    setExpenseForm(createEmptyExpenseForm());
    setEditingExpenseId(null);
    setDashboardError("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  useEffect(() => {
    const session = readStoredSession();
    if (!session) {
      return;
    }

    const hydrate = async () => {
      try {
        const me = (await apiRequest("/api/v1/auth/me", {}, session.token)) as SessionUser;
        saveSession(session.token, me);
      } catch {
        clearSession();
      }
    };

    void hydrate();
  }, []);

  const topCategory = useMemo(() => summary?.by_category[0] ?? getTopCategory(expenses), [summary, expenses]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting("login");
    setAuthError("");

    try {
      const result = (await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      })) as AuthResponse;
      saveSession(result.access_token, result.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setAuthSubmitting(null);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting("register");
    setAuthError("");

    try {
      const result = (await apiRequest("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(registerForm),
      })) as AuthResponse;
      saveSession(result.access_token, result.user);
      setRegisterForm(createRegisterForm());
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setAuthSubmitting(null);
    }
  }

  async function handleLogout() {
    clearSession();
  }

  function startEditing(expense: Expense) {
    setEditingExpenseId(expense.id);
    setExpenseForm(expenseToForm(expense));
    setDashboardError("");
  }

  function cancelEditing() {
    setEditingExpenseId(null);
    setExpenseForm(createEmptyExpenseForm());
  }

  async function handleExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setDashboardError("Please sign in first.");
      return;
    }

    setSubmittingExpense(true);
    setDashboardError("");

    try {
      const isEditing = editingExpenseId !== null;
      await apiRequest(
        isEditing ? `/api/v1/expenses/${editingExpenseId}` : "/api/v1/expenses",
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify(buildExpensePayload(expenseForm)),
        },
        token
      );
      cancelEditing();
      await loadDashboard(token);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Failed to save expense");
    } finally {
      setSubmittingExpense(false);
    }
  }

  const signedIn = Boolean(token && user);

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-card">
          <span className="eyebrow">Phase 3 auth dashboard</span>
          <h1>Track spending with a calmer workflow and role-aware access.</h1>
          <p>
            Phase 3 adds login, registration, and JWT-protected access on top of the database-backed
            dashboard so each user sees their own expenses while admins can view the full picture.
          </p>
          <div className="hero-meta">
            <span className="pill">Backend: {API_BASE_URL}</span>
            <span className="pill">JWT session</span>
            <span className="pill">{signedIn ? `${user?.role ?? "user"} account` : "Sign in to begin"}</span>
          </div>
        </div>

        <div className="hero-side">
          <div className="stat-grid">
            <article className="panel stat-card">
              <h2>Total spent</h2>
              <div className="stat-value">
                {summary ? formatCurrency(summary.total_amount) : formatCurrency(localSummary.totalAmount)}
              </div>
              <div className="stat-subtitle">Across the expenses visible to the current session</div>
            </article>
            <article className="panel stat-card">
              <h2>Entries</h2>
              <div className="stat-value">{summary?.expense_count ?? "-"}</div>
              <div className="stat-subtitle">Items returned by the API</div>
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

      {!signedIn ? (
        <section className="auth-grid">
          <article className="panel auth-card">
            <h3>Sign in</h3>
            <p className="notice">
              Use <strong>user@example.com / User123!</strong> or <strong>admin@example.com / Admin123!</strong> for
              the seeded demo accounts.
            </p>
            <form className="form-grid" onSubmit={handleLogin}>
              <div className="field">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                  required
                />
              </div>
              <div className="actions">
                <button className="primary" type="submit" disabled={authSubmitting === "login"}>
                  {authSubmitting === "login" ? "Signing in..." : "Sign in"}
                </button>
              </div>
            </form>
          </article>

          <article className="panel auth-card">
            <h3>Create account</h3>
            <p className="notice">
              New accounts are regular users by default. Admin access comes from the seeded account for local testing.
            </p>
            <form className="form-grid" onSubmit={handleRegister}>
              <div className="field">
                <label htmlFor="register-name">Full name</label>
                <input
                  id="register-name"
                  value={registerForm.full_name}
                  onChange={(event) => setRegisterForm({ ...registerForm, full_name: event.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="register-email">Email</label>
                <input
                  id="register-email"
                  type="email"
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm({ ...registerForm, email: event.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="register-password">Password</label>
                <input
                  id="register-password"
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                  required
                />
              </div>
              <div className="actions">
                <button className="primary" type="submit" disabled={authSubmitting === "register"}>
                  {authSubmitting === "register" ? "Creating..." : "Create account"}
                </button>
              </div>
            </form>
          </article>
        </section>
      ) : (
        <section className="session-bar panel">
          <div>
            <strong>{user?.full_name}</strong> signed in as <span className="session-role">{user?.role}</span>
            <div className="stat-subtitle">{user?.email}</div>
          </div>
          <button className="secondary" type="button" onClick={() => void handleLogout()}>
            Sign out
          </button>
        </section>
      )}

      {authError ? <p className="notice error">{authError}</p> : null}

      {signedIn ? (
        <section className="main-grid">
          <article className="panel">
            <h3>{editingExpenseId ? "Edit expense" : "Add an expense"}</h3>
            <form className="form-grid" onSubmit={handleExpenseSubmit}>
              <div className="field">
                <label htmlFor="amount">Amount</label>
                <input
                  id="amount"
                  inputMode="decimal"
                  placeholder="25.00"
                  value={expenseForm.amount}
                  onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  placeholder="Lunch with the team"
                  value={expenseForm.description}
                  onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={expenseForm.category}
                  onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value as ExpenseCategory })}
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
                  value={expenseForm.date}
                  onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })}
                  required
                />
              </div>

              <div className="actions">
                <button className="primary" type="submit" disabled={submittingExpense}>
                  {submittingExpense ? "Saving..." : editingExpenseId ? "Update expense" : "Save expense"}
                </button>
                <button className="secondary" type="button" onClick={() => token && void loadDashboard(token)}>
                  Refresh data
                </button>
                {editingExpenseId ? (
                  <button className="secondary" type="button" onClick={cancelEditing}>
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </form>
            {dashboardError ? (
              <p className="notice error">{dashboardError}</p>
            ) : (
              <p className="notice">Every dashboard action now goes through the JWT-protected API.</p>
            )}
          </article>

          <article className="panel">
            <h3>Recent expenses</h3>
            {dashboardLoading ? (
              <div className="empty">Loading expense data...</div>
            ) : expenses.length === 0 ? (
              <div className="empty">No expenses yet. Add the first one from the form.</div>
            ) : (
              <div className="list">
                {expenses.map((expense) => {
                  const isEditing = editingExpenseId === expense.id;

                  return (
                    <article key={expense.id} className={`expense-row${isEditing ? " expense-row-active" : ""}`}>
                      <div>
                        <h4>{expense.description}</h4>
                        <p>{formatExpenseSummary(expense)}</p>
                        <p>{expense.date}</p>
                        {user?.role === "admin" ? <p>Owner: {expense.user_id.slice(0, 8)}</p> : null}
                      </div>
                      <div className="expense-actions">
                        <div className="expense-amount">{formatCurrency(expense.amount)}</div>
                        <div className="expense-date">Posted in the tracker</div>
                        <button className="expense-link" type="button" onClick={() => startEditing(expense)}>
                          {isEditing ? "Editing" : "Edit"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </article>
        </section>
      ) : (
        <section className="panel auth-hint">
          <h3>What happens after sign in?</h3>
          <p className="notice">
            The frontend stores the JWT in browser memory, sends it with every request, and the backend uses it to
            decide which expenses you can see and whether you have admin access.
          </p>
        </section>
      )}
    </main>
  );
}
