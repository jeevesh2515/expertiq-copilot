/**
 * Lightweight API client for the ExpertIQ Copilot backend.
 *
 * Uses the browser's native fetch API with a small auth/refresh layer
 * to keep the frontend dependency tree and runtime overhead lean.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 30000;

type QueryValue = string | number | boolean | undefined | null;

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, QueryValue>;
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

interface ErrorPayload {
  detail?: string;
  [key: string]: unknown;
}

class HttpError extends Error {
  response: {
    status: number;
    data?: ErrorPayload | string;
  };

  constructor(message: string, status: number, data?: ErrorPayload | string) {
    super(message);
    this.name = "HttpError";
    this.response = { status, data };
  }
}

function buildUrl(path: string, params?: Record<string, QueryValue>): string {
  const url = new URL(path, API_BASE_URL);
  if (!params) return url.toString();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function getStoredToken(name: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(name);
}

function setStoredTokens(tokens: TokenResponse): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", tokens.access_token);
  localStorage.setItem("refresh_token", tokens.refresh_token);
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

function toErrorPayload(data: unknown): ErrorPayload | string | undefined {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") return data as ErrorPayload;
  return undefined;
}

function readErrorMessage(
  data: ErrorPayload | string | undefined,
  statusText: string
): string {
  if (typeof data === "string" && data.trim()) return data;
  if (
    data &&
    typeof data === "object" &&
    typeof data.detail === "string" &&
    data.detail.trim()
  ) {
    return data.detail;
  }
  return statusText || "Request failed";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let payload: unknown;
  if (response.status !== 204) {
    payload = isJson ? await response.json() : await response.text();
  }

  if (!response.ok) {
    const errorPayload = toErrorPayload(payload);
    throw new HttpError(
      readErrorMessage(errorPayload, response.statusText),
      response.status,
      errorPayload
    );
  }

  return payload as T;
}

async function performRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    body,
    params,
    headers,
    skipAuth = false,
    skipRefresh = false,
    ...init
  } = options;

  const requestHeaders = new Headers(headers);
  const token = skipAuth ? null : getStoredToken("access_token");

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path, params), {
      ...init,
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal,
    });

    if (
      response.status === 401 &&
      !skipRefresh &&
      !skipAuth &&
      typeof window !== "undefined" &&
      path !== "/auth/refresh"
    ) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return performRequest<T>(path, { ...options, skipRefresh: true });
      }

      logout();
      window.location.href = "/";
    }

    return await parseResponse<T>(response);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpError("Request timed out", 408, { detail: "Request timed out" });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function refreshSession(): Promise<boolean> {
  const refreshToken = getStoredToken("refresh_token");
  if (!refreshToken) return false;

  try {
    const tokens = await performRequest<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
      skipAuth: true,
      skipRefresh: true,
    });
    setStoredTokens(tokens);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get<T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) {
    return performRequest<T>(path, { ...options, method: "GET" });
  },
  post<T>(path: string, body?: unknown, options: Omit<RequestOptions, "method" | "body"> = {}) {
    return performRequest<T>(path, { ...options, method: "POST", body });
  },
  delete<T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) {
    return performRequest<T>(path, { ...options, method: "DELETE" });
  },
};

// -- Auth API --

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
}

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>("/auth/login", data, {
    skipAuth: true,
    skipRefresh: true,
  });
  setStoredTokens(response);
  return response;
}

export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>("/auth/register", data, {
    skipAuth: true,
    skipRefresh: true,
  });
  setStoredTokens(response);
  return response;
}

export async function getProfile(): Promise<UserProfile> {
  return api.get<UserProfile>("/auth/me");
}

export function isAuthenticated(): boolean {
  return !!getStoredToken("access_token");
}

// -- Search API --

export interface SearchFilters {
  industry?: string;
  seniority?: string;
  availability?: string;
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  top_k?: number;
  include_graph?: boolean;
}

export interface ExpertResult {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  seniority: string;
  bio: string;
  topics: string[];
  publications: string[];
  years_experience: number;
  availability: string;
  match_score?: number;
  vector_score?: number;
  graph_score?: number;
  llm_score?: number;
  ai_reasoning?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SearchResponse {
  query: string;
  total_results: number;
  results: ExpertResult[];
  executive_summary?: string;
  graph_data?: GraphData;
  query_analysis?: Record<string, unknown>;
  processing_time_ms?: number;
}

export interface ApiErrorLike {
  message?: string;
  response?: {
    status?: number;
    data?: {
      detail?: string;
    } | string;
  };
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorLike;
  const detail = apiError.response?.data;

  if (typeof detail === "string" && detail.trim()) return detail;
  if (detail && typeof detail === "object" && typeof detail.detail === "string") {
    return detail.detail;
  }

  return apiError.message || fallback;
}

export async function searchExperts(data: SearchRequest): Promise<SearchResponse> {
  return api.post<SearchResponse>("/api/search", data);
}

// -- Interactions API --

export interface HistoryEntry {
  id: number;
  query: string;
  result_count: number;
  processing_time_ms: number;
  created_at: string;
}

export async function addBookmark(expertId: string): Promise<void> {
  await api.post<void>(`/api/bookmarks/${expertId}`);
}

export async function removeBookmark(expertId: string): Promise<void> {
  await api.delete<void>(`/api/bookmarks/${expertId}`);
}

export async function listBookmarks(): Promise<{ experts: ExpertResult[] }> {
  return api.get<{ experts: ExpertResult[] }>("/api/bookmarks");
}

export async function listHistory(): Promise<{ history: HistoryEntry[] }> {
  return api.get<{ history: HistoryEntry[] }>("/api/history");
}

// -- Experts API --

export interface ExpertListResponse {
  experts: ExpertResult[];
  total: number;
  page: number;
  page_size: number;
}

export async function listExperts(params?: {
  page?: number;
  page_size?: number;
  industry?: string;
  seniority?: string;
}): Promise<ExpertListResponse> {
  return api.get<ExpertListResponse>("/api/experts", { params });
}

export async function getExpert(id: string): Promise<ExpertResult> {
  return api.get<ExpertResult>(`/api/experts/${id}`);
}

// -- Health API --

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment?: string;
  timestamp?: string;
  features: {
    llm_available: boolean;
    embedding_model: string | null;
    search_backend?: string;
  };
}

export async function checkHealth(): Promise<HealthResponse> {
  return api.get<HealthResponse>("/api/health");
}
