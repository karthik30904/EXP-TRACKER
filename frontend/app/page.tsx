"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  clearAuth,
  fetchUsersList,
  fetchWithAuth,
  getUser,
  loginUser,
  registerUser,
  sendForgotPasswordOtp,
  sendRegisterOtp,
  resetPasswordWithOtp,
  verifyRegisterOtp,
  updateProfile,
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

type InsightItem = {
  id: string;
  type: "warning" | "opportunity" | "positive" | "recurring" | "projection";
  title: string;
  description: string;
  metric?: string | null;
  category?: ExpenseCategory | null;
  action_label?: string | null;
  action_type?: string | null;
};

type InsightsResponse = {
  safe_daily_spend: string;
  projected_month_end_spend: string;
  remaining_days: number;
  remaining_budget: string;
  monthly_budget: string;
  burn_rate_status: "optimal" | "high_velocity" | "critical" | "under_budget";
  needs_percent: number;
  wants_percent: number;
  savings_buffer_percent: number;
  recommendations: InsightItem[];
};

type TabType = "welcome" | "history" | "kpis" | "statistics" | "settings";
type ThemeType = "light" | "dark" | "slate" | "neon";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

const FINANCIAL_QUOTES = [
  {
    text: "Beware of little expenses; a small leak will sink a great ship.",
    author: "Benjamin Franklin",
  },
  {
    text: "Do not save what is left after spending, but spend what is left after saving.",
    author: "Warren Buffett",
  },
  {
    text: "A budget is telling your money where to go instead of wondering where it went.",
    author: "Dave Ramsey",
  },
  {
    text: "Financial peace isn't the acquisition of stuff. It's learning to live on less than you make.",
    author: "Dave Ramsey",
  },
  {
    text: "It’s not how much money you make, but how much money you keep.",
    author: "Robert Kiyosaki",
  },
];

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: "#f59e0b",
  transport: "#38bdf8",
  entertainment: "#a855f7",
  shopping: "#ec4899",
  bills: "#ef4444",
  health: "#10b981",
  other: "#64748b",
};

const emptyForm = {
  amount: "",
  description: "",
  category: "food" as ExpenseCategory,
  date: new Date().toISOString().slice(0, 10),
};

function formatMoney(value: string | number, currency = "INR") {
  const amount = typeof value === "number" ? value : Number.parseFloat(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const locale =
    currency === "INR"
      ? "en-IN"
      : currency === "USD"
        ? "en-US"
        : currency === "EUR"
          ? "de-DE"
          : "en-GB";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

function getInitials(fullName?: string | null, email?: string): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

const FLOATING_MONEY_ITEMS = [
  { symbol: "₹", top: "8%", left: "6%", size: "52px", colorClass: "gold", delay: "0s", duration: "8s" },
  { symbol: "$", top: "18%", left: "90%", size: "58px", colorClass: "emerald", delay: "1.5s", duration: "9s" },
  { symbol: "€", top: "72%", left: "5%", size: "46px", colorClass: "cyan", delay: "2.8s", duration: "7.5s" },
  { symbol: "£", top: "80%", left: "91%", size: "50px", colorClass: "gold", delay: "0.5s", duration: "10s" },
  { symbol: "₿", top: "42%", left: "12%", size: "42px", colorClass: "gold", delay: "3.2s", duration: "8.5s" },
  { symbol: "₹", top: "88%", left: "46%", size: "64px", colorClass: "cyan", delay: "1.2s", duration: "9s" },
  { symbol: "📈", top: "14%", left: "76%", size: "36px", colorClass: "emerald", delay: "2s", duration: "7s" },
  { symbol: "💎", top: "54%", left: "84%", size: "38px", colorClass: "purple", delay: "0.8s", duration: "6.5s" },
  { symbol: "$", top: "6%", left: "40%", size: "44px", colorClass: "emerald", delay: "3.8s", duration: "10.5s" },
  { symbol: "🪙", top: "36%", left: "95%", size: "34px", colorClass: "gold", delay: "1.8s", duration: "8s" },
  { symbol: "₹", top: "62%", left: "30%", size: "48px", colorClass: "emerald", delay: "2.2s", duration: "9.2s" },
];

function GlowingMoneyBackground() {
  const [mousePos, setMousePos] = useState({ x: -600, y: -600 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="glowing-money-viewport" aria-hidden="true">
      {/* Radiant Glowing Light Blobs */}
      <div className="money-glow-orb orb-gold" style={{ top: "-15%", left: "10%", width: "580px", height: "580px" }} />
      <div className="money-glow-orb orb-emerald" style={{ top: "35%", right: "-10%", width: "640px", height: "640px", animationDelay: "-4s" }} />
      <div className="money-glow-orb orb-cyan" style={{ bottom: "-20%", left: "25%", width: "550px", height: "550px", animationDelay: "-8s" }} />
      <div className="money-glow-orb orb-neon" style={{ top: "20%", left: "-12%", width: "480px", height: "480px", animationDelay: "-6s" }} />

      {/* Geometric Financial Hologram Grid */}
      <div className="finance-grid-overlay" />

      {/* Floating Animated Money & Currency Symbols */}
      {FLOATING_MONEY_ITEMS.map((item, idx) => (
        <span
          key={idx}
          className={`floating-currency-symbol ${item.colorClass}`}
          style={{
            top: item.top,
            left: item.left,
            fontSize: item.size,
            animationDelay: item.delay,
            animationDuration: item.duration,
          }}
        >
          {item.symbol}
        </span>
      ))}

      {/* Interactive Cursor Spotlight Glow */}
      <div
        className="cursor-glow-halo"
        style={{
          transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 0)`,
        }}
      />
    </div>
  );
}

export default function HomePage() {
  // Navigation & SPA State
  const [activeTab, setActiveTab] = useState<TabType>("welcome");
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Command Palette & HUD State
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [cmdSearch, setCmdSearch] = useState("");

  // Smart Natural Input State
  const [smartInput, setSmartInput] = useState("");
  const [hoveredCategory, setHoveredCategory] = useState<ExpenseCategory | null>(null);

  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [authStep, setAuthStep] = useState<"form" | "otp">("form");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authNewPassword, setAuthNewPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authInfoMessage, setAuthInfoMessage] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);

  // App data state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // History tab filtering state
  const [historySearch, setHistorySearch] = useState("");
  const [historyCategory, setHistoryCategory] = useState<string>("all");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");

  // Admin user selection state
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Theme & Preferences State
  const [themeMode, setThemeMode] = useState<ThemeType>("light");
  const [currency, setCurrency] = useState<"INR" | "USD" | "EUR" | "GBP">("INR");
  const [monthlyBudget, setMonthlyBudget] = useState<number>(50000);

  // Settings profile form state
  const [profileFullName, setProfileFullName] = useState("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  // Initialize preferences & auth on mount
  useEffect(() => {
    const savedTheme = (localStorage.getItem("exp_theme") as ThemeType) || "light";
    setThemeMode(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    const savedCurrency = (localStorage.getItem("exp_currency") as "INR" | "USD" | "EUR" | "GBP") || "INR";
    setCurrency(savedCurrency);

    const savedBudget = localStorage.getItem("exp_budget");
    if (savedBudget) {
      setMonthlyBudget(Number(savedBudget) || 50000);
    }

    const savedUser = getUser();
    if (savedUser) {
      setCurrentUser(savedUser);
      setSelectedUserId(savedUser.id);
      setProfileFullName(savedUser.full_name || "");
    } else {
      setLoading(false);
    }
  }, []);

  // Global Command Palette shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCmdOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isCmdOpen) {
        setIsCmdOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCmdOpen]);

  // Update theme helper
  function changeTheme(mode: ThemeType) {
    setThemeMode(mode);
    localStorage.setItem("exp_theme", mode);
    document.documentElement.setAttribute("data-theme", mode);
  }

  // Update currency helper
  function changeCurrency(curr: "INR" | "USD" | "EUR" | "GBP") {
    setCurrency(curr);
    localStorage.setItem("exp_currency", curr);
  }

  function handleBudgetChange(val: number) {
    setMonthlyBudget(val);
    localStorage.setItem("exp_budget", String(val));
  }

  // Fetch admin user list if role is admin
  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchUsersList(API_BASE_URL)
        .then((users) => {
          setRegisteredUsers(users);
          if (!selectedUserId && users.length > 0) {
            setSelectedUserId(users[0].id);
          }
        })
        .catch((err) => console.error("Error loading user directory:", err));
    }
  }, [currentUser]);

  // Load expenses and summary data
  async function loadData(targetUserId?: string) {
    setLoading(true);
    setError("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      let expUrl = `${API_BASE_URL}/api/v1/expenses`;
      let sumUrl = `${API_BASE_URL}/api/v1/stats/summary`;
      let insUrl = `${API_BASE_URL}/api/v1/stats/insights?monthly_budget=${monthlyBudget}`;

      // Strict scoping: if admin, apply target user ID
      const effectiveUserId =
        currentUser?.role === "admin" ? (targetUserId !== undefined ? targetUserId : selectedUserId) : undefined;

      if (effectiveUserId) {
        expUrl += `?user_id=${effectiveUserId}`;
        sumUrl += `?user_id=${effectiveUserId}`;
        insUrl += `&user_id=${effectiveUserId}`;
      }

      const [expensesResponse, summaryResponse, insightsResponse] = await Promise.all([
        fetchWithAuth(expUrl, { signal: controller.signal }),
        fetchWithAuth(sumUrl, { signal: controller.signal }),
        fetchWithAuth(insUrl, { signal: controller.signal }).catch(() => null),
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

      if (insightsResponse && insightsResponse.ok) {
        setInsights((await insightsResponse.json()) as InsightsResponse);
      }
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

  // Reload data when user changes or selected user changes
  useEffect(() => {
    if (currentUser) {
      void loadData(selectedUserId);
    }
  }, [currentUser, selectedUserId]);

  const topCategory = useMemo(() => summary?.by_category[0], [summary]);

  const activeInspectedUser = useMemo(() => {
    if (currentUser?.role !== "admin") return currentUser;
    return registeredUsers.find((u) => u.id === selectedUserId) || currentUser;
  }, [currentUser, registeredUsers, selectedUserId]);

  // Filtered expenses for History Tab
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (historySearch && !exp.description.toLowerCase().includes(historySearch.toLowerCase())) {
        return false;
      }
      if (historyCategory !== "all" && exp.category !== historyCategory) {
        return false;
      }
      if (historyStartDate && exp.date < historyStartDate) {
        return false;
      }
      if (historyEndDate && exp.date > historyEndDate) {
        return false;
      }
      return true;
    });
  }, [expenses, historySearch, historyCategory, historyStartDate, historyEndDate]);

  // 30-Day Spending Heatmap Generator
  const heatmapData = useMemo(() => {
    const today = new Date();
    const days: { dateStr: string; dayNum: number; amount: number; level: number }[] = [];
    const dateAmountMap = new Map<string, number>();

    for (const exp of expenses) {
      const current = dateAmountMap.get(exp.date) || 0;
      dateAmountMap.set(exp.date, current + (Number.parseFloat(exp.amount) || 0));
    }

    let zeroSpendCount = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const amount = dateAmountMap.get(dateStr) || 0;

      let level = 0;
      if (amount === 0) {
        level = 0;
        zeroSpendCount++;
      } else if (amount < 300) {
        level = 1;
      } else if (amount < 1000) {
        level = 2;
      } else if (amount < 2500) {
        level = 3;
      } else {
        level = 4;
      }

      days.push({
        dateStr,
        dayNum: d.getDate(),
        amount,
        level,
      });
    }

    return { days, zeroSpendCount };
  }, [expenses]);

  // Financial Health Score Calculation (0 - 100)
  const healthScore = useMemo(() => {
    const total = summary ? Number.parseFloat(summary.total_amount) || 0 : 0;
    const utilization = monthlyBudget > 0 ? (total / monthlyBudget) * 100 : 50;

    let budgetPoints = 50;
    if (utilization > 100) {
      budgetPoints = Math.max(0, 50 - (utilization - 100) * 1.5);
    } else if (utilization > 80) {
      budgetPoints = 40;
    }

    const catCount = summary?.by_category.length || 0;
    const catPoints = Math.min(30, catCount * 6);
    const zeroDaysPoints = Math.min(20, heatmapData.zeroSpendCount * 2);

    const score = Math.round(Math.min(100, Math.max(10, budgetPoints + catPoints + zeroDaysPoints)));
    let label = "Excellent Health";
    if (score < 40) label = "Critical Attention Needed";
    else if (score < 65) label = "Moderate Balance";
    else if (score < 85) label = "Strong Discipline";

    return { score, label };
  }, [summary, monthlyBudget, heatmapData.zeroSpendCount]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = summary ? Number.parseFloat(summary.total_amount) || 0 : 0;
    const count = summary?.expense_count || 0;
    const avg = count > 0 ? total / count : 0;

    let maxExp = 0;
    for (const exp of expenses) {
      const val = Number.parseFloat(exp.amount) || 0;
      if (val > maxExp) maxExp = val;
    }

    const budgetPercent = monthlyBudget > 0 ? Math.min(Math.round((total / monthlyBudget) * 100), 100) : 0;

    return {
      total,
      count,
      avg,
      maxExp,
      budgetPercent,
      topCat: topCategory?.category || "None",
      topCatAmount: topCategory ? Number.parseFloat(topCategory.total) || 0 : 0,
    };
  }, [summary, expenses, topCategory, monthlyBudget]);

  // SVG Donut Chart Segments
  const donutSegments = useMemo(() => {
    if (!summary || summary.by_category.length === 0) return [];
    const totalAll = Number.parseFloat(summary.total_amount) || 1;
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    return summary.by_category.map((item) => {
      const catTotal = Number.parseFloat(item.total) || 0;
      const proportion = totalAll > 0 ? catTotal / totalAll : 0;
      const strokeDash = proportion * circumference;
      const strokeOffset = accumulatedOffset;
      accumulatedOffset -= strokeDash;

      return {
        category: item.category,
        total: catTotal,
        percent: Math.round(proportion * 100),
        strokeDash: `${strokeDash} ${circumference - strokeDash}`,
        strokeOffset,
        color: CATEGORY_COLORS[item.category] || "#64748b",
      };
    });
  }, [summary]);

  // OTP Countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError("");
    setAuthInfoMessage("");

    try {
      const res = await loginUser(API_BASE_URL, authEmail, authPassword);
      setCurrentUser(res.user);
      setSelectedUserId(res.user.id);
      setProfileFullName(res.user.full_name || "");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleRegisterSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError("");
    setAuthInfoMessage("");

    if (!authPassword || authPassword.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      setAuthSubmitting(false);
      return;
    }

    try {
      const res = await sendRegisterOtp(API_BASE_URL, authEmail);
      setAuthStep("otp");
      setOtpCountdown(60);
      let msg = res.message;
      if (res.dev_otp) {
        msg += ` (Dev/Test Code: ${res.dev_otp})`;
      }
      setAuthInfoMessage(msg);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to send verification code");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleRegisterVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError("");

    if (!authOtp || authOtp.length !== 6) {
      setAuthError("Please enter the complete 6-digit verification code.");
      setAuthSubmitting(false);
      return;
    }

    try {
      const res = await verifyRegisterOtp(API_BASE_URL, {
        email: authEmail,
        otp: authOtp,
        password: authPassword,
        full_name: authFullName,
      });
      setCurrentUser(res.user);
      setSelectedUserId(res.user.id);
      setProfileFullName(res.user.full_name || "");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleForgotSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError("");
    setAuthInfoMessage("");

    try {
      const res = await sendForgotPasswordOtp(API_BASE_URL, authEmail);
      setAuthStep("otp");
      setOtpCountdown(60);
      let msg = res.message;
      if (res.dev_otp) {
        msg += ` (Dev/Test Code: ${res.dev_otp})`;
      }
      setAuthInfoMessage(msg);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to send password reset code");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleForgotReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError("");

    if (!authOtp || authOtp.length !== 6) {
      setAuthError("Please enter the 6-digit verification code.");
      setAuthSubmitting(false);
      return;
    }

    if (!authNewPassword || authNewPassword.length < 6) {
      setAuthError("New password must be at least 6 characters long.");
      setAuthSubmitting(false);
      return;
    }

    if (authNewPassword !== authConfirmPassword) {
      setAuthError("New password and confirm password do not match.");
      setAuthSubmitting(false);
      return;
    }

    try {
      const res = await resetPasswordWithOtp(API_BASE_URL, {
        email: authEmail,
        otp: authOtp,
        new_password: authNewPassword,
      });
      setAuthMode("login");
      setAuthStep("form");
      setAuthPassword("");
      setAuthOtp("");
      setAuthNewPassword("");
      setAuthConfirmPassword("");
      setAuthInfoMessage(res.message || "Password reset successfully! Please sign in with your new password.");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleResendOtp() {
    if (otpCountdown > 0) return;
    setAuthError("");
    setAuthInfoMessage("");
    try {
      if (authMode === "register") {
        const res = await sendRegisterOtp(API_BASE_URL, authEmail);
        setOtpCountdown(60);
        let msg = res.message;
        if (res.dev_otp) msg += ` (Dev/Test Code: ${res.dev_otp})`;
        setAuthInfoMessage(msg);
      } else if (authMode === "forgot") {
        const res = await sendForgotPasswordOtp(API_BASE_URL, authEmail);
        setOtpCountdown(60);
        let msg = res.message;
        if (res.dev_otp) msg += ` (Dev/Test Code: ${res.dev_otp})`;
        setAuthInfoMessage(msg);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to resend code");
    }
  }

  function handleLogout() {
    clearAuth();
    setCurrentUser(null);
    setSelectedUserId("");
    setExpenses([]);
    setSummary(null);
    setActiveTab("welcome");
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

  // Smart Natural Language Parser
  async function handleSmartAdd(e: FormEvent) {
    e.preventDefault();
    if (!smartInput.trim()) return;

    const text = smartInput.trim();
    // Match amounts like 450, 450.50, ₹150, $20
    const amountMatch = text.match(/(?:₹|\$|€|£)?\s*(\d+(?:\.\d+)?)/);
    const amount = amountMatch ? amountMatch[1] : "0";

    // Match categories
    const categories: ExpenseCategory[] = ["food", "transport", "entertainment", "shopping", "bills", "health", "other"];
    let detectedCat: ExpenseCategory = "food";
    for (const cat of categories) {
      if (new RegExp(`\\b${cat}\\b`, "i").test(text)) {
        detectedCat = cat;
        break;
      }
    }

    // Clean description
    let desc = text.replace(amountMatch ? amountMatch[0] : "", "").replace(new RegExp(`\\b${detectedCat}\\b`, "i"), "").trim();
    if (!desc) desc = `${detectedCat} expense`;

    setSubmitting(true);
    try {
      const effectiveUserId = currentUser?.role === "admin" ? selectedUserId : undefined;
      const targetUrl = `${API_BASE_URL}/api/v1/expenses${effectiveUserId ? `?user_id=${effectiveUserId}` : ""}`;

      const response = await fetchWithAuth(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          description: desc,
          category: detectedCat,
          date: new Date().toISOString().slice(0, 10),
        }),
      });

      if (!response.ok) throw new Error("Failed to save smart expense");
      setSmartInput("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add smart expense");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const effectiveUserId = currentUser?.role === "admin" ? selectedUserId : undefined;
      const targetUrl = editingExpenseId
        ? `${API_BASE_URL}/api/v1/expenses/${editingExpenseId}`
        : `${API_BASE_URL}/api/v1/expenses${effectiveUserId ? `?user_id=${effectiveUserId}` : ""}`;

      const response = await fetchWithAuth(targetUrl, {
        method: editingExpenseId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

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
    setActiveTab("welcome");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // Export to CSV
  function exportCSV() {
    if (expenses.length === 0) {
      alert("No expenses to export.");
      return;
    }
    const headers = ["ID", "Date", "Description", "Category", "Amount"];
    const rows = filteredExpenses.map((e) => [
      e.id,
      e.date,
      `"${e.description.replace(/"/g, '""')}"`,
      e.category,
      e.amount,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_${activeInspectedUser?.email || "records"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Handle 1-click Insight Quick Actions
  function handleInsightAction(actionType?: string | null, category?: ExpenseCategory | null) {
    if (!actionType) return;
    if (actionType === "jump_history" || actionType.startsWith("filter_")) {
      setActiveTab("history");
      if (category) {
        setHistoryCategory(category);
      } else if (actionType.startsWith("filter_")) {
        const cat = actionType.replace("filter_", "");
        setHistoryCategory(cat);
      }
    } else if (actionType === "jump_kpis" || actionType === "safe_limit") {
      setActiveTab("kpis");
    } else if (actionType === "jump_stats") {
      setActiveTab("statistics");
    }
  }

  // Profile update submission
  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");

    if (profileNewPassword && profileNewPassword !== profileConfirmPassword) {
      setProfileError("New password and confirmation do not match");
      setProfileSaving(false);
      return;
    }

    try {
      const updated = await updateProfile(API_BASE_URL, {
        full_name: profileFullName,
        current_password: profileCurrentPassword || undefined,
        new_password: profileNewPassword || undefined,
      });
      setCurrentUser(updated);
      setProfileMessage("Profile updated successfully!");
      setProfileCurrentPassword("");
      setProfileNewPassword("");
      setProfileConfirmPassword("");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  }

  // Filter command items
  const cmdItems = useMemo(() => {
    const all = [
      { id: "tab-welcome", title: "Jump to Welcome & Overview", group: "Navigation", action: () => setActiveTab("welcome") },
      { id: "tab-history", title: "Jump to Expenses History", group: "Navigation", action: () => setActiveTab("history") },
      { id: "tab-kpis", title: "Jump to KPIs & Budget Health", group: "Navigation", action: () => setActiveTab("kpis") },
      { id: "tab-stats", title: "Jump to Statistics & Charts", group: "Navigation", action: () => setActiveTab("statistics") },
      { id: "tab-settings", title: "Open Settings", group: "Navigation", action: () => setActiveTab("settings") },
      { id: "theme-neon", title: "Switch to ⚡ Cyber Neon Theme", group: "Theme", action: () => changeTheme("neon") },
      { id: "theme-dark", title: "Switch to 🌙 Midnight Dark Theme", group: "Theme", action: () => changeTheme("dark") },
      { id: "theme-slate", title: "Switch to 🌌 Navy Slate Theme", group: "Theme", action: () => changeTheme("slate") },
      { id: "theme-light", title: "Switch to ☀️ Warm Light Theme", group: "Theme", action: () => changeTheme("light") },
      { id: "act-csv", title: "📥 Download CSV Export", group: "Actions", action: () => exportCSV() },
      { id: "act-quote", title: "🔄 Cycle Next Quote", group: "Actions", action: () => setQuoteIndex((prev) => (prev + 1) % FINANCIAL_QUOTES.length) },
    ];
    if (!cmdSearch) return all;
    return all.filter((item) => item.title.toLowerCase().includes(cmdSearch.toLowerCase()) || item.group.toLowerCase().includes(cmdSearch.toLowerCase()));
  }, [cmdSearch]);

  // If not logged in, render the Auth view
  if (!currentUser) {
    return (
      <>
        <GlowingMoneyBackground />
        <main className="shell">
        <header className="navbar">
          <div className="brand">
            <span className="brand-icon">₹</span>
            FIN$ight
          </div>
          <div className="nav-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => changeTheme(themeMode === "light" ? "dark" : themeMode === "dark" ? "slate" : themeMode === "slate" ? "neon" : "light")}
              title="Toggle Theme"
            >
              {themeMode === "light" ? "🌙 Dark" : themeMode === "dark" ? "🌌 Slate" : themeMode === "slate" ? "⚡ Neon" : "☀️ Light"}
            </button>
          </div>
        </header>

        <section className="auth-container">
          <article className="panel">
            {authMode !== "forgot" && (
              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab ${authMode === "login" ? "active" : ""}`}
                  onClick={() => {
                    setAuthMode("login");
                    setAuthStep("form");
                    setAuthError("");
                    setAuthInfoMessage("");
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-tab ${authMode === "register" ? "active" : ""}`}
                  onClick={() => {
                    setAuthMode("register");
                    setAuthStep("form");
                    setAuthError("");
                    setAuthInfoMessage("");
                  }}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Title and descriptions */}
            {authMode === "login" && (
              <>
                <h3>Welcome back to FIN$ight</h3>
                <p className="notice" style={{ marginTop: 0, marginBottom: "20px" }}>
                  Sign in to access your futuristic financial cockpit.
                </p>
              </>
            )}

            {authMode === "register" && authStep === "form" && (
              <>
                <h3>Create an Account</h3>
                <p className="notice" style={{ marginTop: 0, marginBottom: "20px" }}>
                  Enter your details to receive an email verification code.
                </p>
              </>
            )}

            {authMode === "register" && authStep === "otp" && (
              <>
                <h3>Verify Your Email</h3>
                <p className="notice" style={{ marginTop: 0, marginBottom: "20px" }}>
                  Enter the 6-digit code sent to <strong>{authEmail}</strong>.
                </p>
              </>
            )}

            {authMode === "forgot" && authStep === "form" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0 }}>Forgot Password</h3>
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthStep("form");
                      setAuthError("");
                      setAuthInfoMessage("");
                    }}
                  >
                    &larr; Back to Sign In
                  </button>
                </div>
                <p className="notice" style={{ marginTop: 0, marginBottom: "20px" }}>
                  Enter your registered email address to receive a password reset code.
                </p>
              </>
            )}

            {authMode === "forgot" && authStep === "otp" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0 }}>Set New Password</h3>
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthStep("form");
                      setAuthError("");
                      setAuthInfoMessage("");
                    }}
                  >
                    &larr; Cancel
                  </button>
                </div>
                <p className="notice" style={{ marginTop: 0, marginBottom: "20px" }}>
                  Enter the 6-digit reset code sent to <strong>{authEmail}</strong> and your new password.
                </p>
              </>
            )}

            {/* Info Message */}
            {authInfoMessage && <p className="notice success">{authInfoMessage}</p>}

            {/* 1. LOGIN FORM */}
            {authMode === "login" && (
              <form className="form-grid" onSubmit={handleLoginSubmit}>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="password">Password</label>
                    <button
                      type="button"
                      className="auth-link"
                      onClick={() => {
                        setAuthMode("forgot");
                        setAuthStep("form");
                        setAuthError("");
                        setAuthInfoMessage("");
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
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
                    {authSubmitting ? "Authenticating..." : "Sign In"}
                  </button>
                </div>

                {authError && <p className="notice error">{authError}</p>}
              </form>
            )}

            {/* 2. REGISTER STEP 1: Details */}
            {authMode === "register" && authStep === "form" && (
              <form className="form-grid" onSubmit={handleRegisterSendOtp}>
                <div className="field">
                  <label htmlFor="fullname">Full Name (Optional)</label>
                  <input
                    id="fullname"
                    placeholder="Alice Smith"
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="reg-email">Email address</label>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="name@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="reg-password">Choose Password (min 6 chars)</label>
                  <input
                    id="reg-password"
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="actions" style={{ marginTop: "12px" }}>
                  <button className="primary" type="submit" disabled={authSubmitting} style={{ width: "100%" }}>
                    {authSubmitting ? "Sending Code..." : "Send Verification Code ✉️"}
                  </button>
                </div>

                {authError && <p className="notice error">{authError}</p>}
              </form>
            )}

            {/* 3. REGISTER STEP 2: Verify OTP */}
            {authMode === "register" && authStep === "otp" && (
              <form className="form-grid" onSubmit={handleRegisterVerify}>
                <div className="field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="reg-otp">6-Digit Verification Code</label>
                    <button
                      type="button"
                      className="auth-link"
                      onClick={() => {
                        setAuthStep("form");
                        setAuthError("");
                        setAuthOtp("");
                      }}
                    >
                      Change Email
                    </button>
                  </div>
                  <input
                    id="reg-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    className="otp-input"
                    value={authOtp}
                    onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    autoFocus
                  />
                </div>

                <div className="resend-row">
                  <span>Didn't receive the email?</span>
                  <button
                    type="button"
                    className="auth-link"
                    disabled={otpCountdown > 0}
                    onClick={handleResendOtp}
                  >
                    {otpCountdown > 0 ? `Resend code in ${otpCountdown}s` : "Resend Code"}
                  </button>
                </div>

                <div className="actions" style={{ marginTop: "14px" }}>
                  <button className="primary" type="submit" disabled={authSubmitting || authOtp.length !== 6} style={{ width: "100%" }}>
                    {authSubmitting ? "Verifying..." : "Verify & Complete Registration ✨"}
                  </button>
                </div>

                {authError && <p className="notice error">{authError}</p>}
              </form>
            )}

            {/* 4. FORGOT PASSWORD STEP 1: Enter Email */}
            {authMode === "forgot" && authStep === "form" && (
              <form className="form-grid" onSubmit={handleForgotSendOtp}>
                <div className="field">
                  <label htmlFor="forgot-email">Registered Email Address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="name@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="actions" style={{ marginTop: "12px" }}>
                  <button className="primary" type="submit" disabled={authSubmitting} style={{ width: "100%" }}>
                    {authSubmitting ? "Sending Reset Code..." : "Send Reset Code ✉️"}
                  </button>
                </div>

                {authError && <p className="notice error">{authError}</p>}
              </form>
            )}

            {/* 5. FORGOT PASSWORD STEP 2: Enter OTP & New Password */}
            {authMode === "forgot" && authStep === "otp" && (
              <form className="form-grid" onSubmit={handleForgotReset}>
                <div className="field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label htmlFor="forgot-otp">6-Digit Reset Code</label>
                    <button
                      type="button"
                      className="auth-link"
                      onClick={() => {
                        setAuthStep("form");
                        setAuthError("");
                        setAuthOtp("");
                      }}
                    >
                      Change Email
                    </button>
                  </div>
                  <input
                    id="forgot-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    className="otp-input"
                    value={authOtp}
                    onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    autoFocus
                  />
                </div>

                <div className="resend-row">
                  <span>Need a new code?</span>
                  <button
                    type="button"
                    className="auth-link"
                    disabled={otpCountdown > 0}
                    onClick={handleResendOtp}
                  >
                    {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend Code"}
                  </button>
                </div>

                <div className="field" style={{ marginTop: "10px" }}>
                  <label htmlFor="forgot-new-password">New Password (min 6 chars)</label>
                  <input
                    id="forgot-new-password"
                    type="password"
                    placeholder="••••••••"
                    value={authNewPassword}
                    onChange={(e) => setAuthNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="field">
                  <label htmlFor="forgot-confirm-password">Confirm New Password</label>
                  <input
                    id="forgot-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={authConfirmPassword}
                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div className="actions" style={{ marginTop: "14px" }}>
                  <button className="primary" type="submit" disabled={authSubmitting || authOtp.length !== 6} style={{ width: "100%" }}>
                    {authSubmitting ? "Resetting Password..." : "Update Password & Sign In 🔒"}
                  </button>
                </div>

                {authError && <p className="notice error">{authError}</p>}
              </form>
            )}

            {/* Quick Demo Logins */}
            {authMode === "login" && (
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
            )}
          </article>
        </section>
      </main>
      </>
    );
  }

  // Authenticated Futuristic Dashboard
  return (
    <>
      <GlowingMoneyBackground />
      <main className="shell">
      {/* Top Navbar with Username, Role, Command Palette Trigger, and Theme */}
      <header className="navbar">
        <div className="brand">
          <span className="brand-icon">₹</span>
          FIN$ight
        </div>

        <div className="user-nav">
          {/* ⌘K Command Palette Trigger */}
          <button
            type="button"
            className="icon-btn"
            onClick={() => setIsCmdOpen(true)}
            title="Open Command Palette (Ctrl+K or ⌘K)"
          >
            ⚡ ⌘K <span style={{ fontSize: "11px", opacity: 0.7 }}>HUD</span>
          </button>

          {/* User profile pill */}
          <div className="user-profile-header">
            <div className="avatar">{getInitials(currentUser.full_name, currentUser.email)}</div>
            <div className="user-meta-header">
              <span className="user-name-header">{currentUser.full_name || currentUser.email}</span>
              <span className="user-role-header">
                {currentUser.role === "admin" ? "🛡️ System Admin" : "👤 Standard Account"}
              </span>
            </div>
            <span className={`role-badge ${currentUser.role}`}>
              {currentUser.role === "admin" ? "Admin" : "User"}
            </span>
          </div>

          <div className="nav-actions">
            {/* 4-Theme Cycle Switcher */}
            <button
              type="button"
              className="icon-btn"
              onClick={() => changeTheme(themeMode === "light" ? "dark" : themeMode === "dark" ? "slate" : themeMode === "slate" ? "neon" : "light")}
              title="Change Theme Mode"
            >
              {themeMode === "light"
                ? "🌙 Dark"
                : themeMode === "dark"
                  ? "🌌 Slate"
                  : themeMode === "slate"
                    ? "⚡ Neon"
                    : "☀️ Light"}
            </button>

            {/* Logout button */}
            <button className="secondary" type="button" onClick={handleLogout} style={{ padding: "8px 16px", fontSize: "13px" }}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Admin User Selector & Strict Scoping Control Bar */}
      {currentUser.role === "admin" && (
        <div className="admin-control-bar">
          <div className="admin-control-info">
            <span>🛡️ <strong>Admin Inspection Bar:</strong></span>
            <span className="scoped-indicator">
              Viewing strictly: <strong>{activeInspectedUser?.full_name || activeInspectedUser?.email}</strong>
            </span>
          </div>

          <div className="admin-control-select-wrap">
            <label htmlFor="user-select">Select User Account:</label>
            <select
              id="user-select"
              className="admin-user-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              {registeredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name ? `${u.full_name} (${u.email})` : u.email} — [{u.role.toUpperCase()}]
                </option>
              ))}
            </select>
            <button
              type="button"
              className="icon-btn"
              onClick={() => void loadData(selectedUserId)}
              title="Refresh this user's data"
            >
              🔄 Reload
            </button>
          </div>
        </div>
      )}

      {/* SPA Primary Tab Navigation */}
      <nav className="spa-nav">
        <button
          type="button"
          className={`spa-tab ${activeTab === "welcome" ? "active" : ""}`}
          onClick={() => setActiveTab("welcome")}
        >
          🏠 Welcome
        </button>
        <button
          type="button"
          className={`spa-tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          📋 Expenses History <span className="spa-tab-badge">{expenses.length}</span>
        </button>
        <button
          type="button"
          className={`spa-tab ${activeTab === "kpis" ? "active" : ""}`}
          onClick={() => setActiveTab("kpis")}
        >
          📊 KPIs & Heatmap
        </button>
        <button
          type="button"
          className={`spa-tab ${activeTab === "statistics" ? "active" : ""}`}
          onClick={() => setActiveTab("statistics")}
        >
          📈 Charts & Stats
        </button>
        <button
          type="button"
          className={`spa-tab ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          ⚙️ Settings
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* TAB 1: WELCOME & OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "welcome" && (
        <section>
          {/* Smart Natural Language Quick-Input Bar */}
          <form className="smart-input-container" onSubmit={handleSmartAdd}>
            <span style={{ fontSize: "18px", fontWeight: "900", color: "var(--accent)" }}>₹</span>
            <input
              type="text"
              className="smart-input-field"
              placeholder='Smart Quick Logger (e.g. "Dinner with team ₹450 food" or "120 uber transport")...'
              value={smartInput}
              onChange={(e) => setSmartInput(e.target.value)}
            />
            <button type="submit" className="smart-input-btn" disabled={submitting || !smartInput.trim()}>
              {submitting ? "Adding..." : "Log Expense [₹]"}
            </button>
          </form>

          {/* Sample Financial Quote Card */}
          <div className="quote-card">
            <div className="quote-icon">❝</div>
            <div className="quote-content">
              <p className="quote-text">{FINANCIAL_QUOTES[quoteIndex].text}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="quote-author">— {FINANCIAL_QUOTES[quoteIndex].author}</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setQuoteIndex((prev) => (prev + 1) % FINANCIAL_QUOTES.length)}
                  title="Next inspirational quote"
                >
                  Next Quote 🔄
                </button>
              </div>
            </div>
          </div>

          {/* Hero / Overview Banner */}
          <section className="hero">
            <div className="hero-card">
              <span className="eyebrow">
                {currentUser.role === "admin"
                  ? `💎 Admin Workspace • Scoped to: ${activeInspectedUser?.full_name || activeInspectedUser?.email}`
                  : `💎 FIN$ight • Welcome, ${currentUser.full_name || currentUser.email}`}
              </span>
              <h1>Track spending with a calmer, clearer workflow.</h1>
              <p>
                {currentUser.role === "admin"
                  ? `You are inspecting records specifically for "${activeInspectedUser?.full_name || activeInspectedUser?.email}". All summaries, visualizations, and newly saved items below are strictly scoped to this user.`
                  : "Welcome to your personal expense workspace. Seamlessly log your expenses, view KPIs, and analyze your financial distribution."}
              </p>
              <div className="hero-meta">
                <span className="pill">Active User: {activeInspectedUser?.email}</span>
                <span className="pill">Role: {currentUser.role.toUpperCase()}</span>
                <span className="pill">Theme: {themeMode.toUpperCase()}</span>
              </div>
            </div>

            <div className="hero-side">
              <div className="stat-grid">
                <article className="panel stat-card">
                  <h2>Total spent</h2>
                  <div className="stat-value">{summary ? formatMoney(summary.total_amount, currency) : "-"}</div>
                  <div className="stat-subtitle">
                    {currentUser.role === "admin" ? "For selected user" : "Across your expenses"}
                  </div>
                </article>
                <article className="panel stat-card">
                  <h2>Entries</h2>
                  <div className="stat-value">{summary?.expense_count ?? "-"}</div>
                  <div className="stat-subtitle">Total records logged</div>
                </article>
              </div>
              <article className="panel stat-card">
                <h2>Top category</h2>
                <div className="stat-value" style={{ textTransform: "capitalize" }}>{topCategory ? topCategory.category : "-"}</div>
                <div className="stat-subtitle">
                  {topCategory ? `${topCategory.count} record${topCategory.count === 1 ? "" : "s"}` : "No summary yet"}
                </div>
              </article>
            </div>
          </section>

          {/* Smart Financial Advisor & Actionable Recommendations */}
          {insights && (
            <section className="advisor-card">
              <div className="advisor-header">
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                    ⚡ FIN$ight Smart Advisor & Recommendations
                  </h3>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "13px" }}>
                    Real-time AI analysis of spending velocity, safe daily limit, 50/30/20 balance, and savings targets.
                  </p>
                </div>

                <div className="advisor-pill-group">
                  <div className="safe-spend-badge" title="Daily safe spend limit to stay within monthly budget">
                    <span>🎯 Safe Daily Spend:</span>
                    <strong>{formatMoney(insights.safe_daily_spend, currency)}/day</strong>
                  </div>
                  <div className="runway-badge">
                    ⏳ {insights.remaining_days} days left
                  </div>
                  <div className="runway-badge" style={{ color: insights.burn_rate_status === "critical" ? "#ef4444" : insights.burn_rate_status === "high_velocity" ? "#f59e0b" : "#10b981" }}>
                    ⚡ Status: {insights.burn_rate_status.replace("_", " ").toUpperCase()}
                  </div>
                </div>
              </div>

              {/* 50/30/20 Rule Ratio Bar */}
              <div className="ratio-bar-wrapper">
                <div className="ratio-bar-header">
                  <span>50/30/20 Rule: <strong>Needs {insights.needs_percent}%</strong> (Target: ≤50%)</span>
                  <span><strong>Wants {insights.wants_percent}%</strong> (Target: ≤30%)</span>
                  <span><strong>Savings/Buffer {insights.savings_buffer_percent}%</strong></span>
                </div>
                <div className="ratio-bar-track">
                  <div className="ratio-bar-needs" style={{ width: `${insights.needs_percent}%` }} title={`Needs: ${insights.needs_percent}%`} />
                  <div className="ratio-bar-wants" style={{ width: `${insights.wants_percent}%` }} title={`Wants: ${insights.wants_percent}%`} />
                  <div className="ratio-bar-savings" style={{ width: `${insights.savings_buffer_percent}%` }} title={`Savings Buffer: ${insights.savings_buffer_percent}%`} />
                </div>
              </div>

              {/* Recommendations Grid */}
              {insights.recommendations.length > 0 ? (
                <div className="insights-grid">
                  {insights.recommendations.map((rec) => (
                    <div key={rec.id} className={`insight-card ${rec.type}`}>
                      <div>
                        <div className="insight-card-top">
                          <h4 className="insight-card-title">{rec.title}</h4>
                          {rec.metric && <span className="insight-card-metric">{rec.metric}</span>}
                        </div>
                        <p className="insight-card-desc">{rec.description}</p>
                      </div>
                      {rec.action_label && (
                        <button
                          type="button"
                          className="insight-action-btn"
                          onClick={() => handleInsightAction(rec.action_type, rec.category)}
                        >
                          {rec.action_label} →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="notice">Log a few expenses to generate personalized recommendations.</p>
              )}
            </section>
          )}

          {/* Main Grid: Quick Add & Recent Records */}
          <section className="main-grid">
            <article className="panel">
              <h3>
                {editingExpenseId
                  ? "Edit expense"
                  : currentUser.role === "admin"
                    ? `Add expense for ${activeInspectedUser?.full_name || activeInspectedUser?.email}`
                    : "Add an expense"}
              </h3>
              <form className="form-grid" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="amount">Amount ({currency})</label>
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
                    Refresh
                  </button>
                </div>
              </form>
              {error ? <p className="notice error">{error}</p> : <p className="notice">Entries are stored securely under the designated account.</p>}
            </article>

            <article className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0 }}>Recent Activity</h3>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setActiveTab("history")}
                >
                  View All ({expenses.length}) →
                </button>
              </div>

              {loading ? (
                <div className="empty">Loading expense data...</div>
              ) : expenses.length === 0 ? (
                <div className="empty">No expenses found for this account. Add an expense using the form.</div>
              ) : (
                <div className="list">
                  {expenses.slice(0, 4).map((expense) => (
                    <article key={expense.id} className="expense-row">
                      <div>
                        <h4>{expense.description}</h4>
                        <p>
                          {expense.category.toUpperCase()} • ID: {expense.id.slice(0, 8)}
                        </p>
                        <p>{expense.date}</p>
                      </div>
                      <div>
                        <div className="expense-amount">{formatMoney(expense.amount, currency)}</div>
                        <div className="expense-date">Active Record</div>
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
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EXPENSES HISTORY */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <section>
          <article className="panel">
            <div className="history-toolbar">
              <div>
                <h3 style={{ margin: 0 }}>📋 Comprehensive Expenses History</h3>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
                  Showing {filteredExpenses.length} of {expenses.length} records
                  {currentUser.role === "admin" && ` for ${activeInspectedUser?.full_name || activeInspectedUser?.email}`}
                </p>
              </div>

              <div className="toolbar-group">
                <button type="button" className="export-btn" onClick={exportCSV}>
                  📥 Export CSV
                </button>
              </div>
            </div>

            {/* Toolbar Filters */}
            <div className="history-toolbar" style={{ background: "rgba(0,0,0,0.02)", padding: "14px 18px", borderRadius: "16px" }}>
              <div className="toolbar-group">
                <input
                  type="text"
                  placeholder="🔍 Search descriptions..."
                  className="search-input"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />

                <select
                  className="filter-select"
                  value={historyCategory}
                  onChange={(e) => setHistoryCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="food">Food</option>
                  <option value="transport">Transport</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="shopping">Shopping</option>
                  <option value="bills">Bills</option>
                  <option value="health">Health</option>
                  <option value="other">Other</option>
                </select>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--muted)" }}>
                  <span>From:</span>
                  <input
                    type="date"
                    className="filter-select"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--muted)" }}>
                  <span>To:</span>
                  <input
                    type="date"
                    className="filter-select"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                  />
                </div>

                {(historySearch || historyCategory !== "all" || historyStartDate || historyEndDate) && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setHistorySearch("");
                      setHistoryCategory("all");
                      setHistoryStartDate("");
                      setHistoryEndDate("");
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Expenses List */}
            {loading ? (
              <div className="empty">Loading expense records...</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="empty">No expenses match the selected filters.</div>
            ) : (
              <div className="list" style={{ marginTop: "16px" }}>
                {filteredExpenses.map((expense) => (
                  <article key={expense.id} className="expense-row">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span
                          className="pill"
                          style={{
                            padding: "3px 8px",
                            fontSize: "11px",
                            textTransform: "uppercase",
                            borderColor: CATEGORY_COLORS[expense.category],
                            color: CATEGORY_COLORS[expense.category],
                          }}
                        >
                          {expense.category}
                        </span>
                        <h4 style={{ margin: 0 }}>{expense.description}</h4>
                      </div>
                      <p>
                        Date: <strong>{expense.date}</strong> • Transaction ID: <code>{expense.id.slice(0, 8)}</code>
                      </p>
                    </div>

                    <div>
                      <div className="expense-amount">{formatMoney(expense.amount, currency)}</div>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KPIS & FINANCIAL METRICS & HEATMAP */}
      {/* ========================================================================= */}
      {activeTab === "kpis" && (
        <section>
          {/* Financial Health Score Widget */}
          <div className="health-score-widget">
            <div className="health-dial">
              <div className="health-dial-inner">{healthScore.score}</div>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px" }}>Financial Health: {healthScore.label}</h3>
              <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
                Calculated from budget utilization ({kpis.budgetPercent}%), category balance, and zero-spend discipline ({heatmapData.zeroSpendCount} days).
              </p>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Total Outflow</span>
                <div className="kpi-icon-pill">💰</div>
              </div>
              <div className="kpi-value">{formatMoney(kpis.total, currency)}</div>
              <div className="kpi-subtitle">Cumulative spent across all records</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Average Transaction</span>
                <div className="kpi-icon-pill">📊</div>
              </div>
              <div className="kpi-value">{formatMoney(kpis.avg, currency)}</div>
              <div className="kpi-subtitle">Mean amount per logged expense</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Peak Transaction</span>
                <div className="kpi-icon-pill">⚡</div>
              </div>
              <div className="kpi-value">{formatMoney(kpis.maxExp, currency)}</div>
              <div className="kpi-subtitle">Highest single recorded expense</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Top Category</span>
                <div className="kpi-icon-pill">🏷️</div>
              </div>
              <div className="kpi-value" style={{ textTransform: "capitalize" }}>{kpis.topCat}</div>
              <div className="kpi-subtitle">{formatMoney(kpis.topCatAmount, currency)} allocated</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Total Volume</span>
                <div className="kpi-icon-pill">📝</div>
              </div>
              <div className="kpi-value">{kpis.count}</div>
              <div className="kpi-subtitle">Total logged transactions</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Monthly Target</span>
                <div className="kpi-icon-pill">🎯</div>
              </div>
              <div className="kpi-value">{kpis.budgetPercent}%</div>
              <div className="kpi-subtitle">
                {formatMoney(kpis.total, currency)} of {formatMoney(monthlyBudget, currency)} target
              </div>
              <div className="kpi-meter">
                <div className="kpi-meter-fill" style={{ width: `${kpis.budgetPercent}%` }} />
              </div>
            </div>
          </div>

          {/* 30-Day Spending Heatmap Card */}
          <article className="panel" style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0 }}>📅 30-Day Spending Intensity Heatmap</h3>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
                  Visual matrix of your daily spending activity over the past 30 days.
                </p>
              </div>
              <span className="pill">
                🌟 {heatmapData.zeroSpendCount} Zero-Spend Days
              </span>
            </div>

            <div className="heatmap-wrapper">
              <div className="heatmap-grid">
                {heatmapData.days.map((day) => (
                  <div
                    key={day.dateStr}
                    className={`heatmap-cell heatmap-lvl-${day.level}`}
                    title={`${day.dateStr}: ${formatMoney(day.amount, currency)}`}
                  >
                    <span>{day.dayNum}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--muted)" }}>
                <span>Past 30 Days</span>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span>Less</span>
                  <div className="heatmap-cell heatmap-lvl-0" style={{ width: "16px", height: "16px", padding: 0 }} />
                  <div className="heatmap-cell heatmap-lvl-1" style={{ width: "16px", height: "16px", padding: 0 }} />
                  <div className="heatmap-cell heatmap-lvl-2" style={{ width: "16px", height: "16px", padding: 0 }} />
                  <div className="heatmap-cell heatmap-lvl-3" style={{ width: "16px", height: "16px", padding: 0 }} />
                  <div className="heatmap-cell heatmap-lvl-4" style={{ width: "16px", height: "16px", padding: 0 }} />
                  <span>More</span>
                </div>
                <span>Today</span>
              </div>
            </div>
          </article>

          {/* Smart Insights & Optimization Recommendations */}
          {insights && insights.recommendations.length > 0 && (
            <article className="panel" style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0 }}>💡 AI Recommendations & Actionable Insights</h3>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
                    Automated analysis of discretionary wants, top category concentrations, and projected month-end surplus.
                  </p>
                </div>
                <span className="safe-spend-badge">
                  🎯 Safe Daily Limit: {formatMoney(insights.safe_daily_spend, currency)}
                </span>
              </div>

              <div className="insights-grid" style={{ marginTop: "16px" }}>
                {insights.recommendations.map((rec) => (
                  <div key={rec.id} className={`insight-card ${rec.type}`}>
                    <div>
                      <div className="insight-card-top">
                        <h4 className="insight-card-title">{rec.title}</h4>
                        {rec.metric && <span className="insight-card-metric">{rec.metric}</span>}
                      </div>
                      <p className="insight-card-desc">{rec.description}</p>
                    </div>
                    {rec.action_label && (
                      <button
                        type="button"
                        className="insight-action-btn"
                        onClick={() => handleInsightAction(rec.action_type, rec.category)}
                      >
                        {rec.action_label} →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* Target Budget Adjuster */}
          <article className="panel">
            <h3>🎯 Target Budget Adjuster</h3>
            <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "14px" }}>
              Set your target monthly expense threshold to track your budget health and utilization percentage.
            </p>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => handleBudgetChange(Number(e.target.value) || 0)}
                className="search-input"
                style={{ width: "200px" }}
              />
              <span className="pill">Current Target: {formatMoney(monthlyBudget, currency)}</span>
            </div>
          </article>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STATISTICS & CHARTS */}
      {/* ========================================================================= */}
      {activeTab === "statistics" && (
        <section className="stats-container">
          <article className="panel">
            <h3>📈 Interactive Spending Breakdown</h3>
            <p style={{ margin: "0 0 20px", color: "var(--muted)", fontSize: "14px" }}>
              Hover over donut segments to focus on category distributions.
            </p>

            {/* Interactive SVG Donut Chart */}
            {summary && summary.by_category.length > 0 ? (
              <div className="chart-donut-wrap">
                <svg className="donut-svg" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="80" fill="transparent" stroke="rgba(0,0,0,0.06)" strokeWidth="22" />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.category}
                      className="donut-segment"
                      cx="100"
                      cy="100"
                      r="80"
                      stroke={seg.color}
                      strokeDasharray={seg.strokeDash}
                      strokeDashoffset={seg.strokeOffset}
                      onMouseEnter={() => setHoveredCategory(seg.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    />
                  ))}
                </svg>
                <div className="donut-center-hub">
                  <div className="donut-center-val">
                    {hoveredCategory
                      ? formatMoney(summary.by_category.find((c) => c.category === hoveredCategory)?.total || 0, currency)
                      : formatMoney(summary.total_amount, currency)}
                  </div>
                  <div className="donut-center-label">
                    {hoveredCategory ? hoveredCategory : "Total Spend"}
                  </div>
                </div>
              </div>
            ) : null}

            {!summary || summary.by_category.length === 0 ? (
              <div className="empty">No statistical data available yet.</div>
            ) : (
              <div className="stat-category-list">
                {summary.by_category.map((item) => {
                  const catTotal = Number.parseFloat(item.total) || 0;
                  const totalAll = Number.parseFloat(summary.total_amount) || 1;
                  const percent = totalAll > 0 ? Math.round((catTotal / totalAll) * 100) : 0;
                  const isHovered = hoveredCategory === item.category;

                  return (
                    <div
                      key={item.category}
                      className="stat-category-item"
                      style={{
                        borderColor: isHovered ? CATEGORY_COLORS[item.category] : undefined,
                        transform: isHovered ? "scale(1.02)" : undefined,
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={() => setHoveredCategory(item.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    >
                      <div className="stat-cat-header">
                        <span className="stat-cat-name" style={{ color: CATEGORY_COLORS[item.category] }}>
                          ● <strong>{item.category}</strong>
                        </span>
                        <span className="stat-cat-amount">{formatMoney(item.total, currency)}</span>
                      </div>

                      <div className="stat-progress-track">
                        <div
                          className="stat-progress-fill"
                          style={{
                            width: `${percent}%`,
                            background: CATEGORY_COLORS[item.category],
                          }}
                        />
                      </div>

                      <div className="stat-meta-row">
                        <span>{item.count} transaction{item.count === 1 ? "" : "s"}</span>
                        <span>{percent}% of total spend</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          <article className="panel">
            <h3>📊 Summary Breakdown</h3>
            <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
              <div className="stat-card" style={{ padding: "16px" }}>
                <h2>Total Active Spend</h2>
                <div className="stat-value">{summary ? formatMoney(summary.total_amount, currency) : "-"}</div>
              </div>

              <div className="stat-card" style={{ padding: "16px" }}>
                <h2>Total Categories Used</h2>
                <div className="stat-value">{summary?.by_category.length || 0}</div>
              </div>

              <div className="stat-card" style={{ padding: "16px" }}>
                <h2>Data Period</h2>
                <p style={{ margin: "8px 0 0", fontSize: "13px", color: "var(--muted)" }}>
                  Start: {summary?.by_category.length ? "Recorded" : "None"} • End: Present
                </p>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <section style={{ display: "grid", gap: "24px" }}>
          {/* Profile Management */}
          <article className="panel">
            <h3>👤 Profile & Account Details</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <div className="avatar" style={{ width: "54px", height: "54px", fontSize: "20px" }}>
                {getInitials(currentUser.full_name, currentUser.email)}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "18px" }}>{currentUser.full_name || "User Account"}</h4>
                <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "14px" }}>
                  {currentUser.email} • Role: <strong>{currentUser.role.toUpperCase()}</strong>
                </p>
                <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "12px" }}>
                  ID: <code>{currentUser.id}</code>
                </p>
              </div>
            </div>

            <form className="form-grid" onSubmit={handleProfileSave} style={{ maxWidth: "560px" }}>
              <div className="field">
                <label htmlFor="p-fullname">Display Name / Full Name</label>
                <input
                  id="p-fullname"
                  value={profileFullName}
                  placeholder="e.g. Alice Wonderland"
                  onChange={(e) => setProfileFullName(e.target.value)}
                />
              </div>

              <hr style={{ border: "0", borderTop: "1px solid var(--card-border)", margin: "10px 0" }} />
              <h4 style={{ margin: "0", fontSize: "14px" }}>Change Password (Optional)</h4>

              <div className="field">
                <label htmlFor="p-current-pw">Current Password</label>
                <input
                  id="p-current-pw"
                  type="password"
                  placeholder="Required only if setting a new password"
                  value={profileCurrentPassword}
                  onChange={(e) => setProfileCurrentPassword(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="p-new-pw">New Password</label>
                <input
                  id="p-new-pw"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={profileNewPassword}
                  onChange={(e) => setProfileNewPassword(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="p-confirm-pw">Confirm New Password</label>
                <input
                  id="p-confirm-pw"
                  type="password"
                  placeholder="Re-enter new password"
                  value={profileConfirmPassword}
                  onChange={(e) => setProfileConfirmPassword(e.target.value)}
                />
              </div>

              {profileMessage && <p className="notice success">{profileMessage}</p>}
              {profileError && <p className="notice error">{profileError}</p>}

              <div className="actions" style={{ marginTop: "12px" }}>
                <button className="primary" type="submit" disabled={profileSaving}>
                  {profileSaving ? "Saving..." : "Save Profile Changes"}
                </button>
              </div>
            </form>
          </article>

          {/* Appearance & 4-Theme Mode Switcher */}
          <article className="panel">
            <h3>🎨 Appearance & Theme Modes</h3>
            <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "14px" }}>
              Select your favorite theme mode. Changes apply immediately and are stored across sessions.
            </p>

            <div className="theme-grid" style={{ maxWidth: "800px" }}>
              <div
                className={`theme-card ${themeMode === "light" ? "active" : ""}`}
                onClick={() => changeTheme("light")}
              >
                <div className="theme-preview-dot light" />
                <strong>Warm Light</strong>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Clean & warm amber</span>
              </div>

              <div
                className={`theme-card ${themeMode === "dark" ? "active" : ""}`}
                onClick={() => changeTheme("dark")}
              >
                <div className="theme-preview-dot dark" />
                <strong>Midnight Dark</strong>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Obsidian & gold</span>
              </div>

              <div
                className={`theme-card ${themeMode === "slate" ? "active" : ""}`}
                onClick={() => changeTheme("slate")}
              >
                <div className="theme-preview-dot slate" />
                <strong>Navy Slate</strong>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Deep slate & cyan</span>
              </div>

              <div
                className={`theme-card ${themeMode === "neon" ? "active" : ""}`}
                onClick={() => changeTheme("neon")}
              >
                <div className="theme-preview-dot neon" />
                <strong>⚡ Cyber Neon</strong>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>Laser cyan & magenta</span>
              </div>
            </div>
          </article>

          {/* Regional Preferences */}
          <article className="panel">
            <h3>⚙️ Preferences</h3>
            <div className="field" style={{ maxWidth: "400px" }}>
              <label htmlFor="pref-currency">Preferred Currency Format</label>
              <select
                id="pref-currency"
                value={currency}
                onChange={(e) => changeCurrency(e.target.value as "INR" | "USD" | "EUR" | "GBP")}
              >
                <option value="INR">₹ Indian Rupee (INR)</option>
                <option value="USD">$ US Dollar (USD)</option>
                <option value="EUR">€ Euro (EUR)</option>
                <option value="GBP">£ British Pound (GBP)</option>
              </select>
            </div>
          </article>

          {/* Admin User Directory (Visible to Admin Only) */}
          {currentUser.role === "admin" && (
            <article className="panel">
              <h3>🛡️ Admin User Directory</h3>
              <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "14px" }}>
                Inspect and switch to any user account registered in the system.
              </p>

              <div className="user-dir-list">
                {registeredUsers.map((u) => (
                  <div key={u.id} className="user-dir-item">
                    <div>
                      <strong>{u.full_name || "Unnamed User"}</strong>
                      <div style={{ fontSize: "13px", color: "var(--muted)" }}>{u.email}</div>
                      <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                        Role: <span className={`role-badge ${u.role}`}>{u.role}</span> • ID: {u.id.slice(0, 8)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={selectedUserId === u.id ? "primary" : "secondary"}
                      style={{ padding: "6px 14px", fontSize: "12px" }}
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setActiveTab("welcome");
                      }}
                    >
                      {selectedUserId === u.id ? "Currently Viewing" : "Inspect User Expenses"}
                    </button>
                  </div>
                ))}
              </div>
            </article>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* ⚡ GLOBAL COMMAND PALETTE HUD (⌘K / Ctrl+K) */}
      {/* ========================================================================= */}
      {isCmdOpen && (
        <div className="cmd-backdrop" onClick={() => setIsCmdOpen(false)}>
          <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cmd-header">
              <span>⚡</span>
              <input
                type="text"
                className="cmd-input"
                placeholder="Type a command or jump to tab..."
                value={cmdSearch}
                onChange={(e) => setCmdSearch(e.target.value)}
                autoFocus
              />
              <span className="cmd-kbd">ESC</span>
            </div>

            <div className="cmd-list">
              {cmdItems.map((item) => (
                <div
                  key={item.id}
                  className="cmd-item"
                  onClick={() => {
                    item.action();
                    setIsCmdOpen(false);
                  }}
                >
                  <span>{item.title}</span>
                  <span className="cmd-kbd">{item.group}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
    </>
  );
}
