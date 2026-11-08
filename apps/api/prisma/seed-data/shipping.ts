import { PrismaClient } from '@prisma/client';

export interface SeedShippingZone {
  governorate: string;
  governorateAr: string;
  feeEgp: number; // in EGP (whole pounds); stored as piasters (feeEgp * 100)
  estimatedDaysMin: number;
  estimatedDaysMax: number;
}

// All 27 Egyptian governorates. Greater Cairo / Alexandria carry the lowest fees;
// Delta is moderate; Upper Egypt is higher; Red Sea, Sinai, New Valley and Matrouh
// are the highest due to distance and logistics cost.
export const SHIPPING_ZONES: SeedShippingZone[] = [
  // Greater Cairo & Alexandria (lowest)
  { governorate: 'Cairo', governorateAr: 'القاهرة', feeEgp: 30, estimatedDaysMin: 1, estimatedDaysMax: 2 },
  { governorate: 'Giza', governorateAr: 'الجيزة', feeEgp: 30, estimatedDaysMin: 1, estimatedDaysMax: 2 },
  { governorate: 'Alexandria', governorateAr: 'الإسكندرية', feeEgp: 35, estimatedDaysMin: 1, estimatedDaysMax: 2 },
  { governorate: 'Qalyubia', governorateAr: 'القليوبية', feeEgp: 35, estimatedDaysMin: 1, estimatedDaysMax: 2 },

  // Nile Delta (moderate)
  { governorate: 'Dakahlia', governorateAr: 'الدقهلية', feeEgp: 40, estimatedDaysMin: 2, estimatedDaysMax: 3 },
  { governorate: 'Sharqia', governorateAr: 'الشرقية', feeEgp: 40, estimatedDaysMin: 2, estimatedDaysMax: 3 },
  { governorate: 'Gharbia', governorateAr: 'الغربية', feeEgp: 40, estimatedDaysMin: 2, estimatedDaysMax: 3 },
  { governorate: 'Kafr El Sheikh', governorateAr: 'كفر الشيخ', feeEgp: 45, estimatedDaysMin: 2, estimatedDaysMax: 3 },
  { governorate: 'Monufia', governorateAr: 'المنوفية', feeEgp: 45, estimatedDaysMin: 2, estimatedDaysMax: 3 },
  { governorate: 'Beheira', governorateAr: 'البحيرة', feeEgp: 50, estimatedDaysMin: 2, estimatedDaysMax: 3 },
  { governorate: 'Ismailia', governorateAr: 'الإسماعيلية', feeEgp: 50, estimatedDaysMin: 2, estimatedDaysMax: 3 },
  { governorate: 'Port Said', governorateAr: 'بورسعيد', feeEgp: 55, estimatedDaysMin: 2, estimatedDaysMax: 3 },
  { governorate: 'Suez', governorateAr: 'السويس', feeEgp: 55, estimatedDaysMin: 2, estimatedDaysMax: 3 },
  { governorate: 'Damietta', governorateAr: 'دمياط', feeEgp: 55, estimatedDaysMin: 2, estimatedDaysMax: 3 },

  // Upper Egypt (higher)
  { governorate: 'Faiyum', governorateAr: 'الفيوم', feeEgp: 60, estimatedDaysMin: 3, estimatedDaysMax: 4 },
  { governorate: 'Beni Suef', governorateAr: 'بني سويف', feeEgp: 60, estimatedDaysMin: 3, estimatedDaysMax: 4 },
  { governorate: 'Minya', governorateAr: 'المنيا', feeEgp: 65, estimatedDaysMin: 3, estimatedDaysMax: 4 },
  { governorate: 'Assiut', governorateAr: 'أسيوط', feeEgp: 70, estimatedDaysMin: 3, estimatedDaysMax: 4 },
  { governorate: 'Sohag', governorateAr: 'سوهاج', feeEgp: 70, estimatedDaysMin: 3, estimatedDaysMax: 4 },
  { governorate: 'Qena', governorateAr: 'قنا', feeEgp: 75, estimatedDaysMin: 3, estimatedDaysMax: 5 },
  { governorate: 'Luxor', governorateAr: 'الأقصر', feeEgp: 75, estimatedDaysMin: 3, estimatedDaysMax: 5 },
  { governorate: 'Aswan', governorateAr: 'أسوان', feeEgp: 80, estimatedDaysMin: 3, estimatedDaysMax: 5 },

  // Red Sea, Sinai, New Valley & Matrouh (highest)
  { governorate: 'Red Sea', governorateAr: 'البحر الأحمر', feeEgp: 90, estimatedDaysMin: 4, estimatedDaysMax: 6 },
  { governorate: 'New Valley', governorateAr: 'الوادي الجديد', feeEgp: 95, estimatedDaysMin: 4, estimatedDaysMax: 6 },
  { governorate: 'Matrouh', governorateAr: 'مطروح', feeEgp: 95, estimatedDaysMin: 4, estimatedDaysMax: 6 },
  { governorate: 'North Sinai', governorateAr: 'شمال سيناء', feeEgp: 100, estimatedDaysMin: 5, estimatedDaysMax: 7 },
  { governorate: 'South Sinai', governorateAr: 'جنوب سيناء', feeEgp: 100, estimatedDaysMin: 5, estimatedDaysMax: 7 },
];

export async function seedShippingZones(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    for (const zone of SHIPPING_ZONES) {
      await prisma.shippingZone.upsert({
        where: { governorate: zone.governorateAr },
        update: {
          feeEgp: zone.feeEgp * 100,
          estimatedDaysMin: zone.estimatedDaysMin,
          estimatedDaysMax: zone.estimatedDaysMax,
          isActive: true,
        },
        create: {
          governorate: zone.governorateAr,
          feeEgp: zone.feeEgp * 100,
          estimatedDaysMin: zone.estimatedDaysMin,
          estimatedDaysMax: zone.estimatedDaysMax,
          isActive: true,
        },
      });
    }
    console.log(`Shipping zones ready: ${SHIPPING_ZONES.length} governorates`);
  } finally {
    await prisma.$disconnect();
  }
}
