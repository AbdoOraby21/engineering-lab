import type { BannerDto } from '@engineering-lab/shared';
import { prisma } from '../lib/prisma.js';
import { toBannerDto } from './catalog/serializers.js';

export async function listBanners(location?: 'HOME_HERO' | 'HOME_STRIP'): Promise<BannerDto[]> {
  const now = new Date();
  const banners = await prisma.banner.findMany({
    where: {
      isActive: true,
      ...(location ? { location } : {}),
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return banners.map(toBannerDto);
}
