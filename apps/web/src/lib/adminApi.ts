import type { AxiosInstance } from 'axios';
import { api } from '../lib/api';

export const adminApi: AxiosInstance = api;

interface Data<T> {
  data: T;
}

export async function getStatsOverview(from?: string, to?: string): Promise<Data<{ stats: unknown }>> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const res = await api.get<Data<{ stats: unknown }>>(`/admin/stats/overview?${params}`);
  return res.data;
}

export async function getRevenueOverTime(from?: string, to?: string, interval = 'day'): Promise<Data<{ data: unknown[] }>> {
  const params = new URLSearchParams({ interval });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const res = await api.get<Data<{ data: unknown[] }>>(`/admin/stats/revenue-over-time?${params}`);
  return res.data;
}

export async function getTopProducts(limit = 10, from?: string, to?: string): Promise<Data<{ data: unknown[] }>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const res = await api.get<Data<{ data: unknown[] }>>(`/admin/stats/top-products?${params}`);
  return res.data;
}

export async function getSettings(group: string): Promise<Data<{ settings: Record<string, unknown> }>> {
  const res = await api.get<Data<{ settings: Record<string, unknown> }>>(`/admin/settings/${group}`);
  return res.data;
}

export async function updateSettings(group: string, values: Record<string, unknown>): Promise<Data<{ ok: boolean }>> {
  const res = await api.put<Data<{ ok: boolean }>>(`/admin/settings/${group}`, values);
  return res.data;
}

interface PageDto {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listAdminPages(): Promise<Data<{ pages: PageDto[] }>> {
  const res = await api.get<Data<{ pages: PageDto[] }>>('/admin/pages');
  return res.data;
}

export async function getAdminPage(slug: string): Promise<Data<{ page: PageDto }>> {
  const res = await api.get<Data<{ page: PageDto }>>(`/admin/pages/${encodeURIComponent(slug)}`);
  return res.data;
}

export async function updateAdminPage(slug: string, values: Partial<PageDto>): Promise<Data<{ page: PageDto }>> {
  const res = await api.put<Data<{ page: PageDto }>>(`/admin/pages/${encodeURIComponent(slug)}`, values);
  return res.data;
}

export async function listAuditLogs(params: {
  actorId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<Data<{ logs: unknown[]; pagination: unknown }>> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  const res = await api.get<Data<{ logs: unknown[]; pagination: unknown }>>(`/admin/audit?${qs}`);
  return res.data;
}

export async function globalSearch(q: string): Promise<Data<{ results: unknown[]; query: string }>> {
  const res = await api.get<Data<{ results: unknown[]; query: string }>>(`/admin/search?q=${encodeURIComponent(q)}`);
  return res.data;
}

export function adminBaseUrl(): string {
  return `${window.location.origin}/api/v1/admin`;
}
