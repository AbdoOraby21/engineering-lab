import cron from 'node-cron';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { StockMovementReason } from '@prisma/client';
import { applyStockDelta } from '../services/inventory.service.js';
import { logger } from '../lib/logger.js';
import {
  notifyOrderExpired,
  notifyOrderExpiryReminder,
} from '../services/notification.service.js';

export interface JobScheduler {
  start(): void;
  stop(): void;
}

// Advisory lock row stored in the Setting table so multiple worker instances
// cannot run the expiry job concurrently.
const LOCK_KEY = 'job:order-expiry';
const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes
const LOW_STOCK_LOCK_KEY = 'job:low-stock-digest';
const LOW_STOCK_LOCK_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function acquireLock(lockKey: string, ttlMs: number): Promise<boolean> {
  const now = Date.now();
  const existing = await prisma.setting.findUnique({ where: { key: lockKey } });
  const lockedAt = (existing?.value as { lockedAt?: number } | null)?.lockedAt;
  if (typeof lockedAt === 'number' && now - lockedAt < ttlMs) {
    return false;
  }
  await prisma.setting.upsert({
    where: { key: lockKey },
    create: { key: lockKey, value: { lockedAt: now } as Prisma.InputJsonValue },
    update: { value: { lockedAt: now } as Prisma.InputJsonValue, updatedAt: new Date() },
  });
  return true;
}

async function releaseLock(lockKey: string): Promise<void> {
  await prisma.setting.delete({ where: { key: lockKey } }).catch(() => undefined);
}

export async function expireOverdueOrders(): Promise<void> {
  const locked = await acquireLock(LOCK_KEY, LOCK_TTL_MS);
  if (!locked) {
    logger.debug('Expiry job skipped: lock held by another instance');
    return;
  }
  try {
    const now = new Date();
    const expired = await prisma.order.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        paymentDeadlineAt: { lt: now },
      },
      include: { items: true },
    });

    for (const order of expired) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'EXPIRED', cancelledAt: now, cancelReason: 'Payment deadline expired' },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            from: 'PENDING_PAYMENT',
            to: 'EXPIRED',
            note: 'Payment deadline expired',
          },
        });
        for (const item of order.items) {
          await applyStockDelta(
            {
              productId: item.productId,
              variantId: item.variantId ?? undefined,
              delta: item.qty,
              reason: StockMovementReason.ORDER_CANCELLED,
              note: `Order ${order.orderNumber} expired`,
            },
            tx,
          );
        }
      });
      const user = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { email: true, locale: true },
      });
      if (user?.email) {
        void notifyOrderExpired(order.userId, user.email, (user.locale ?? 'en') as 'ar' | 'en', order.orderNumber);
      }
    }

    logger.info({ expiredCount: expired.length }, 'Order expiry job completed');
  } finally {
    await releaseLock(LOCK_KEY);
  }
}

export async function sendExpiryReminders(): Promise<void> {
  const now = new Date();
  const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const due = await prisma.order.findMany({
    where: {
      status: 'PENDING_PAYMENT',
      paymentDeadlineAt: { gt: now, lte: threeHoursFromNow },
    },
  });

  for (const order of due) {
    // Avoid re-notifying the same order within the last 23 hours.
    const alreadyReminded = await prisma.notificationLog.findFirst({
      where: {
        template: 'order.expiry.reminder',
        userId: order.userId,
        createdAt: { gte: new Date(Date.now() - 23 * 60 * 60 * 1000) },
      },
    });
    if (alreadyReminded) {
      continue;
    }
    const user = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { email: true, locale: true },
    });
    if (!user?.email) {
      continue;
    }
    const deadline = order.paymentDeadlineAt!;
    const hoursLeft = Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)));
    void notifyOrderExpiryReminder(
      order.userId,
      user.email,
      (user.locale ?? 'en') as 'ar' | 'en',
      order.orderNumber,
      hoursLeft,
    );
  }
  if (due.length > 0) {
    logger.info({ reminderCount: due.length }, 'Expiry reminders sent');
  }
}

export async function sendLowStockDigest(): Promise<void> {
  const locked = await acquireLock(LOW_STOCK_LOCK_KEY, LOW_STOCK_LOCK_TTL_MS);
  if (!locked) {
    logger.debug('Low-stock digest skipped: lock held by another instance');
    return;
  }
  try {
    const lowStock = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        sku: true,
        nameAr: true,
        nameEn: true,
        stock: true,
        lowStockThreshold: true,
        category: { select: { nameAr: true, nameEn: true } },
      },
      orderBy: { stock: 'asc' },
    });

    const items = lowStock.filter((p) => p.stock <= p.lowStockThreshold);
    if (items.length === 0) {
      logger.info('Low-stock digest: no low-stock items');
      return;
    }

    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true, email: true, locale: true },
    });
    if (!admin?.email) {
      logger.warn('Low-stock digest: no admin email found');
      return;
    }

    const isAr = (admin.locale ?? 'en') === 'ar';
    const lines = items
      .map((p) => `- ${p.nameAr || p.nameEn} (${p.sku}): ${p.stock} left (threshold ${p.lowStockThreshold})`)
      .join('\n');
    const body = isAr
      ? `المنتجات منخفضة المخزون:\n\n${lines}`
      : `Low stock products:\n\n${lines}`;
    const subject = isAr ? `تنبيه: منتجات منخفضة المخزون (${items.length})` : `Low stock alert (${items.length})`;

    // Send email + log directly (admin notification).
    await sendEmailRaw(admin.email, subject, body);
    await prisma.notificationLog.create({
      data: {
        userId: admin.id,
        channel: 'EMAIL',
        template: 'admin.low-stock.digest',
        locale: (admin.locale ?? 'en') as 'ar' | 'en',
        payload: { count: items.length },
        status: 'SENT',
      },
    });
    logger.info({ count: items.length }, 'Low-stock digest sent to admin');
  } finally {
    await releaseLock(LOW_STOCK_LOCK_KEY);
  }
}

async function sendEmailRaw(to: string, subject: string, text: string): Promise<void> {
  const { sendMail } = await import('../lib/mailer.js');
  await sendMail({ to, subject, html: `<pre>${escapeHtml(text)}</pre>`, text });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export class CronJobScheduler implements JobScheduler {
  private expiryTask: ReturnType<typeof cron.schedule> | null = null;
  private digestTask: ReturnType<typeof cron.schedule> | null = null;

  constructor(
    private readonly expiryInterval: string = '*/10 * * * *',
    private readonly digestCron: string = '0 9 * * *',
  ) {}

  start(): void {
    if (!this.expiryTask) {
      this.expiryTask = cron.schedule(this.expiryInterval, async () => {
        await expireOverdueOrders().catch((error) => logger.error({ err: error }, 'Expiry job failed'));
        await sendExpiryReminders().catch((error) => logger.error({ err: error }, 'Expiry reminder job failed'));
      });
      this.expiryTask.start();
      logger.info({ interval: this.expiryInterval }, 'Expiry job scheduler started');
    }
    if (!this.digestTask) {
      this.digestTask = cron.schedule(this.digestCron, async () => {
        await sendLowStockDigest().catch((error) => logger.error({ err: error }, 'Low-stock digest failed'));
      });
      this.digestTask.start();
      logger.info({ cron: this.digestCron }, 'Low-stock digest scheduler started');
    }
  }

  stop(): void {
    if (this.expiryTask) {
      this.expiryTask.stop();
      this.expiryTask = null;
    }
    if (this.digestTask) {
      this.digestTask.stop();
      this.digestTask = null;
    }
  }
}

export const jobScheduler: JobScheduler = new CronJobScheduler();
