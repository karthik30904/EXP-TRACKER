import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from './config.js';
import {
  Expense,
  SummaryResponse,
  InsightsResponse,
  TokenResponse,
  UserResponse,
  ExpenseCategory,
} from './types.js';

export class ExpenseApiClient {
  private client: AxiosInstance;
  private currentToken: string = '';

  constructor() {
    this.currentToken = config.apiToken;
    this.client = axios.create({
      baseURL: `${config.apiBaseUrl}/api/v1`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((reqConfig) => {
      const token = this.currentToken || config.apiToken;
      if (token) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }
      return reqConfig;
    });
  }

  public setToken(token: string) {
    this.currentToken = token;
  }

  public getToken(): string {
    return this.currentToken;
  }

  /**
   * Automatically ensure we have a valid token if credentials exist
   */
  public async ensureAuthenticated(): Promise<void> {
    if (this.currentToken) {
      return;
    }
    if (config.apiEmail && config.apiPassword) {
      await this.login(config.apiEmail, config.apiPassword);
    }
  }

  /**
   * Login user with email & password
   */
  public async login(email?: string, password?: string): Promise<TokenResponse> {
    const loginEmail = email || config.apiEmail;
    const loginPassword = password || config.apiPassword;

    if (!loginEmail || !loginPassword) {
      throw new Error(
        'Authentication required. Please provide email & password or configure EXPENSE_API_TOKEN.'
      );
    }

    try {
      const response = await this.client.post<TokenResponse>('/auth/login', {
        email: loginEmail,
        password: loginPassword,
      });

      this.currentToken = response.data.access_token;
      return response.data;
    } catch (err) {
      throw this.handleError(err, 'Failed to log in');
    }
  }

  /**
   * Get current authenticated user profile
   */
  public async getCurrentUser(): Promise<UserResponse> {
    await this.ensureAuthenticated();
    try {
      const response = await this.client.get<UserResponse>('/auth/me');
      return response.data;
    } catch (err) {
      throw this.handleError(err, 'Failed to fetch current user profile');
    }
  }

  /**
   * List expenses with optional filters
   */
  public async listExpenses(params?: {
    category?: ExpenseCategory;
    start_date?: string;
    end_date?: string;
    user_id?: string;
  }): Promise<Expense[]> {
    await this.ensureAuthenticated();
    try {
      const response = await this.client.get<Expense[]>('/expenses', { params });
      return response.data;
    } catch (err) {
      throw this.handleError(err, 'Failed to list expenses');
    }
  }

  /**
   * Get expense by ID
   */
  public async getExpense(expenseId: string): Promise<Expense> {
    await this.ensureAuthenticated();
    try {
      const response = await this.client.get<Expense>(`/expenses/${expenseId}`);
      return response.data;
    } catch (err) {
      throw this.handleError(err, `Failed to retrieve expense with ID ${expenseId}`);
    }
  }

  /**
   * Create a new expense
   */
  public async createExpense(data: {
    amount: number;
    description: string;
    category: ExpenseCategory;
    date: string;
    user_id?: string;
  }): Promise<Expense> {
    await this.ensureAuthenticated();
    try {
      const params = data.user_id ? { user_id: data.user_id } : undefined;
      const payload = {
        amount: data.amount,
        description: data.description,
        category: data.category,
        date: data.date,
      };
      const response = await this.client.post<Expense>('/expenses', payload, { params });
      return response.data;
    } catch (err) {
      throw this.handleError(err, 'Failed to create expense');
    }
  }

  /**
   * Update an existing expense
   */
  public async updateExpense(
    expenseId: string,
    data: {
      amount?: number;
      description?: string;
      category?: ExpenseCategory;
      date?: string;
    }
  ): Promise<Expense> {
    await this.ensureAuthenticated();
    try {
      const response = await this.client.patch<Expense>(`/expenses/${expenseId}`, data);
      return response.data;
    } catch (err) {
      throw this.handleError(err, `Failed to update expense with ID ${expenseId}`);
    }
  }

  /**
   * Delete an expense by ID
   */
  public async deleteExpense(expenseId: string): Promise<{ success: boolean; message: string }> {
    await this.ensureAuthenticated();
    try {
      await this.client.delete(`/expenses/${expenseId}`);
      return { success: true, message: `Expense ${expenseId} deleted successfully.` };
    } catch (err) {
      throw this.handleError(err, `Failed to delete expense with ID ${expenseId}`);
    }
  }

  /**
   * Get financial summary stats
   */
  public async getSummary(params?: {
    start_date?: string;
    end_date?: string;
    user_id?: string;
  }): Promise<SummaryResponse> {
    await this.ensureAuthenticated();
    try {
      const response = await this.client.get<SummaryResponse>('/stats/summary', { params });
      return response.data;
    } catch (err) {
      throw this.handleError(err, 'Failed to fetch expense summary');
    }
  }

  /**
   * Get financial health & AI insights
   */
  public async getInsights(params?: {
    monthly_budget?: number;
    user_id?: string;
  }): Promise<InsightsResponse> {
    await this.ensureAuthenticated();
    try {
      const response = await this.client.get<InsightsResponse>('/stats/insights', { params });
      return response.data;
    } catch (err) {
      throw this.handleError(err, 'Failed to fetch financial insights');
    }
  }

  private handleError(err: unknown, context: string): Error {
    if (axios.isAxiosError(err)) {
      const axiosError = err as AxiosError<{ detail?: string | any[] }>;
      const status = axiosError.response?.status;
      const detail = axiosError.response?.data?.detail;

      let detailStr = '';
      if (typeof detail === 'string') {
        detailStr = `: ${detail}`;
      } else if (Array.isArray(detail)) {
        detailStr = `: ${detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')}`;
      } else if (axiosError.message) {
        detailStr = `: ${axiosError.message}`;
      }

      if (status === 401) {
        return new Error(
          `${context} (401 Unauthorized${detailStr}). Check your authentication token or credentials.`
        );
      }
      if (status === 403) {
        return new Error(`${context} (403 Forbidden${detailStr}). Insufficient permissions.`);
      }
      if (status === 404) {
        return new Error(`${context} (404 Not Found${detailStr}).`);
      }
      return new Error(`${context} (HTTP ${status || 'ERR'}${detailStr})`);
    }
    return new Error(`${context}: ${(err as Error).message || String(err)}`);
  }
}

export const apiClient = new ExpenseApiClient();
