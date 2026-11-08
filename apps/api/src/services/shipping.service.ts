import type { ShippingZoneDto } from '@engineering-lab/shared';
import { prisma } from '../lib/prisma.js';

export async function getShippingZones(): Promise<ShippingZoneDto[]> {
  const rows = await prisma.shippingZone.findMany({
    where: { isActive: true },
    orderBy: { feeEgp: 'asc' },
  });
  return rows.map((row) => ({
    id: row.id,
    governorate: row.governorate,
    feeEgp: row.feeEgp,
    estimatedDaysMin: row.estimatedDaysMin,
    estimatedDaysMax: row.estimatedDaysMax,
    isActive: row.isActive,
  }));
}

export async function getShippingFee(governorate: string): Promise<{
  zone: ShippingZoneDto | null;
  feeEgp: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
}> {
  const zone = await prisma.shippingZone.findFirst({
    where: { governorate, isActive: true },
  });
  if (!zone) {
    return { zone: null, feeEgp: 0, estimatedDaysMin: 1, estimatedDaysMax: 3 };
  }
  return {
    zone: {
      id: zone.id,
      governorate: zone.governorate,
      feeEgp: zone.feeEgp,
      estimatedDaysMin: zone.estimatedDaysMin,
      estimatedDaysMax: zone.estimatedDaysMax,
      isActive: zone.isActive,
    },
    feeEgp: zone.feeEgp,
    estimatedDaysMin: zone.estimatedDaysMin,
    estimatedDaysMax: zone.estimatedDaysMax,
  };
}
