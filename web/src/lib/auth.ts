// Auth types matching backend v2 API
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: "SYSTEM_ADMIN" | "AGENT" | "TICKETER" | "STATION_CONTROLLER";
    stationId: string | null;
  };
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const API_BASE = "/api/v1";

// Token storage — access token in memory (lost on refresh, re-fetch with refresh token)
// Refresh token in localStorage (backend also sets httpOnly cookie, but we need it for mobile/POS)
let accessToken: string | null = null;
let refreshToken: string | null = localStorage.getItem("refreshToken");
let currentUser: LoginResponse["user"] | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getCurrentUser() {
  return currentUser;
}

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem("refreshToken", refresh);
}

export function setUser(user: LoginResponse["user"]) {
  currentUser = user;
}

export function clearAuth() {
  accessToken = null;
  refreshToken = null;
  currentUser = null;
  localStorage.removeItem("refreshToken");
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Login failed (${res.status})`);
  }

  const data: LoginResponse = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  setUser(data.user);
  return data;
}

export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearAuth();
      return false;
    }

    const data: RefreshResponse = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  try {
    if (accessToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include",
      });
    }
  } finally {
    clearAuth();
  }
}

// Authenticated fetch wrapper — auto-refresh on 401
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  if (!accessToken) {
    const ok = await refreshAccessToken();
    if (!ok) throw new Error("Not authenticated");
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${accessToken}`,
  };

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });

  // Access token expired — try refresh once
  if (res.status === 401) {
    const ok = await refreshAccessToken();
    if (!ok) throw new Error("Session expired");

    const retryHeaders = {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    };
    res = await fetch(`${API_BASE}${path}`, { ...options, headers: retryHeaders, credentials: "include" });
  }

  return res;
}
