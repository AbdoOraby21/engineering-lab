import type { Locale } from '@engineering-lab/shared';
import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { sendMail } from '../lib/mailer.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type NotificationChannelKey = 'EMAIL' | 'WHATSAPP';

interface SendResult {
  channel: NotificationChannelKey;
  status: NotificationStatus;
  error: string | null;
  skipped: boolean;
}

// ---------------------------------------------------------------------------
// WhatsApp driver (Meta WhatsApp Cloud API). Gracefully skips when env keys
// are missing, so the store keeps working without a WhatsApp business account.
// ---------------------------------------------------------------------------

export class WhatsAppDriver {
  private readonly token: string | undefined;
  private readonly phoneNumberId: string | undefined;
  private readonly apiVersion: string;

  constructor() {
    this.token = process.env.WHATSAPP_ACCESS_TOKEN ?? undefined;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? undefined;
    this.apiVersion = env.WHATSAPP_API_VERSION;
  }

  isConfigured(): boolean {
    return Boolean(this.token && this.phoneNumberId);
  }

  async send(to: string, body: string): Promise<void> {
    if (!this.isConfigured()) {
      logger.debug({ to }, 'WhatsApp not configured; skipping');
      return;
    }
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`WhatsApp API error ${response.status}: ${text}`);
    }
  }
}

export const whatsappDriver = new WhatsAppDriver();

// ---------------------------------------------------------------------------
// Notification log with retry (max 3, linear backoff).
// ---------------------------------------------------------------------------

async function logAndSend(input: {
  userId: string | null;
  channel: NotificationChannelKey;
  template: string;
  locale: Locale;
  payload: unknown;
  to: string;
  send: () => Promise<void>;
}): Promise<SendResult> {
  const log = await prisma.notificationLog.create({
    data: {
      userId: input.userId ?? null,
      channel: input.channel as NotificationChannel,
      template: input.template,
      locale: input.locale,
      payload: input.payload as Prisma.InputJsonValue,
      status: 'QUEUED',
    },
  });

  let status: NotificationStatus = 'FAILED';
  let error: string | null = null;
  const skipped = false;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await input.send();
      status = 'SENT';
      break;
    } catch (err) {
      error = String((err as Error)?.message ?? err);
      logger.warn({ channel: input.channel, template: input.template, attempt, error }, 'Notification send attempt failed');
      if (attempt < 3) {
        await sleep(1000 * attempt);
      }
    }
  }

  await prisma.notificationLog.update({
    where: { id: log.id },
    data: { status, error: error ?? null },
  });

  return { channel: input.channel, status, error, skipped };
}

async function resolveUserChannel(userId: string | null, channel: NotificationChannelKey): Promise<{ to: string | null; userLocale: Locale } | null> {
  if (!userId) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, phone: true, locale: true, isActive: true },
  });
  if (!user || !user.isActive) {
    return null;
  }
  const to = channel === 'EMAIL' ? user.email : user.phone;
  if (!to) {
    return null;
  }
  return { to, userLocale: (user.locale ?? 'en') as Locale };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendEmail(opts: EmailOptions): Promise<void> {
  await sendMail(opts);
}

// ---------------------------------------------------------------------------
// High-level typed notification helpers used by order/payment/return flows.
// ---------------------------------------------------------------------------

export async function notifyOrderPlaced(
  userId: string | null,
  email: string,
  locale: Locale,
  orderNumber: string,
): Promise<void> {
  const isAr = locale === 'ar';
  const body = isAr
    ? `تم استلام طلبك رقم ${orderNumber} وجاري مراجعة الدفع.`
    : `Your order #${orderNumber} has been placed and payment is under review.`;
  const subject = isAr ? `طلبك رقم ${orderNumber}` : `Order #${orderNumber}`;
  const html = layout(locale, subject, body, isAr ? 'تتبع الطلب' : 'Track order', `${env.WEB_URL}/${locale}/orders/${orderNumber}`);
  await sendEmail({ to: email, subject, html, text: body });
  await logNotification({ userId, channel: 'EMAIL', template: 'order.placed', locale, payload: { orderNumber }, status: 'SENT' });
  // WhatsApp (customer phone) — best effort
  await notifyWhatsApp(userId, locale, `whatsapp.order.placed`, {
    ar: `تم استلام طلبك رقم ${orderNumber} وجاري مراجعة الدفع.`,
    en: `Your order #${orderNumber} has been placed and payment is under review.`,
  });
}

export async function notifyPaymentProofReceived(
  userId: string | null,
  email: string,
  locale: Locale,
  orderNumber: string,
): Promise<void> {
  const isAr = locale === 'ar';
  const body = isAr
    ? `تم استلام إثبات الدفع لطلب رقم ${orderNumber} وجاري المراجعة.`
    : `Payment proof for order #${orderNumber} received and under review.`;
  const subject = isAr ? `إثبات دفع - ${orderNumber}` : `Payment proof - ${orderNumber}`;
  const html = layout(locale, subject, body, isAr ? 'التفاصيل' : 'View order', `${env.WEB_URL}/${locale}/orders/${orderNumber}`);
  await sendEmail({ to: email, subject, html, text: body });
  await logNotification({ userId, channel: 'EMAIL', template: 'payment.proof.received', locale, payload: { orderNumber }, status: 'SENT' });
  await notifyWhatsApp(userId, locale, `whatsapp.payment.proof.received`, {
    ar: `تم استلام إثبات الدفع لطلب رقم ${orderNumber} وجاري المراجعة.`,
    en: `Payment proof for order #${orderNumber} received and under review.`,
  });
}

export async function notifyPaymentApproved(
  userId: string | null,
  email: string,
  locale: Locale,
  orderNumber: string,
): Promise<void> {
  const isAr = locale === 'ar';
  const body = isAr
    ? `تمت الموافقة على دفعتك وتأكيد طلب رقم ${orderNumber}.`
    : `Your payment was approved and order #${orderNumber} is confirmed.`;
  const subject = isAr ? `تم تأكيد الطلب - ${orderNumber}` : `Order confirmed - ${orderNumber}`;
  const html = layout(locale, subject, body, isAr ? 'عرض الطلب' : 'View order', `${env.WEB_URL}/${locale}/orders/${orderNumber}`);
  await sendEmail({ to: email, subject, html, text: body });
  await logNotification({ userId, channel: 'EMAIL', template: 'payment.approved', locale, payload: { orderNumber }, status: 'SENT' });
  await notifyWhatsApp(userId, locale, `whatsapp.payment.approved`, {
    ar: `تمت الموافقة على دفعتك وتأكيد طلب رقم ${orderNumber}.`,
    en: `Your payment was approved and order #${orderNumber} is confirmed.`,
  });
}

export async function notifyPaymentRejected(
  userId: string | null,
  email: string,
  locale: Locale,
  orderNumber: string,
  reason: string,
): Promise<void> {
  const isAr = locale === 'ar';
  const body = isAr
    ? `تم رفض إثبات الدفع لطلب رقم ${orderNumber}. السبب: ${reason}. يمكنك إعادة الإرسال.`
    : `Payment proof for order #${orderNumber} was rejected. Reason: ${reason}. You may resubmit.`;
  const subject = isAr ? `تم رفض الدفع - ${orderNumber}` : `Payment rejected - ${orderNumber}`;
  const html = layout(locale, subject, body, isAr ? 'إعادة الإرسال' : 'Resubmit proof', `${env.WEB_URL}/${locale}/orders/${orderNumber}/pay`);
  await sendEmail({ to: email, subject, html, text: body });
  await logNotification({ userId, channel: 'EMAIL', template: 'payment.rejected', locale, payload: { orderNumber, reason }, status: 'SENT' });
  await notifyWhatsApp(userId, locale, `whatsapp.payment.rejected`, {
    ar: `تم رفض إثبات الدفع لطلب رقم ${orderNumber}. السبب: ${reason}.`,
    en: `Payment proof for order #${orderNumber} was rejected. Reason: ${reason}.`,
  });
}

export async function notifyAdminNewProof(adminEmail: string, orderNumber: string): Promise<void> {
  await sendMail({
    to: adminEmail,
    subject: `New payment proof submitted - Order #${orderNumber}`,
    html: `<p>A payment proof has been submitted for order #${escapeHtml(orderNumber)}. Please review it in the admin panel.</p>`,
    text: `A payment proof has been submitted for order #${orderNumber}. Please review it in the admin panel.`,
  });
}

export async function notifyOrderExpired(
  userId: string | null,
  email: string,
  locale: Locale,
  orderNumber: string,
): Promise<void> {
  const isAr = locale === 'ar';
  const body = isAr
    ? `انتهى الموعد النهائي لدفع طلب رقم ${orderNumber} وتم إلغاؤه.`
    : `The payment deadline for order #${orderNumber} has expired and the order was cancelled.`;
  const subject = isAr ? `انتهت صلاحية الدفع - ${orderNumber}` : `Payment expired - ${orderNumber}`;
  const html = layout(locale, subject, body, isAr ? 'التسوق الآن' : 'Start shopping', `${env.WEB_URL}/${locale}/catalog`);
  await sendEmail({ to: email, subject, html, text: body });
  await logNotification({ userId, channel: 'EMAIL', template: 'order.expired', locale, payload: { orderNumber }, status: 'SENT' });
  await notifyWhatsApp(userId, locale, `whatsapp.order.expired`, {
    ar: `انتهى الموعد النهائي لدفع طلب رقم ${orderNumber} وتم إلغاؤه.`,
    en: `The payment deadline for order #${orderNumber} has expired and the order was cancelled.`,
  });
}

export async function notifyOrderExpiryReminder(
  userId: string | null,
  email: string,
  locale: Locale,
  orderNumber: string,
  hoursLeft: number,
): Promise<void> {
  const isAr = locale === 'ar';
  const body = isAr
    ? `تبقى ${hoursLeft} ساعة على موعد دفع طلب رقم ${orderNumber}. يرجى إتمام الدفع قبل انتهاء المدة.`
    : `Only ${hoursLeft} hour(s) left to pay for order #${orderNumber}. Please complete payment before the deadline.`;
  const subject = isAr ? `تذكير بالدفع - ${orderNumber}` : `Payment reminder - ${orderNumber}`;
  const html = layout(locale, subject, body, isAr ? 'الدفع الآن' : 'Pay now', `${env.WEB_URL}/${locale}/orders/${orderNumber}/pay`);
  await sendEmail({ to: email, subject, html, text: body });
  await logNotification({ userId, channel: 'EMAIL', template: 'order.expiry.reminder', locale, payload: { orderNumber, hoursLeft }, status: 'SENT' });
  await notifyWhatsApp(userId, locale, `whatsapp.order.expiry.reminder`, {
    ar: `تبقى ${hoursLeft} ساعة على موعد دفع طلب رقم ${orderNumber}.`,
    en: `Only ${hoursLeft} hour(s) left to pay for order #${orderNumber}.`,
  });
}

export async function notifyOrderShipped(
  userId: string | null,
  email: string,
  locale: Locale,
  orderNumber: string,
  trackingCompany?: string | null,
  trackingNumber?: string | null,
): Promise<void> {
  const isAr = locale === 'ar';
  const tracking = trackingCompany && trackingNumber ? isAr ? `الشركة: ${trackingCompany} - الرقم: ${trackingNumber}` : `Carrier: ${trackingCompany} - Tracking: ${trackingNumber}` : '';
  const body = isAr
    ? `تم شحن طلب رقم ${orderNumber}. ${tracking}`
    : `Order #${orderNumber} has been shipped. ${tracking}`;
  const subject = isAr ? `تم شحن الطلب - ${orderNumber}` : `Order shipped - ${orderNumber}`;
  const html = layout(locale, subject, body, isAr ? 'تتبع الشحنة' : 'Track shipment', `${env.WEB_URL}/${locale}/orders/${orderNumber}`);
  await sendEmail({ to: email, subject, html, text: body });
  await logNotification({ userId, channel: 'EMAIL', template: 'order.shipped', locale, payload: { orderNumber, trackingCompany, trackingNumber }, status: 'SENT' });
  await notifyWhatsApp(userId, locale, `whatsapp.order.shipped`, {
    ar: `تم شحن طلب رقم ${orderNumber}.`,
    en: `Order #${orderNumber} has been shipped.`,
  });
}

export async function notifyOrderDelivered(
  userId: string | null,
  email: string,
  locale: Locale,
  orderNumber: string,
): Promise<void> {
  const isAr = locale === 'ar';
  const body = isAr
    ? `تم تسليم طلب رقم ${orderNumber}. شكرًا لتعاملك معنا!`
    : `Order #${orderNumber} has been delivered. Thank you for shopping with us!`;
  const subject = isAr ? `تم التوصيل - ${orderNumber}` : `Order delivered - ${orderNumber}`;
  const html = layout(locale, subject, body, isAr ? 'تقييم المنتجات' : 'Review products', `${env.WEB_URL}/${locale}/catalog`);
  await sendEmail({ to: email, subject, html, text: body });
  await logNotification({ userId, channel: 'EMAIL', template: 'order.delivered', locale, payload: { orderNumber }, status: 'SENT' });
  await notifyWhatsApp(userId, locale, `whatsapp.order.delivered`, {
    ar: `تم تسليم طلب رقم ${orderNumber}.`,
    en: `Order #${orderNumber} has been delivered.`,
  });
}

export async function notifyOrderCancelled(
  userId: string | null,
  email: string,
  locale: Locale,
  orderNumber: string,
  reason?: string | null,
): Promise<void> {
  const isAr = locale === 'ar';
  const body = isAr
    ? `تم إلغاء طلب رقم ${orderNumber}${reason ? `. السبب: ${reason}` : '.'}.`
    : `Order #${orderNumber} has been cancelled${reason ? `. Reason: ${reason}` : ''}.`;
  const subject = isAr ? `تم إلغاء الطلب - ${orderNumber}` : `Order cancelled - ${orderNumber}`;
  const html = layout(locale, subject, body, isAr ? 'التسوق الآن' : 'Start shopping', `${env.WEB_URL}/${locale}/catalog`);
  await sendEmail({ to: email, subject, html, text: body });
  await logNotification({ userId, channel: 'EMAIL', template: 'order.cancelled', locale, payload: { orderNumber, reason }, status: 'SENT' });
  await notifyWhatsApp(userId, locale, `whatsapp.order.cancelled`, {
    ar: `تم إلغاء طلب رقم ${orderNumber}.`,
    en: `Order #${orderNumber} has been cancelled.`,
  });
}

export async function notifyReturnStatus(
  userId: string | null,
  email: string,
  locale: Locale,
  orderNumber: string,
  status: string,
  note?: string | null,
): Promise<void> {
  const isAr = locale === 'ar';
  const body = isAr
    ? `تحديث حالة طلب الإرجاع لطلب رقم ${orderNumber}: ${status}${note ? `. ملاحظة: ${note}` : ''}.`
    : `Return request for order #${orderNumber} updated to: ${status}${note ? `. Note: ${note}` : ''}.`;
  const subject = isAr ? `تحديث الإرجاع - ${orderNumber}` : `Return update - ${orderNumber}`;
  const html = layout(locale, subject, body, isAr ? 'عرض التفاصيل' : 'View details', `${env.WEB_URL}/${locale}/orders/${orderNumber}`);
  await sendEmail({ to: email, subject, html, text: body });
  await logNotification({ userId, channel: 'EMAIL', template: 'return.update', locale, payload: { orderNumber, status, note }, status: 'SENT' });
  await notifyWhatsApp(userId, locale, `whatsapp.return.update`, {
    ar: `تحديث حالة طلب الإرجاع لطلب رقم ${orderNumber}: ${status}.`,
    en: `Return request for order #${orderNumber} updated to: ${status}.`,
  });
}

export async function notifyTicketReplyNotification(input: {
  to: string;
  customerName: string;
  subject: string;
  body: string;
  ticketUrl: string;
  locale: Locale;
}): Promise<void> {
  const isAr = input.locale === 'ar';
  await sendMail({
    to: input.to,
    subject: isAr ? `تحديث على تذكرة الدعم: ${input.subject}` : `Support ticket update: ${input.subject}`,
    text: isAr
      ? `مرحبًا ${input.customerName}، هناك رد جديد على تذكرتك "${input.subject}":\n\n${input.body}\n\n${input.ticketUrl}`
      : `Hi ${input.customerName}, there is a new reply on your ticket "${input.subject}":\n\n${input.body}\n\n${input.ticketUrl}`,
    html: layout(
      input.locale,
      isAr ? 'رد جديد على تذكرة الدعم' : 'New support reply',
      isAr
        ? `مرحبًا ${escapeHtml(input.customerName)}، هناك رد جديد على تذكرتك "${escapeHtml(input.subject)}":<br /><br />${escapeHtml(input.body).replace(/\n/g, '<br />')}`
        : `Hi ${escapeHtml(input.customerName)}, there is a new reply on your ticket "${escapeHtml(input.subject)}":<br /><br />${escapeHtml(input.body).replace(/\n/g, '<br />')}`,
      isAr ? 'عرض التذكرة' : 'View ticket',
      input.ticketUrl,
    ),
  });
}

// ---------------------------------------------------------------------------
// WhatsApp helper (best-effort, uses customer phone).
// ---------------------------------------------------------------------------

async function notifyWhatsApp(
  userId: string | null,
  locale: Locale,
  template: string,
  messages: { ar: string; en: string },
): Promise<void> {
  if (!userId) {
    return;
  }
  const resolved = await resolveUserChannel(userId, 'WHATSAPP');
  if (!resolved) {
    return;
  }
  const body = messages[locale === 'ar' ? 'ar' : 'en'];
  const { status } = await logAndSend({
    userId,
    channel: 'WHATSAPP',
    template,
    locale,
    payload: { body },
    to: resolved.to!,
    send: () => whatsappDriver.send(resolved.to!, body),
  });
  if (status === 'FAILED') {
    logger.warn({ template, userId }, 'WhatsApp notification failed after retries');
  }
}

// ---------------------------------------------------------------------------
// Low-level notification log entry (kept for direct/manual logging).
// ---------------------------------------------------------------------------

async function logNotification(input: {
  userId: string | null;
  channel: string;
  template: string;
  locale: Locale;
  payload: unknown;
  status: string;
  error?: string | null;
}): Promise<void> {
  await prisma.notificationLog.create({
    data: {
      userId: input.userId ?? null,
      channel: input.channel as NotificationChannel,
      template: input.template,
      locale: input.locale,
      payload: input.payload as Prisma.InputJsonValue,
      status: input.status as NotificationStatus,
      error: input.error ?? null,
    },
  });
}

function layout(locale: Locale, title: string, body: string, ctaLabel: string, url: string): string {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const align = locale === 'ar' ? 'right' : 'left';
  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <body style="margin:0;padding:24px;background:#0B0F14;font-family:Arial,sans-serif;color:#E5E7EB;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#121821;border:1px solid #1E2733;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:28px;text-align:${align};">
          <div style="font-size:20px;font-weight:bold;color:#22C55E;margin-bottom:16px;">Engineering Lab</div>
          <h1 style="font-size:22px;margin:0 0 12px;color:#FFFFFF;">${title}</h1>
          <div style="font-size:15px;line-height:1.7;color:#CBD5E1;">${body}</div>
          <div style="margin:24px 0;">
            <a href="${url}" style="display:inline-block;background:#22C55E;color:#04130A;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:9999px;">${ctaLabel}</a>
          </div>
          <p style="font-size:12px;color:#64748B;word-break:break-all;">${url}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
