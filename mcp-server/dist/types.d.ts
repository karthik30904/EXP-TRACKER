export type ExpenseCategory = 'food' | 'transport' | 'entertainment' | 'shopping' | 'bills' | 'health' | 'other';
export interface Expense {
    id: string;
    amount: number | string;
    description: string;
    category: ExpenseCategory;
    date: string;
    user_id: string;
    created_at: string;
    updated_at: string;
}
export interface CategorySummary {
    category: ExpenseCategory;
    total: number | string;
    count: number;
}
export interface SummaryResponse {
    total_amount: number | string;
    expense_count: number;
    by_category: CategorySummary[];
    period_start?: string | null;
    period_end?: string | null;
}
export interface InsightItem {
    id: string;
    type: 'warning' | 'opportunity' | 'positive' | 'recurring' | 'projection' | string;
    title: string;
    description: string;
    metric?: string | null;
    category?: ExpenseCategory | null;
    action_label?: string | null;
    action_type?: string | null;
}
export interface InsightsResponse {
    safe_daily_spend: number | string;
    projected_month_end_spend: number | string;
    remaining_days: number;
    remaining_budget: number | string;
    monthly_budget: number | string;
    burn_rate_status: 'optimal' | 'high_velocity' | 'critical' | 'under_budget' | string;
    needs_percent: number;
    wants_percent: number;
    savings_buffer_percent: number;
    recommendations: InsightItem[];
}
export interface UserResponse {
    id: string;
    email: string;
    full_name?: string | null;
    role: 'user' | 'admin' | string;
    is_active: boolean;
    created_at: string;
}
export interface TokenResponse {
    access_token: string;
    token_type: string;
    user: UserResponse;
}
