/**
 * API client for ExpertIQ Copilot backend.
 *
 * Handles authentication, request/response interceptors,
 * and typed API methods.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Create a configured axios instance with auth interceptor.
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  // Request interceptor: attach JWT token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("access_token");
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: handle 401 → try refresh
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const refreshToken = localStorage.getItem("refresh_token");
          if (refreshToken) {
            const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            });
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("refresh_token", data.refresh_token);
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
            return client(originalRequest);
          }
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const api = createApiClient();

// ── Auth API ──

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
  const response = await api.post<TokenResponse>("/auth/login", data);
  localStorage.setItem("access_token", response.data.access_token);
  localStorage.setItem("refresh_token", response.data.refresh_token);
  return response.data;
}

export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const response = await api.post<TokenResponse>("/auth/register", data);
  localStorage.setItem("access_token", response.data.access_token);
  localStorage.setItem("refresh_token", response.data.refresh_token);
  return response.data;
}

export function logout(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export async function getProfile(): Promise<UserProfile> {
  const response = await api.get<UserProfile>("/auth/me");
  return response.data;
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("access_token");
}

// ── Search API ──

export interface SearchFilters {
  industry?: string;
  seniority?: string;
  availability?: string;
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  top_k?: number;
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
  match_score: number;
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

export async function searchExperts(
  data: SearchRequest
): Promise<SearchResponse> {
  const response = await api.post<SearchResponse>("/api/search", data);
  return response.data;
}

// ── Experts API ──

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
  const response = await api.get<ExpertListResponse>("/api/experts", {
    params,
  });
  return response.data;
}

export async function getExpert(id: string): Promise<ExpertResult> {
  const response = await api.get<ExpertResult>(`/api/experts/${id}`);
  return response.data;
}

// ── Health API ──

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  features: {
    llm_available: boolean;
    embedding_model: string;
  };
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>("/api/health");
  return response.data;
}
