import axios from 'axios';
import { config } from './config.js';
export class ExpenseApiClient {
    client;
    currentToken = '';
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
    setToken(token) {
        this.currentToken = token;
    }
    getToken() {
        return this.currentToken;
    }
    /**
     * Automatically ensure we have a valid token if credentials exist
     */
    async ensureAuthenticated() {
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
    async login(email, password) {
        const loginEmail = email || config.apiEmail;
        const loginPassword = password || config.apiPassword;
        if (!loginEmail || !loginPassword) {
            throw new Error('Authentication required. Please provide email & password or configure EXPENSE_API_TOKEN.');
        }
        try {
            const response = await this.client.post('/auth/login', {
                email: loginEmail,
                password: loginPassword,
            });
            this.currentToken = response.data.access_token;
            return response.data;
        }
        catch (err) {
            throw this.handleError(err, 'Failed to log in');
        }
    }
    /**
     * Get current authenticated user profile
     */
    async getCurrentUser() {
        await this.ensureAuthenticated();
        try {
            const response = await this.client.get('/auth/me');
            return response.data;
        }
        catch (err) {
            throw this.handleError(err, 'Failed to fetch current user profile');
        }
    }
    /**
     * List expenses with optional filters
     */
    async listExpenses(params) {
        await this.ensureAuthenticated();
        try {
            const response = await this.client.get('/expenses', { params });
            return response.data;
        }
        catch (err) {
            throw this.handleError(err, 'Failed to list expenses');
        }
    }
    /**
     * Get expense by ID
     */
    async getExpense(expenseId) {
        await this.ensureAuthenticated();
        try {
            const response = await this.client.get(`/expenses/${expenseId}`);
            return response.data;
        }
        catch (err) {
            throw this.handleError(err, `Failed to retrieve expense with ID ${expenseId}`);
        }
    }
    /**
     * Create a new expense
     */
    async createExpense(data) {
        await this.ensureAuthenticated();
        try {
            const params = data.user_id ? { user_id: data.user_id } : undefined;
            const payload = {
                amount: data.amount,
                description: data.description,
                category: data.category,
                date: data.date,
            };
            const response = await this.client.post('/expenses', payload, { params });
            return response.data;
        }
        catch (err) {
            throw this.handleError(err, 'Failed to create expense');
        }
    }
    /**
     * Update an existing expense
     */
    async updateExpense(expenseId, data) {
        await this.ensureAuthenticated();
        try {
            const response = await this.client.patch(`/expenses/${expenseId}`, data);
            return response.data;
        }
        catch (err) {
            throw this.handleError(err, `Failed to update expense with ID ${expenseId}`);
        }
    }
    /**
     * Delete an expense by ID
     */
    async deleteExpense(expenseId) {
        await this.ensureAuthenticated();
        try {
            await this.client.delete(`/expenses/${expenseId}`);
            return { success: true, message: `Expense ${expenseId} deleted successfully.` };
        }
        catch (err) {
            throw this.handleError(err, `Failed to delete expense with ID ${expenseId}`);
        }
    }
    /**
     * Get financial summary stats
     */
    async getSummary(params) {
        await this.ensureAuthenticated();
        try {
            const response = await this.client.get('/stats/summary', { params });
            return response.data;
        }
        catch (err) {
            throw this.handleError(err, 'Failed to fetch expense summary');
        }
    }
    /**
     * Get financial health & AI insights
     */
    async getInsights(params) {
        await this.ensureAuthenticated();
        try {
            const response = await this.client.get('/stats/insights', { params });
            return response.data;
        }
        catch (err) {
            throw this.handleError(err, 'Failed to fetch financial insights');
        }
    }
    handleError(err, context) {
        if (axios.isAxiosError(err)) {
            const axiosError = err;
            const status = axiosError.response?.status;
            const detail = axiosError.response?.data?.detail;
            let detailStr = '';
            if (typeof detail === 'string') {
                detailStr = `: ${detail}`;
            }
            else if (Array.isArray(detail)) {
                detailStr = `: ${detail.map((d) => d.msg || JSON.stringify(d)).join(', ')}`;
            }
            else if (axiosError.message) {
                detailStr = `: ${axiosError.message}`;
            }
            if (status === 401) {
                return new Error(`${context} (401 Unauthorized${detailStr}). Check your authentication token or credentials.`);
            }
            if (status === 403) {
                return new Error(`${context} (403 Forbidden${detailStr}). Insufficient permissions.`);
            }
            if (status === 404) {
                return new Error(`${context} (404 Not Found${detailStr}).`);
            }
            return new Error(`${context} (HTTP ${status || 'ERR'}${detailStr})`);
        }
        return new Error(`${context}: ${err.message || String(err)}`);
    }
}
export const apiClient = new ExpenseApiClient();
//# sourceMappingURL=api-client.js.map