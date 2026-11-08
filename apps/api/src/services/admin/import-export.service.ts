import { Prisma } from '@prisma/client';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import type {
  ImportDryRunReport,
  ImportSummary,
  ImportRowError,
  ProductSpecDto,
} from '@engineering-lab/shared';
import { productSpecSchema, slugify } from '@engineering-lab/shared';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { AppError, ErrorCodes } from '../../utils/errors.js';
import { sanitizePlainText, sanitizeRichText } from '../../utils/sanitize.js';
import { setStockAbsolute } from '../inventory.service.js';
import { invalidateCatalogCache } from '../../utils/cache.js';

export const IMPORT_COLUMNS = [
  'sku',
  'slug',
  'nameAr',
  'nameEn',
  'shortDescriptionAr',
  'shortDescriptionEn',
  'descriptionAr',
  'descriptionEn',
  'price',
  'compareAtPrice',
  'stock',
  'lowStockThreshold',
  'weightGrams',
  'category',
  'brand',
  'tags',
  'specs',
  'isFeatured',
  'isNew',
  'isActive',
  'type',
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const IMPORT_TEMPLATE = [
  IMPORT_COLUMNS.join(','),
  'EL-ARDUINO-UNO-R3,arduino-uno-r3,أردوينو أونو R3,Arduino UNO R3,,,لوحة أردوينو أونو R3 بمتحكم ATmega328P,Arduino UNO R3 board with ATmega328P microcontroller,95000,110000,10,5,68,arduino-boards,arduino,official|clone,,false,false,true,SIMPLE',
  'EL-HC-SR04,hc-sr04,حساس المسافة HC-SR04,HC-SR04 Ultrasonic Sensor,,,حساس المسافة بالموجات فوق الصوتية,Ultrasonic distance sensor,3500,,50,5,8,sensors-ultrasonic,generic,sensor|distance,,false,true,true,SIMPLE',
  '',
].join('\n');

interface ParsedImportFile {
  rows: Array<{ rowNumber: number; values: Record<string, string> }>;
  totalRows: number;
}

const MAX_IMPORT_ROWS = 1000;

function cellText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value).trim();
}

async function parseCsv(buffer: Buffer): Promise<ParsedImportFile> {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  });

  const rows = (result.data ?? []).slice(0, MAX_IMPORT_ROWS + 1).map((raw, index) => {
    const values: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (key) {
        values[key.trim()] = cellText(value);
      }
    }
    return { rowNumber: index + 2, values };
  });

  if (rows.length > MAX_IMPORT_ROWS) {
    throw AppError.unprocessable(`Import is limited to ${MAX_IMPORT_ROWS} rows`);
  }

  return { rows, totalRows: rows.length };
}

async function parseXlsx(buffer: Buffer): Promise<ParsedImportFile> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw AppError.unprocessable('The workbook does not contain any worksheet');
  }

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = cellText(cell.value);
  });

  if (!headers.includes('sku')) {
    throw AppError.unprocessable('The first row must contain a "sku" column header');
  }

  const rows: ParsedImportFile['rows'] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (row.cellCount === 0) {
      continue;
    }
    const values: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        values[header] = cellText(cell.value);
      }
    });
    if (Object.values(values).every((value) => value === '')) {
      continue;
    }
    rows.push({ rowNumber, values });
    if (rows.length > MAX_IMPORT_ROWS) {
      throw AppError.unprocessable(`Import is limited to ${MAX_IMPORT_ROWS} rows`);
    }
  }

  return { rows, totalRows: rows.length };
}

export async function parseImportFile(
  buffer: Buffer,
  filename: string,
): Promise<ParsedImportFile> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv')) {
    return parseCsv(buffer);
  }
  if (lower.endsWith('.xlsx')) {
    return parseXlsx(buffer);
  }
  throw AppError.unprocessable('Only .csv or .xlsx files are supported', ErrorCodes.UNSUPPORTED_FILE_TYPE);
}

// ---------------------------------------------------------------------------
// Row validation
// ---------------------------------------------------------------------------

const intPattern = /^-?\d+$/;
const boolPattern = /^(true|false|1|0|yes|no|y|n)$/i;
const skuPattern = /^[A-Za-z0-9/_-]{2,64}$/;

interface ValidationContext {
  existingBySku: Map<string, { id: string; stock: number; price: number; compareAtPrice: number | null }>;
  categoryBySlug: Map<string, { id: string; isActive: boolean; hasChildren: boolean }>;
  brandBySlug: Map<string, { id: string; isActive: boolean }>;
  seenSkus: Set<string>;
  seenSlugs: Set<string>;
}

export interface ValidatedRow {
  rowNumber: number;
  sku: string;
  action: 'create' | 'update';
  nameAr?: string;
  nameEn?: string;
  slug?: string;
  shortDescriptionAr?: string | null;
  shortDescriptionEn?: string | null;
  descriptionAr?: string;
  descriptionEn?: string;
  price?: number;
  compareAtPrice?: number | null;
  stock?: number;
  lowStockThreshold?: number;
  weightGrams?: number | null;
  categoryId?: string;
  brandId?: string | null;
  tags?: string[];
  specs?: ProductSpecDto[];
  isFeatured?: boolean;
  isNew?: boolean;
  isActive?: boolean;
  type?: 'SIMPLE' | 'BUNDLE';
}

function parseBool(
  raw: string | undefined,
  field: string,
  errors: string[],
): boolean | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }
  if (!boolPattern.test(raw)) {
    errors.push(`${field} must be true/false (or 1/0/yes/no)`);
    return undefined;
  }
  return /^(true|1|yes|y)$/i.test(raw);
}

function parseIntStrict(
  raw: string | undefined,
  field: string,
  { min, errors, required }: { min?: number; errors: string[]; required?: boolean },
): number | undefined {
  if (raw === undefined || raw === '') {
    if (required) {
      errors.push(`${field} is required`);
    }
    return undefined;
  }
  const normalized = raw.replace(/[,\s]/g, '');
  if (!intPattern.test(normalized)) {
    errors.push(`${field} must be a whole number, got "${raw}"`);
    return undefined;
  }
  const value = Number(normalized);
  if (min !== undefined && value < min) {
    errors.push(`${field} must be at least ${min}`);
    return undefined;
  }
  return value;
}

function parseTags(raw: string | undefined): string[] | undefined {
  if (raw === undefined || raw.trim() === '') {
    return undefined;
  }
  const tags = [
    ...new Set(
      raw
        .split('|')
        .map((tag) => sanitizePlainText(tag).toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 20);
  return tags;
}

function parseSpecs(raw: string | undefined, errors: string[]): ProductSpecDto[] | undefined {
  if (raw === undefined || raw.trim() === '') {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = z.array(productSpecSchema).max(50).safeParse(parsed);
    if (!result.success) {
      errors.push('specs must be a JSON array of {keyAr,keyEn,valueAr,valueEn}');
      return undefined;
    }
    return result.data;
  } catch {
    errors.push('specs is not valid JSON');
    return undefined;
  }
}

export function validateImportRow(
  row: { rowNumber: number; values: Record<string, string> },
  context: ValidationContext,
): { data?: ValidatedRow; errors: string[] } {
  const errors: string[] = [];
  const v = row.values;

  const rawSku = v.sku ?? '';
  const sku = rawSku.trim().toUpperCase();
  if (!sku) {
    errors.push('sku is required');
  } else if (!skuPattern.test(sku)) {
    errors.push('sku may only contain letters, digits, /, -, _ (2-64 chars)');
  }

  if (sku) {
    if (context.seenSkus.has(sku)) {
      errors.push('duplicate sku in file');
    }
    context.seenSkus.add(sku);
  }

  const existing = sku ? context.existingBySku.get(sku) : undefined;
  const action: 'create' | 'update' = existing ? 'update' : 'create';
  const isCreate = action === 'create';

  const nameAr = v.nameAr ? sanitizePlainText(v.nameAr) : undefined;
  const nameEn = v.nameEn ? sanitizePlainText(v.nameEn) : undefined;
  if (isCreate) {
    if (!nameAr) errors.push('nameAr is required for new products');
    if (!nameEn) errors.push('nameEn is required for new products');
  }

  const descriptionAr = v.descriptionAr ? sanitizeRichText(v.descriptionAr) : undefined;
  const descriptionEn = v.descriptionEn ? sanitizeRichText(v.descriptionEn) : undefined;
  if (isCreate) {
    if (!descriptionAr) errors.push('descriptionAr is required for new products');
    if (!descriptionEn) errors.push('descriptionEn is required for new products');
  }

  const price = parseIntStrict(v.price, 'price', { min: 0, errors, required: isCreate });

  const compareAtPrice =
    v.compareAtPrice === undefined || v.compareAtPrice === ''
      ? undefined
      : parseIntStrict(v.compareAtPrice, 'compareAtPrice', { min: 0, errors });

  const stock = parseIntStrict(v.stock, 'stock', { min: 0, errors });
  const lowStockThreshold = parseIntStrict(v.lowStockThreshold, 'lowStockThreshold', {
    min: 0,
    errors,
  });
  const weightGrams =
    v.weightGrams === undefined || v.weightGrams === ''
      ? undefined
      : parseIntStrict(v.weightGrams, 'weightGrams', { min: 0, errors });

  const effectivePrice = price ?? existing?.price;
  const effectiveCompareAt =
    compareAtPrice === undefined ? existing?.compareAtPrice ?? undefined : compareAtPrice;
  if (
    effectivePrice !== undefined &&
    effectiveCompareAt !== undefined &&
    effectiveCompareAt !== null &&
    effectiveCompareAt <= effectivePrice
  ) {
    errors.push('compareAtPrice must be greater than price');
  }

  const categorySlug = v.category?.trim();
  let categoryId: string | undefined;
  if (categorySlug) {
    const category = context.categoryBySlug.get(categorySlug);
    if (!category) {
      errors.push(`category "${categorySlug}" was not found`);
    } else {
      if (!category.isActive) {
        errors.push(`category "${categorySlug}" is not active`);
      }
      if (category.hasChildren) {
        errors.push(`category "${categorySlug}" is not a leaf category (it has sub-categories)`);
      }
      categoryId = category.id;
    }
  } else if (isCreate) {
    errors.push('category is required for new products (use the category slug)');
  }

  const brandSlug = v.brand?.trim();
  let brandId: string | null | undefined;
  if (brandSlug) {
    const brand = context.brandBySlug.get(brandSlug);
    if (!brand) {
      errors.push(`brand "${brandSlug}" was not found`);
    } else {
      if (!brand.isActive) {
        errors.push(`brand "${brandSlug}" is not active`);
      }
      brandId = brand.id;
    }
  } else if (v.brand !== undefined && v.brand.trim() === '') {
    brandId = null;
  }

  const typeRaw = v.type?.trim().toUpperCase();
  let type: 'SIMPLE' | 'BUNDLE' | undefined;
  if (typeRaw) {
    if (typeRaw !== 'SIMPLE' && typeRaw !== 'BUNDLE') {
      errors.push('type must be SIMPLE or BUNDLE');
    } else {
      type = typeRaw;
    }
  }

  const isFeatured = parseBool(v.isFeatured, 'isFeatured', errors);
  const isNew = parseBool(v.isNew, 'isNew', errors);
  const isActive = parseBool(v.isActive, 'isActive', errors);

  const tags = parseTags(v.tags);
  const specs = parseSpecs(v.specs, errors);

  const shortDescriptionAr = v.shortDescriptionAr
    ? sanitizePlainText(v.shortDescriptionAr)
    : undefined;
  const shortDescriptionEn = v.shortDescriptionEn
    ? sanitizePlainText(v.shortDescriptionEn)
    : undefined;

  let slug = v.slug?.trim() || undefined;
  if (!slug && isCreate && nameEn) {
    slug = slugify(nameEn);
  }
  if (slug) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.push(`slug "${slug}" is invalid (lowercase letters, digits and dashes)`);
    } else if (context.seenSlugs.has(slug)) {
      errors.push(`slug "${slug}" is used more than once in the file`);
    }
    context.seenSlugs.add(slug);
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    data: {
      rowNumber: row.rowNumber,
      sku,
      action,
      ...(nameAr !== undefined ? { nameAr } : {}),
      ...(nameEn !== undefined ? { nameEn } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(shortDescriptionAr !== undefined ? { shortDescriptionAr } : {}),
      ...(shortDescriptionEn !== undefined ? { shortDescriptionEn } : {}),
      ...(descriptionAr !== undefined ? { descriptionAr } : {}),
      ...(descriptionEn !== undefined ? { descriptionEn } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(compareAtPrice !== undefined ? { compareAtPrice } : {}),
      ...(stock !== undefined ? { stock } : {}),
      ...(lowStockThreshold !== undefined ? { lowStockThreshold } : {}),
      ...(weightGrams !== undefined ? { weightGrams } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(brandId !== undefined ? { brandId } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(specs !== undefined ? { specs } : {}),
      ...(isFeatured !== undefined ? { isFeatured } : {}),
      ...(isNew !== undefined ? { isNew } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(type !== undefined ? { type } : {}),
    },
  };
}

async function buildValidationContext(
  rows: Array<{ rowNumber: number; values: Record<string, string> }>,
): Promise<ValidationContext> {
  const skus = new Set<string>();
  const categorySlugs = new Set<string>();
  const brandSlugs = new Set<string>();

  for (const row of rows) {
    const sku = row.values.sku?.trim().toUpperCase();
    if (sku) {
      skus.add(sku);
    }
    if (row.values.category?.trim()) {
      categorySlugs.add(row.values.category.trim());
    }
    if (row.values.brand?.trim()) {
      brandSlugs.add(row.values.brand.trim());
    }
  }

  const [existing, categories, brands] = await Promise.all([
    skus.size > 0
      ? prisma.product.findMany({
          where: { sku: { in: [...skus] } },
          select: { id: true, sku: true, stock: true, price: true, compareAtPrice: true },
        })
      : Promise.resolve([]),
    categorySlugs.size > 0
      ? prisma.category.findMany({
          where: { slug: { in: [...categorySlugs] } },
          include: { _count: { select: { children: true } } },
        })
      : Promise.resolve([]),
    brandSlugs.size > 0
      ? prisma.brand.findMany({ where: { slug: { in: [...brandSlugs] } } })
      : Promise.resolve([]),
  ]);

  return {
    existingBySku: new Map(
      existing.map((entry) => [
        entry.sku,
        {
          id: entry.id,
          stock: entry.stock,
          price: entry.price,
          compareAtPrice: entry.compareAtPrice,
        },
      ]),
    ),
    categoryBySlug: new Map(
      categories.map((entry) => [
        entry.slug,
        { id: entry.id, isActive: entry.isActive, hasChildren: entry._count.children > 0 },
      ]),
    ),
    brandBySlug: new Map(brands.map((entry) => [entry.slug, { id: entry.id, isActive: entry.isActive }])),
    seenSkus: new Set(),
    seenSlugs: new Set(),
  };
}

async function ensureUniqueSlugForImport(preferred: string, excludeId?: string): Promise<string> {
  const base = slugify(preferred) || 'item';
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const existing = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 500) {
      return `${base}-${Date.now().toString(36)}`;
    }
  }
}

export async function importProducts(
  buffer: Buffer,
  filename: string,
  options: { dryRun: boolean; createdById?: string | null },
): Promise<ImportDryRunReport | ImportSummary> {
  const parsed = await parseImportFile(buffer, filename);
  const context = await buildValidationContext(parsed.rows);

  const validated = parsed.rows.map((row) => validateImportRow(row, context));

  if (options.dryRun) {
    const errorRows: ImportRowError[] = [];
    let valid = 0;
    validated.forEach((result, index) => {
      const rowNumber = parsed.rows[index]!.rowNumber;
      const sku = parsed.rows[index]!.values.sku?.trim().toUpperCase() || null;
      if (result.errors.length > 0) {
        errorRows.push({ row: rowNumber, sku, errors: result.errors });
      } else {
        valid += 1;
      }
    });
    return {
      total: parsed.rows.length,
      valid,
      invalid: parsed.rows.length - valid,
      rows: errorRows,
    };
  }

  const CHUNK_SIZE = 50;
  let created = 0;
  let updated = 0;
  const errors: ImportRowError[] = [];

  const invalidEntries = validated
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => result.errors.length > 0);

  for (const { result, index } of invalidEntries) {
    const row = parsed.rows[index]!;
    errors.push({
      row: row.rowNumber,
      sku: row.values.sku?.trim().toUpperCase() || null,
      errors: result.errors,
    });
  }

  const goodRows = validated
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => result.errors.length === 0)
    .map(({ result, index }) => ({ data: result.data!, rowNumber: parsed.rows[index]!.rowNumber }));

  for (let start = 0; start < goodRows.length; start += CHUNK_SIZE) {
    const chunk = goodRows.slice(start, start + CHUNK_SIZE);
    try {
      await prisma.$transaction(async (tx) => {
        for (const { data, rowNumber } of chunk) {
          const sku = data.sku;
          const existing = await tx.product.findUnique({ where: { sku } });

          if (existing) {
            const updateData: Prisma.ProductUpdateInput = {};
            if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
            if (data.nameEn !== undefined) updateData.nameEn = data.nameEn;
            if (data.slug !== undefined) updateData.slug = data.slug;
            if (data.descriptionAr !== undefined) updateData.descriptionAr = data.descriptionAr;
            if (data.descriptionEn !== undefined) updateData.descriptionEn = data.descriptionEn;
            if (data.shortDescriptionAr !== undefined) updateData.shortDescriptionAr = data.shortDescriptionAr;
            if (data.shortDescriptionEn !== undefined) updateData.shortDescriptionEn = data.shortDescriptionEn;
            if (data.price !== undefined) updateData.price = data.price;
            if (data.compareAtPrice !== undefined) updateData.compareAtPrice = data.compareAtPrice;
            if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold;
            if (data.weightGrams !== undefined) updateData.weightGrams = data.weightGrams;
            if (data.categoryId !== undefined) updateData.category = { connect: { id: data.categoryId } };
            if (data.brandId !== undefined) {
              updateData.brand = data.brandId === null ? { disconnect: true } : { connect: { id: data.brandId } };
            }
            if (data.tags !== undefined) updateData.tags = data.tags;
            if (data.specs !== undefined) updateData.specs = data.specs as unknown as Prisma.InputJsonValue;
            if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
            if (data.isNew !== undefined) updateData.isNew = data.isNew;
            if (data.isActive !== undefined) updateData.isActive = data.isActive;
            if (data.type !== undefined) updateData.type = data.type;

            await tx.product.update({ where: { id: existing.id }, data: updateData });

            if (data.stock !== undefined && data.stock !== existing.stock) {
              await setStockAbsolute(
                {
                  productId: existing.id,
                  newStock: data.stock,
                  reason: 'IMPORT',
                  note: `Stock imported (row ${rowNumber})`,
                  createdById: options.createdById ?? null,
                },
                tx,
              );
            }
            updated += 1;
          } else {
            const slug = await ensureUniqueSlugForImport(data.slug ?? data.nameEn ?? sku);
            const createdProduct = await tx.product.create({
              data: {
                nameAr: data.nameAr!,
                nameEn: data.nameEn!,
                slug,
                sku,
                descriptionAr: data.descriptionAr!,
                descriptionEn: data.descriptionEn!,
                shortDescriptionAr: data.shortDescriptionAr ?? null,
                shortDescriptionEn: data.shortDescriptionEn ?? null,
                price: data.price!,
                compareAtPrice: data.compareAtPrice ?? null,
                stock: 0,
                lowStockThreshold: data.lowStockThreshold ?? 5,
                weightGrams: data.weightGrams ?? null,
                brandId: data.brandId ?? null,
                categoryId: data.categoryId!,
                isFeatured: data.isFeatured ?? false,
                isNew: data.isNew ?? false,
                isActive: data.isActive ?? true,
                type: data.type ?? 'SIMPLE',
                tags: data.tags ?? [],
                specs: (data.specs ?? []) as unknown as Prisma.InputJsonValue,
              },
            });

            if (data.stock !== undefined && data.stock > 0) {
              await setStockAbsolute(
                {
                  productId: createdProduct.id,
                  newStock: data.stock,
                  reason: 'IMPORT',
                  note: `Stock imported (row ${rowNumber})`,
                  createdById: options.createdById ?? null,
                },
                tx,
              );
            }
            created += 1;
          }
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      for (const { data, rowNumber } of chunk) {
        errors.push({ row: rowNumber, sku: data.sku, errors: [message] });
      }
    }
  }

  invalidateCatalogCache();
  return {
    created,
    updated,
    failed: errors.length,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const exportInclude = {
  brand: { select: { slug: true } },
  category: { select: { slug: true } },
} satisfies Prisma.ProductInclude;

function exportRow(product: Prisma.ProductGetPayload<{ include: typeof exportInclude }>) {
  return {
    sku: product.sku,
    slug: product.slug,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    shortDescriptionAr: product.shortDescriptionAr ?? '',
    shortDescriptionEn: product.shortDescriptionEn ?? '',
    descriptionAr: product.descriptionAr,
    descriptionEn: product.descriptionEn,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? '',
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    weightGrams: product.weightGrams ?? '',
    category: product.category.slug,
    brand: product.brand?.slug ?? '',
    tags: product.tags.join('|'),
    specs: JSON.stringify(product.specs ?? []),
    isFeatured: product.isFeatured ? 'true' : 'false',
    isNew: product.isNew ? 'true' : 'false',
    isActive: product.isActive ? 'true' : 'false',
    type: product.type,
  };
}

export async function exportProducts(format: 'csv' | 'xlsx'): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const products = await prisma.product.findMany({
    include: exportInclude,
    orderBy: { createdAt: 'asc' },
  });
  const rows = products.map(exportRow);

  if (format === 'csv') {
    const csv = Papa.unparse(rows, { columns: [...IMPORT_COLUMNS] });
    return {
      buffer: Buffer.from(`\uFEFF${csv}`, 'utf8'),
      contentType: 'text/csv; charset=utf-8',
      filename: 'engineering-lab-products.csv',
    };
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Engineering Lab';
  const worksheet = workbook.addWorksheet('Products');
  worksheet.columns = IMPORT_COLUMNS.map((key) => ({ header: key, key, width: Math.max(12, key.length + 2) }));
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  for (const row of rows) {
    worksheet.addRow(row);
  }
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: 'engineering-lab-products.xlsx',
  };
}
