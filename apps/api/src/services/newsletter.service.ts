import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { sendMail } from '../lib/mailer.js';
import { env } from '../config/env.js';
import { paginationMeta } from '../utils/pagination.js';
import { writeAuditLog } from './admin/audit.service.js';

const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export interface SubscribeInput {
  email: string;
  locale?: string;
  source?: string;
  honeypot?: string;
}

export async function subscribeNewsletter(input: SubscribeInput, ip?: string) {
  // Honeypot: bots fill hidden fields. Pretend success without writing.
  if (input.honeypot && input.honeypot.trim().length > 0) {
    return { ok: true, message: 'Check your inbox to confirm your subscription.' };
  }

  const email = input.email.trim().toLowerCase();
  const locale = input.locale ?? 'ar';
  const source = input.source ?? 'footer';

  const existing = await prisma.subscriber.findUnique({ where: { email } });
  if (existing) {
    if (existing.status === 'ACTIVE') {
      return { ok: true, alreadySubscribed: true, message: 'You are already subscribed.' };
    }
    // Resend confirmation for PENDING/UNSUBSCRIBED
    await prisma.subscriber.update({
      where: { email },
      data: {
        status: 'PENDING',
        token: generateToken(),
        confirmedAt: null,
        locale,
        source,
      },
    });
    await sendConfirmationEmail(email, locale);
    return { ok: true, message: 'Check your inbox to confirm your subscription.' };
  }

  const token = generateToken();
  await prisma.subscriber.create({
    data: {
      email,
      locale,
      status: 'PENDING',
      source,
      token,
    },
  });

  await sendConfirmationEmail(email, locale);
  await writeAuditLog({
    actorId: undefined,
    action: 'NEWSLETTER.SUBSCRIBE',
    entity: 'Subscriber',
    entityId: email,
    after: { email, locale, source, status: 'PENDING' },
    ip,
  });

  return { ok: true, message: 'Check your inbox to confirm your subscription.' };
}

export async function confirmNewsletter(token: string) {
  const subscriber = await prisma.subscriber.findUnique({ where: { token } });
  if (!subscriber) {
    throw AppError.notFound('Invalid confirmation token', ErrorCodes.NOT_FOUND);
  }
  if (subscriber.status === 'ACTIVE') {
    return { ok: true, alreadyConfirmed: true };
  }
  const createdAt = subscriber.createdAt.getTime();
  if (Date.now() - createdAt > CONFIRM_TTL_MS) {
    throw AppError.badRequest('Confirmation token has expired', ErrorCodes.TOKEN_EXPIRED);
  }

  await prisma.subscriber.update({
    where: { id: subscriber.id },
    data: { status: 'ACTIVE', confirmedAt: new Date() },
  });

  await writeAuditLog({
    actorId: undefined,
    action: 'NEWSLETTER.CONFIRM',
    entity: 'Subscriber',
    entityId: subscriber.id,
    after: { email: subscriber.email, status: 'ACTIVE' },
  });

  return { ok: true };
}

export async function unsubscribeNewsletter(email: string, token?: string) {
  const subscriber = await prisma.subscriber.findUnique({ where: { email } });
  if (!subscriber) {
    return { ok: true, message: 'You have been unsubscribed.' };
  }
  if (token && subscriber.token !== token) {
    throw AppError.badRequest('Invalid unsubscribe token', ErrorCodes.VALIDATION_ERROR);
  }

  await prisma.subscriber.update({
    where: { email },
    data: { status: 'UNSUBSCRIBED' },
  });

  await writeAuditLog({
    actorId: undefined,
    action: 'NEWSLETTER.UNSUBSCRIBE',
    entity: 'Subscriber',
    entityId: subscriber.id,
    after: { email, status: 'UNSUBSCRIBED' },
  });

  return { ok: true };
}

export async function listNewsletterSubscribers({
  page = 1,
  pageSize = 25,
  status,
}: { page?: number; pageSize?: number; status?: 'PENDING' | 'ACTIVE' | 'UNSUBSCRIBED' }) {
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const offset = (page - 1) * pageSize;
  const [total, subscribers] = await Promise.all([
    prisma.subscriber.count({ where }),
    prisma.subscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: pageSize,
      select: { id: true, email: true, locale: true, status: true, source: true, confirmedAt: true, createdAt: true },
    }),
  ]);
  return {
    subscribers: subscribers.map((s) => ({
      id: s.id,
      email: s.email,
      locale: s.locale,
      status: s.status,
      source: s.source,
      confirmedAt: s.confirmedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
    pagination: paginationMeta(page, pageSize, total),
  };
}

export async function exportNewsletterSubscribersCSV(status?: string): Promise<string> {
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  const subscribers = await prisma.subscriber.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { email: true, locale: true, status: true, source: true, createdAt: true },
  });
  const lines = ['email,locale,status,source,createdAt'];
  for (const s of subscribers) {
    lines.push(`"${s.email}","${s.locale}","${s.status}","${s.source ?? ''}","${s.createdAt.toISOString()}"`);
  }
  return lines.join('\n');
}

export async function sendNewsletterBroadcast({
  subjectAr,
  subjectEn,
  bodyAr,
  bodyEn,
  locale,
  actorId,
}: {
  subjectAr: string;
  subjectEn: string;
  bodyAr: string;
  bodyEn: string;
  locale: 'ar' | 'en';
  actorId: string;
}) {
  const subscribers = await prisma.subscriber.findMany({
    where: {
      status: 'ACTIVE',
      ...(locale ? { locale } : {}),
    },
    select: { id: true, email: true, locale: true },
  });

  let sent = 0;
  let failed = 0;
  for (const sub of subscribers) {
    const subLocale = sub.locale as 'ar' | 'en';
    const subject = subLocale === 'ar' ? subjectAr : subjectEn;
    const body = subLocale === 'ar' ? bodyAr : bodyEn;
    try {
      await sendMail({
        to: sub.email,
        subject,
        html: `<div dir="${subLocale === 'ar' ? 'rtl' : 'ltr'}">${body.replace(/\n/g, '<br />')}</div>`,
        text: body,
      });
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  await writeAuditLog({
    actorId,
    action: 'NEWSLETTER.BROADCAST',
    entity: 'Subscriber',
    after: { count: subscribers.length, sent, failed, locale },
  });

  return { total: subscribers.length, sent, failed };
}

async function sendConfirmationEmail(email: string, locale: string) {
  const isAr = locale === 'ar';
  const tokenEntry = await prisma.subscriber.findUnique({ where: { email }, select: { token: true } });
  const token = tokenEntry?.token;
  if (!token) return;

  const confirmUrl = `${env.WEB_URL}/${isAr ? 'ar' : 'en'}/newsletter/confirm?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: email,
    subject: isAr ? 'تأكيد الاشتراك في النشرة البريدية' : 'Confirm your newsletter subscription',
    text: isAr
      ? `شكرًا للاشتراك! يرجى تأكيد بريدك الإلكتروني عبر الرابط: ${confirmUrl}`
      : `Thanks for subscribing! Please confirm your email via this link: ${confirmUrl}`,
    html: `<p>${isAr ? 'شكرًا للاشتراك!' : 'Thanks for subscribing!'}</p><p><a href="${confirmUrl}">${isAr ? 'تأكيد الاشتراك' : 'Confirm subscription'}</a></p>`,
  });
}
