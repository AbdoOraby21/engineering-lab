import type { OrderDto } from '@engineering-lab/shared';
import { formatEGP } from '@engineering-lab/shared';
import PDFDocument from 'pdfkit';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { loadLogoBuffer, resolveLogoUrl } from '../lib/brand.js';

// ---------------------------------------------------------------------------
// Arabic shaping (Unicode presentation forms). Arabic letters change shape
// depending on whether they connect to the letter on their right and/or left.
// This guarantees connected, RTL-correct Arabic without requiring headless
// Chromium. In production, an HTML + Cairo font via Playwright/Puppeteer is
// the recommended alternative (documented in README).
// ---------------------------------------------------------------------------

const ARABIC_LETTER = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

type LetterForms = {
  iso: number;   // isolated
  ini?: number;  // initial
  med?: number;  // medial
  fin: number;   // final
};

const FORM_TABLE: Record<string, LetterForms> = {
  '\u0627': { iso: 0xfe80, fin: 0xfe8e }, // Alef (right-joining only)
  '\u0628': { iso: 0xfe8f, ini: 0xfe90, med: 0xfe91, fin: 0xfe92 }, // Beh
  '\u0629': { iso: 0xfe93, fin: 0xfe94 }, // Teh Marbuta (right-joining only)
  '\u062a': { iso: 0xfe95, ini: 0xfe96, med: 0xfe97, fin: 0xfe98 }, // Teh
  '\u062b': { iso: 0xfe99, ini: 0xfe9a, med: 0xfe9b, fin: 0xfe9c }, // Theh
  '\u062c': { iso: 0xfe9d, ini: 0xfe9e, med: 0xfe9f, fin: 0xfea0 }, // Jeem
  '\u062d': { iso: 0xfea1, ini: 0xfea2, med: 0xfea3, fin: 0xfea4 }, // Hah
  '\u062e': { iso: 0xfea5, ini: 0xfea6, med: 0xfea7, fin: 0xfea8 }, // Khah
  '\u062f': { iso: 0xfeaa, fin: 0xfeab }, // Dal (right-joining only)
  '\u0630': { iso: 0xfeac, fin: 0xfead }, // Thal
  '\u0631': { iso: 0xfeae, fin: 0xfeaf }, // Reh
  '\u0632': { iso: 0xfb8c, fin: 0xfb8d }, // Zeh
  '\u0633': { iso: 0xfeb1, ini: 0xfeb2, med: 0xfeb3, fin: 0xfeb4 }, // Seen
  '\u0634': { iso: 0xfeb5, ini: 0xfeb6, med: 0xfeb7, fin: 0xfeb8 }, // Sheen
  '\u0635': { iso: 0xfeb9, ini: 0xfeba, med: 0xfebb, fin: 0xfebc }, // Sad
  '\u0636': { iso: 0xfebd, ini: 0xfebe, med: 0xfebf, fin: 0xfec0 }, // Dad
  '\u0637': { iso: 0xfec1, ini: 0xfec2, med: 0xfec3, fin: 0xfec4 }, // Tah
  '\u0638': { iso: 0xfec5, ini: 0xfec6, med: 0xfec7, fin: 0xfec8 }, // Zah
  '\u0639': { iso: 0xfec9, ini: 0xfeca, med: 0xfecb, fin: 0xfecc }, // Ain
  '\u063a': { iso: 0xfecd, ini: 0xfece, med: 0xfecf, fin: 0xfed0 }, // Ghain
  '\u0641': { iso: 0xfed1, ini: 0xfed2, med: 0xfed3, fin: 0xfed4 }, // Feh
  '\u0642': { iso: 0xfed5, ini: 0xfed6, med: 0xfed7, fin: 0xfed8 }, // Qaf
  '\u0643': { iso: 0xfed9, ini: 0xfeda, med: 0xfedb, fin: 0xfedc }, // Kaf
  '\u0644': { iso: 0xfedd, ini: 0xfede, med: 0xfedf, fin: 0xfee0 }, // Lam
  '\u0645': { iso: 0xfee1, ini: 0xfee2, med: 0xfee3, fin: 0xfee4 }, // Meem
  '\u0646': { iso: 0xfee5, ini: 0xfee6, med: 0xfee7, fin: 0xfee8 }, // Noon
  '\u0647': { iso: 0xfee9, ini: 0xfeea, med: 0xfeeb, fin: 0xfeec }, // Heh
  '\u0649': { iso: 0xfef0, fin: 0xfef3 }, // Alef Maksura (right-joining only)
  '\u064a': { iso: 0xfef1, ini: 0xfef2, med: 0xfef3, fin: 0xfef4 }, // Yeh
};

function rightJoining(ch: string): boolean {
  const f = FORM_TABLE[ch];
  return Boolean(f && (f.fin !== undefined || f.med !== undefined || f.ini !== undefined));
}

function leftJoining(ch: string): boolean {
  const f = FORM_TABLE[ch];
  return Boolean(f && (f.ini !== undefined || f.med !== undefined));
}

function isArabicLetter(ch: string): boolean {
  return ARABIC_LETTER.test(ch) && ch in FORM_TABLE;
}

export function shapeArabic(text: string): string {
  const chars = [...text];
  const out: string[] = [];
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]!;
    if (!isArabicLetter(ch)) {
      out.push(ch);
      continue;
    }
    const prev = i > 0 ? chars[i - 1]! : '';
    const next = i < chars.length - 1 ? chars[i + 1]! : '';
    const connectsPrev = isArabicLetter(prev) && leftJoining(prev) && rightJoining(ch);
    const connectsNext = isArabicLetter(next) && leftJoining(ch) && rightJoining(next);
    const forms = FORM_TABLE[ch]!;
    let code: number | undefined;
    if (connectsPrev && connectsNext && forms.med) {
      code = forms.med;
    } else if (connectsPrev && forms.fin) {
      code = forms.fin;
    } else if (!connectsPrev && connectsNext && forms.ini) {
      code = forms.ini;
    } else if (forms.iso) {
      code = forms.iso;
    }
    out.push(code !== undefined ? String.fromCodePoint(code) : ch);
  }
  return out.join('');
}

function shapeSegments(text: string): string {
  // Shape only maximal Arabic runs so surrounding digits/Latin stay untouched.
  const result: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (isArabicLetter(text[i]!)) {
      let j = i;
      while (j < text.length && (isArabicLetter(text[j]!) || text[j] === ' ')) {
        j += 1;
      }
      result.push(shapeArabic(text.slice(i, j)));
      i = j;
    } else {
      result.push(text[i]!);
      i += 1;
    }
  }
  return result.join('');
}

// ---------------------------------------------------------------------------
// Font: embed Arial (ships with Windows/most systems; covers Arabic glyphs).
// For production, replace with a Cairo TTF for the best Arabic rendering.
// ---------------------------------------------------------------------------

function findFontPath(): string | null {
  const candidates = [
    'C:/Windows/Fonts/arial.ttf',
    'C:/Windows/Fonts/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
  ];
  for (const c of candidates) {
    try {
      if (existsSync(c)) {
        return c;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

const FONT_PATH = findFontPath();

async function settingString(key: string, fallback: string): Promise<string> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    const value = row?.value as string | undefined;
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  } catch {
    // fall back to default below
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Invoice PDF cache.
// ---------------------------------------------------------------------------

const invoiceCacheDir = join(env.UPLOAD_DIR, 'invoices');
mkdirSync(invoiceCacheDir, { recursive: true });

function cachePath(orderNumber: string): string {
  return join(invoiceCacheDir, `${orderNumber}.pdf`);
}

function cachedPdfBytes(orderNumber: string): Buffer | null {
  try {
    const p = cachePath(orderNumber);
    if (existsSync(p)) {
      return readFileSync(p);
    }
  } catch {
    // ignore
  }
  return null;
}

function writeCache(orderNumber: string, pdf: Buffer): void {
  try {
    writeFileSyncSafe(cachePath(orderNumber), pdf);
  } catch (error) {
    logger.warn({ orderNumber, err: error }, 'Failed to cache invoice PDF');
  }
}

function writeFileSyncSafe(filePath: string, data: Buffer): void {
  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, data);
}

// ---------------------------------------------------------------------------
// PDF generation.
// ---------------------------------------------------------------------------

export async function generateInvoicePdf(order: OrderDto): Promise<Buffer> {
  const cached = cachedPdfBytes(order.orderNumber);
  if (cached) {
    return cached;
  }

  const storeName = await settingString('store.name', 'Engineering Lab');
  const storeNameAr = await settingString('store.nameAr', 'Engineering Lab');
  const storeAddressAr = await settingString('contact.addressAr', 'القاهرة، مصر');
  const storeAddressEn = await settingString('contact.addressEn', 'Cairo, Egypt');
  const logoBuffer = await loadLogoBuffer(await resolveLogoUrl());

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 54, autoFirstPage: false });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const pdf = Buffer.concat(chunks);
        writeCache(order.orderNumber, pdf);
        resolve(pdf);
      });
      doc.on('error', reject);

      const baseFont = FONT_PATH ? 'Arial' : 'Helvetica';
      const boldFont = FONT_PATH ? 'Arial-Bold' : 'Helvetica-Bold';
      if (FONT_PATH) {
        doc.registerFont('Arial', FONT_PATH);
        doc.registerFont('Arial-Bold', FONT_PATH);
      }
      doc.font(baseFont).fontSize(10);

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const margin = 54;

      // ---------- Page 1 ----------
      doc.addPage();

      if (logoBuffer) {
        try {
          doc.image(logoBuffer, (pageW - 36) / 2, margin + 16, { width: 36, height: 36 });
        } catch (error) {
          logger.warn({ err: error }, 'Failed to render invoice logo');
        }
      }

      doc.font(boldFont).fontSize(17);
      doc.text(storeNameAr, margin, margin, { align: 'right' });
      doc.font(baseFont).fontSize(9);
      doc.text(storeAddressAr, margin, margin + 18, { align: 'right' });

      doc.font(boldFont).fontSize(17);
      doc.text(storeName, pageW - margin, margin, { align: 'left' });
      doc.font(baseFont).fontSize(9);
      doc.text(storeAddressEn, pageW - margin, margin + 18, { align: 'left' });

      // Invoice title (centered)
      let y = margin + 64;
      doc.font(boldFont).fontSize(20);
      doc.text('فاتورة / INVOICE', margin, y, { align: 'center', width: pageW - 2 * margin });
      y += 30;

      // Meta table: order number & date (right = Arabic, left = English)
      doc.font(baseFont).fontSize(9.5);
      const orderDate = new Date(order.createdAt).toLocaleDateString('ar-EG');
      const orderDateEn = new Date(order.createdAt).toLocaleDateString('en-GB');

      const metaTop = y;
      doc.text('رقم الفاتورة:', margin, metaTop, { align: 'right', width: 130 });
      doc.text(order.orderNumber, pageW - margin, metaTop, { align: 'left', width: 130 });
      doc.text('التاريخ:', margin, metaTop + 16, { align: 'right', width: 130 });
      doc.text(orderDate, pageW - margin, metaTop + 16, { align: 'left', width: 130 });
      doc.text('Invoice #:', pageW - margin, metaTop + 32, { align: 'left', width: 130 });
      doc.text(order.orderNumber, margin, metaTop + 32, { align: 'right', width: 130 });
      doc.text('Date:', pageW - margin, metaTop + 32, { align: 'left', width: 130 });
      doc.text(orderDateEn, margin, metaTop + 32, { align: 'right', width: 130 });

      y = metaTop + 60;

      // Customer / address block
      doc.font(boldFont).fontSize(10);
      doc.text('العميل / Bill to', margin, y, { align: 'right' });
      doc.text('Customer / Bill to', pageW - margin, y, { align: 'left' });
      y += 14;
      doc.font(baseFont).fontSize(9.5);
      const customerName = shapeSegments(order.contactName);
      doc.text(customerName, margin, y, { align: 'right', width: pageW / 2 - margin });
      doc.text(order.contactEmail, pageW - margin, y, { align: 'left', width: pageW / 2 - margin });
      y += 14;
      doc.text(shapeSegments(order.contactPhone), margin, y, { align: 'right', width: pageW / 2 - margin });
      const addressSnapshot = (order.addressSnapshot ?? {}) as Record<string, unknown>;
      const addrLine = [
        addressSnapshot.building,
        addressSnapshot.street,
        addressSnapshot.city,
        addressSnapshot.governorate,
      ].filter(Boolean).join('، ');
      doc.text(shapeSegments(addrLine), margin, y + 14, { align: 'right', width: pageW / 2 - margin });
      y += 40;

      // Items table header
      const tableTop = y;
      const colX = {
        no: margin,
        sku: margin + 40,
        name: margin + 130,
        qty: pageW - margin - 130,
        unit: pageW - margin - 80,
        total: pageW - margin - 20,
      };
      doc.font(boldFont).fontSize(8.5);
      doc.text('#', colX.no, tableTop, { align: 'right', width: 25 });
      doc.text('SKU', colX.sku, tableTop, { align: 'right', width: 70 });
      doc.text('الصنف / Item', colX.name, tableTop, { align: 'right' });
      doc.text('الكمية', colX.qty, tableTop, { align: 'right', width: 40 });
      doc.text('السعر', colX.unit, tableTop, { align: 'right', width: 60 });
      doc.text('المجموع', colX.total, tableTop, { align: 'right', width: 50 });

      y = tableTop + 20;
      for (const [i, item] of order.items.entries()) {
        const nameAr = item.nameAr || item.nameEn;
        doc.font(baseFont).fontSize(8.5);
        doc.text(String(i + 1), colX.no, y, { align: 'right', width: 25 });
        doc.text(item.sku, colX.sku, y, { align: 'right', width: 70 });
        doc.text(shapeSegments(nameAr), colX.name, y, { align: 'right' });
        doc.text(String(item.qty), colX.qty, y, { align: 'right', width: 40 });
        doc.text(formatEGP(item.unitPrice), colX.unit, y, { align: 'right', width: 60 });
        doc.text(formatEGP(item.lineTotal), colX.total, y, { align: 'right', width: 50 });
        y += 16;
        if (y > pageH - 120) {
          doc.addPage();
          y = margin;
          doc.font(boldFont).fontSize(8.5);
          doc.text('#', colX.no, y, { align: 'right', width: 25 });
          doc.text('SKU', colX.sku, y, { align: 'right', width: 70 });
          doc.text('الصنف / Item', colX.name, y, { align: 'right' });
          doc.text('الكمية', colX.qty, y, { align: 'right', width: 40 });
          doc.text('السعر', colX.unit, y, { align: 'right', width: 60 });
          doc.text('المجموع', colX.total, y, { align: 'right', width: 50 });
          y += 20;
        }
      }

      y += 8;
      doc.moveTo(margin, y).lineTo(pageW - margin, y).stroke();
      y += 14;

      const totals: [string, number][] = [
        ['المجموع الفرعي / Subtotal', order.subtotal],
        ['الخصم / Discount', order.discountTotal],
        ['الشحن / Shipping', order.shippingFee],
        ['الإجمالي / Total', order.total],
      ];
      doc.font(boldFont).fontSize(9.5);
      for (const [label, value] of totals) {
        doc.text(shapeSegments(label), colX.name, y, { align: 'right' });
        doc.text(formatEGP(value), colX.total, y, { align: 'right', width: 60 });
        y += 16;
      }

      y += 20;
      doc.font(baseFont).fontSize(8);
      doc.fillColor('#64748B');
      doc.text(
        'EGP = Egyptian Pound. All amounts are integer piasters (100 piasters = 1 EGP).',
        margin,
        y,
        { align: 'right', width: pageW - 2 * margin },
      );
      doc.fillColor('#000000');

      // Payment method
      y += 24;
      doc.font(boldFont).fontSize(9.5);
      doc.text('طريقة الدفع / Payment method:', margin, y, { align: 'right', width: 150 });
      doc.text(order.paymentMethod, pageW - margin, y, { align: 'left', width: 150 });

      // Footer
      const footerY = pageH - 60;
      doc.font(baseFont).fontSize(7.5);
      doc.fillColor('#64748B');
      doc.text(`${storeName} — genuine electronics parts with technical support.`, margin, footerY, {
        align: 'center',
        width: pageW - 2 * margin,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
