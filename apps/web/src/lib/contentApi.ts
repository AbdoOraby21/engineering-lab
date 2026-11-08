import type { BannerDto, BannerLocation } from '@engineering-lab/shared';
import { api } from './api';

interface Data<T> {
  data: T;
}

export async function fetchBanners(location?: BannerLocation): Promise<BannerDto[]> {
  const response = await api.get<Data<{ banners: BannerDto[] }>>('/content/banners', {
    params: location ? { location } : {},
  });
  return response.data.data.banners;
}
