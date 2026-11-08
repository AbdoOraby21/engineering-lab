import nodemailer, { type Transporter } from 'nodemailer';
import type { Locale } from '@engineering-lab/shared';
import { env, isProduction } from '../config/env.js';
import { logger } from './logger.js';
import { prisma } from '../lib/prisma.js';
import { resolveLogoUrl } from './brand.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return transporter;
}

interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail(payload: MailPayload): Promise<void> {
  try {
    const info = await getTransporter().sendMail({
      from: env.MAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
    logger.info({ to: payload.to, messageId: info.messageId }, 'Email sent');
  } catch (error) {
    logger.error({ err: error, to: payload.to }, 'Failed to send email');
  }
}

async function storeName(locale: Locale): Promise<string> {
  const key = locale === 'ar' ? 'store.nameAr' : 'store.name';
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    const value = row?.value as string | undefined;
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  } catch {
    // fall back to default below
  }
  return 'Engineering Lab';
}

function layout(
  locale: Locale,
  title: string,
  body: string,
  ctaLabel: string,
  url: string,
  store: string,
  logo: string,
): string {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const align = locale === 'ar' ? 'right' : 'left';
  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <body style="margin:0;padding:24px;background:#0B0F14;font-family:Arial,sans-serif;color:#E5E7EB;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#121821;border:1px solid #1E2733;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:28px;text-align:${align};">
          <img src="${escapeHtml(logo)}" alt="Engineering Lab" width="56" height="56" style="display:block;width:56px;height:56px;margin:0 0 14px 0;" />
          <div style="font-size:20px;font-weight:bold;color:#22C55E;margin-bottom:16px;">${escapeHtml(store)}</div>
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendContactNotification(input: {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}): Promise<void> {
  const safeName = escapeHtml(input.name);
  const safeSubject = escapeHtml(input.subject);
  const safeMessage = escapeHtml(input.message).replace(/\n/g, '<br />');
  const safePhone = input.phone ? escapeHtml(input.phone) : '—';

  await sendMail({
    to: env.STORE_EMAIL,
    subject: `[Contact] ${input.subject}`,
    text: `New contact message\nName: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone ?? '—'}\nSubject: ${input.subject}\n\n${input.message}`,
    html: layout(
      'en',
      'New contact message',
      `<strong>From:</strong> ${safeName} &lt;${escapeHtml(input.email)}&gt;<br />
       <strong>Phone:</strong> ${safePhone}<br />
       <strong>Subject:</strong> ${safeSubject}<br /><br />
       ${safeMessage}`,
      'Reply by email',
      `mailto:${encodeURIComponent(input.email)}`,
      await storeName('en'),
      await resolveLogoUrl(),
    ),
  });
}

export async function sendTicketReplyNotification(input: {
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
      await storeName(input.locale),
      await resolveLogoUrl(),
    ),
  });
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
  locale: Locale,
): Promise<void> {
  const url = `${env.WEB_URL}/${locale}/verify-email?token=${encodeURIComponent(token)}`;
  if (!isProduction) {
    logger.info({ url }, 'Email verification link');
  }

  const isAr = locale === 'ar';
  await sendMail({
    to: email,
    subject: isAr ? 'تأكيد البريد الإلكتروني - Engineering Lab' : 'Verify your email - Engineering Lab',
    text: isAr
      ? `مرحبًا ${name}، أكد بريدك الإلكتروني من خلال الرابط: ${url}`
      : `Hi ${name}, verify your email using this link: ${url}`,
    html: layout(
      locale,
      isAr ? 'تأكيد البريد الإلكتروني' : 'Verify your email',
      isAr
        ? `مرحبًا ${name}، اضغط على الزر أدناه لتأكيد بريدك الإلكتروني. الرابط صالح لمدة 24 ساعة.`
        : `Hi ${name}, click the button below to verify your email address. This link is valid for 24 hours.`,
      isAr ? 'تأكيد البريد' : 'Verify email',
      url,
      await storeName(locale),
      await resolveLogoUrl(),
    ),
  });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string,
  locale: Locale,
): Promise<void> {
  const url = `${env.WEB_URL}/${locale}/reset-password?token=${encodeURIComponent(token)}`;
  if (!isProduction) {
    logger.info({ url }, 'Password reset link');
  }

  const isAr = locale === 'ar';
  await sendMail({
    to: email,
    subject: isAr ? 'إعادة تعيين كلمة المرور - Engineering Lab' : 'Reset your password - Engineering Lab',
    text: isAr
      ? `مرحبًا ${name}، أعد تعيين كلمة المرور من خلال الرابط: ${url}`
      : `Hi ${name}, reset your password using this link: ${url}`,
    html: layout(
      locale,
      isAr ? 'إعادة تعيين كلمة المرور' : 'Reset your password',
      isAr
        ? `مرحبًا ${name}، اضغط على الزر أدناه لتعيين كلمة مرور جديدة. الرابط صالح لمدة ساعة واحدة. إذا لم تطلب ذلك تجاهل هذه الرسالة.`
        : `Hi ${name}, click the button below to set a new password. This link is valid for one hour. If you did not request this, ignore this email.`,
      isAr ? 'إعادة تعيين كلمة المرور' : 'Reset password',
      url,
      await storeName(locale),
      await resolveLogoUrl(),
    ),
  });
}
