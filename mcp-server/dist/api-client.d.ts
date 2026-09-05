import { Expense, SummaryResponse, InsightsResponse, TokenResponse, UserResponse, ExpenseCategory } from './types.js';
export declare class ExpenseApiClient {
    private client;
    private currentToken;
    constructor();
    setToken(token: string): void;
    getToken(): string;
    /**
     * Automatically ensure we have a valid token if credentials exist
     */
    ensureAuthenticated(): Promise<void>;
    /**
     * Login user with email & password
     */
    login(email?: string, password?: string): Promise<TokenResponse>;
    /**
     * Get current authenticated user profile
     */
    getCurrentUser(): Promise<UserResponse>;
    /**
     * List expenses with optional filters
     */
    listExpenses(params?: {
        category?: ExpenseCategory;
        start_date?: string;
        end_date?: string;
        user_id?: string;
    }): Promise<Expense[]>;
    /**
     * Get expense by ID
     */
    getExpense(expenseId: string): Promise<Expense>;
    /**
     * Create a new expense
     */
    createExpense(data: {
        amount: number;
        description: string;
        category: ExpenseCategory;
        date: string;
        user_id?: string;
    }): Promise<Expense>;
    /**
     * Update an existing expense
     */
    updateExpense(expenseId: string, data: {
        amount?: number;
        description?: string;
        category?: ExpenseCategory;
        date?: string;
    }): Promise<Expense>;
    /**
     * Delete an expense by ID
     */
    deleteExpense(expenseId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Get financial summary stats
     */
    getSummary(params?: {
        start_date?: string;
        end_date?: string;
        user_id?: string;
    }): Promise<SummaryResponse>;
    /**
     * Get financial health & AI insights
     */
    getInsights(params?: {
        monthly_budget?: number;
        user_id?: string;
    }): Promise<InsightsResponse>;
    private handleError;
}
export declare const apiClient: ExpenseApiClient;
