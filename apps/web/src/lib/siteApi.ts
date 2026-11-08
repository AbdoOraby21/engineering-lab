import type {
  ContactInput,
  FaqItemDto,
  PageDto,
  PublicSettingsDto,
} from '@engineering-lab/shared';
import { api } from './api';

interface Data<T> {
  data: T;
}

export async function fetchSettings(): Promise<PublicSettingsDto> {
  const response = await api.get<Data<{ settings: PublicSettingsDto }>>('/settings/public');
  return response.data.data.settings;
}

export async function fetchFaq(category?: string): Promise<{ items: FaqItemDto[]; categories: string[] }> {
  const response = await api.get<Data<{ items: FaqItemDto[]; categories: string[] }>>('/faq', {
    params: category ? { category } : {},
  });
  return response.data.data;
}

export async function fetchPage(slug: string): Promise<PageDto> {
  const response = await api.get<Data<{ page: PageDto }>>(`/pages/${encodeURIComponent(slug)}`);
  return response.data.data.page;
}

export async function submitContact(input: ContactInput): Promise<{ received: boolean }> {
  const response = await api.post<Data<{ received: boolean }>>('/contact', input);
  return response.data.data;
}
