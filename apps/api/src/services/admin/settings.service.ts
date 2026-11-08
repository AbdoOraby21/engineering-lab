import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { invalidateCatalogCache } from '../../utils/cache.js';
import { AppError, ErrorCodes } from '../../utils/errors.js';
import { settingsStoreSchema } from '@engineering-lab/shared';

export interface SettingGroup {
  [key: string]: unknown;
}

const GROUPS: Record<string, string[]> = {
  store: [
    'store.name',
    'store.nameAr',
    'store.tagline',
    'store.taglineAr',
    'store.logoUrl',
    'store.faviconUrl',
    'contact.phone',
    'contact.phone2',
    'contact.email',
    'contact.whatsapp',
    'contact.addressAr',
    'contact.addressEn',
    'contact.hoursAr',
    'contact.hoursEn',
    'social.links',
    'site.credit',
  ],
  payments: ['payment.methods', 'payment.expiryHours'],
  shipping: ['shipping.freeThreshold'],
  notifications: [
    'notification.adminEmail',
    'notification.adminWhatsapp',
    'notification.toggles',
  ],
  maintenance: ['maintenance.mode'],
};

export async function getSettings(group?: string): Promise<SettingGroup> {
  const keys = group ? GROUPS[group] : Object.values(GROUPS).flat();
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const result: SettingGroup = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export async function getSetting(key: string): Promise<unknown> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function updateSettings(
  group: string,
  values: SettingGroup,
  actorId: string,
  ip?: string,
  userAgent?: string,
): Promise<void> {
  const keys = GROUPS[group];
  if (!keys) {
    throw AppError.badRequest(`Unknown settings group: ${group}`, ErrorCodes.VALIDATION_ERROR);
  }

  if (group === 'store') {
    settingsStoreSchema.parse(values);
  }

  const now = new Date();
  await prisma.$transaction([
    ...Object.entries(values).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: value as Prisma.InputJsonValue, updatedAt: now },
        create: { key, value: value as Prisma.InputJsonValue },
      }),
    ),
    ...Object.entries(values).map(([key, value]) =>
      prisma.auditLog.create({
        data: {
          actorId,
          actorName: undefined,
          action: 'SETTING.UPDATE',
          entity: 'Setting',
          entityId: key,
          before: Prisma.JsonNull,
          after: { key, value } as unknown as Prisma.InputJsonValue,
          ip,
          userAgent,
        },
      }),
    ),
  ]);

  if (group === 'store') {
    invalidateCatalogCache();
  }
}
