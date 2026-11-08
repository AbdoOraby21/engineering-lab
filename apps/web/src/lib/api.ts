import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorBody, AuthResponse } from '@engineering-lab/shared';
import { useAuthStore } from '../stores/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshResponse {
  data: AuthResponse;
}

let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<RefreshResponse>('/auth/refresh')
      .then((response) => {
        useAuthStore.getState().setSession(response.data.data);
        return response.data.data.accessToken;
      })
      .catch(() => {
        useAuthStore.getState().clear();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const skipRefreshUrls = ['/auth/refresh', '/auth/login', '/auth/register'];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const url = config?.url ?? '';
    const isUnauthorized = error.response?.status === 401;

    if (
      isUnauthorized &&
      config &&
      !config._retry &&
      !skipRefreshUrls.some((skipUrl) => url.includes(skipUrl))
    ) {
      config._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      }
    }

    return Promise.reject(error);
  },
);

export interface NormalizedApiError {
  code: string;
  message: string;
  status?: number;
  details?: unknown;
}

export function getApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.error) {
      return {
        code: body.error.code,
        message: body.error.message,
        status: error.response?.status,
        details: body.error.details,
      };
    }
    if (!error.response) {
      return { code: 'NETWORK', message: 'Network error' };
    }
    return { code: 'UNKNOWN', message: error.message, status: error.response.status };
  }

  return {
    code: 'UNKNOWN',
    message: error instanceof Error ? error.message : 'Unknown error',
  };
}
