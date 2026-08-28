export type UserRole = "user" | "admin";

export type UserProfile = {
  id: string;
  email: string;
  full_name?: string | null;
  role: UserRole;
  is_active: boolean;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: UserProfile;
};

export type SendOtpResponse = {
  message: string;
  email: string;
  expire_minutes: number;
  dev_otp?: string | null;
};

export type MessageResponse = {
  message: string;
  success: boolean;
};

const TOKEN_KEY = "expense_tracker_token";
const USER_KEY = "expense_tracker_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginUser(
  apiBase: string,
  email: string,
  password: string,
): Promise<TokenResponse> {
  const response = await fetch(`${apiBase}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Login failed (${response.status})`);
  }

  const data = (await response.json()) as TokenResponse;
  setAuth(data.access_token, data.user);
  return data;
}

export async function registerUser(
  apiBase: string,
  email: string,
  password: string,
  full_name?: string,
): Promise<TokenResponse> {
  const response = await fetch(`${apiBase}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      full_name: full_name?.trim() || undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Registration failed (${response.status})`);
  }

  const data = (await response.json()) as TokenResponse;
  setAuth(data.access_token, data.user);
  return data;
}

export async function sendRegisterOtp(
  apiBase: string,
  email: string,
): Promise<SendOtpResponse> {
  const response = await fetch(`${apiBase}/api/v1/auth/register/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Failed to send verification code (${response.status})`);
  }

  return (await response.json()) as SendOtpResponse;
}

export async function verifyRegisterOtp(
  apiBase: string,
  payload: { email: string; otp: string; password: string; full_name?: string },
): Promise<TokenResponse> {
  const response = await fetch(`${apiBase}/api/v1/auth/register/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payload.email.trim(),
      otp: payload.otp.trim(),
      password: payload.password,
      full_name: payload.full_name?.trim() || undefined,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Verification failed (${response.status})`);
  }

  const data = (await response.json()) as TokenResponse;
  setAuth(data.access_token, data.user);
  return data;
}

export async function sendForgotPasswordOtp(
  apiBase: string,
  email: string,
): Promise<SendOtpResponse> {
  const response = await fetch(`${apiBase}/api/v1/auth/forgot-password/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Failed to send reset code (${response.status})`);
  }

  return (await response.json()) as SendOtpResponse;
}

export async function resetPasswordWithOtp(
  apiBase: string,
  payload: { email: string; otp: string; new_password: string },
): Promise<MessageResponse> {
  const response = await fetch(`${apiBase}/api/v1/auth/forgot-password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: payload.email.trim(),
      otp: payload.otp.trim(),
      new_password: payload.new_password,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Password reset failed (${response.status})`);
  }

  return (await response.json()) as MessageResponse;
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function updateProfile(
  apiBase: string,
  data: { full_name?: string; current_password?: string; new_password?: string },
): Promise<UserProfile> {
  const response = await fetchWithAuth(`${apiBase}/api/v1/auth/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Profile update failed (${response.status})`);
  }

  const updatedUser = (await response.json()) as UserProfile;
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  }
  return updatedUser;
}

export async function fetchUsersList(apiBase: string): Promise<UserProfile[]> {
  const response = await fetchWithAuth(`${apiBase}/api/v1/auth/users`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `Failed to fetch users (${response.status})`);
  }
  return (await response.json()) as UserProfile[];
}
