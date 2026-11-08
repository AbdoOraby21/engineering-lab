import { Prisma } from '@prisma/client';
import type { StockMovementReason } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCodes } from '../utils/errors.js';

export interface ApplyStockDeltaInput {
  productId: string;
  variantId?: string | null;
  delta: number;
  reason: StockMovementReason;
  note?: string | null;
  createdById?: string | null;
}

export interface ApplyStockResult {
  id: string;
  stock: number;
}

type Transaction = Prisma.TransactionClient;

async function lockVariant(tx: Transaction, variantId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; productId: string; stock: number }>>`
    SELECT "id", "productId", "stock"
    FROM "ProductVariant"
    WHERE "id" = ${variantId}
    FOR UPDATE
  `;
  return rows[0] ?? null;
}

async function lockProduct(tx: Transaction, productId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; stock: number }>>`
    SELECT "id", "stock"
    FROM "Product"
    WHERE "id" = ${productId}
    FOR UPDATE
  `;
  return rows[0] ?? null;
}

export async function applyStockDelta(
  input: ApplyStockDeltaInput,
  tx?: Transaction,
): Promise<ApplyStockResult> {
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    throw AppError.badRequest('delta must be a non-zero integer', ErrorCodes.VALIDATION_ERROR);
  }

  if (tx) {
    return applyStockDeltaInTransaction(input, tx);
  }
  return prisma.$transaction((transaction) => applyStockDeltaInTransaction(input, transaction));
}

async function applyStockDeltaInTransaction(
  input: ApplyStockDeltaInput,
  tx: Transaction,
): Promise<ApplyStockResult> {
  const variantId = input.variantId ?? null;

  if (variantId) {
    const variant = await lockVariant(tx, variantId);
    if (!variant) {
      throw AppError.notFound('Variant not found', ErrorCodes.PRODUCT_NOT_FOUND);
    }
    if (variant.productId !== input.productId) {
      throw AppError.badRequest('Variant does not belong to this product', ErrorCodes.VALIDATION_ERROR);
    }
    const newStock = variant.stock + input.delta;
    if (newStock < 0) {
      throw new AppError(
        409,
        ErrorCodes.INSUFFICIENT_STOCK,
        `Insufficient stock for variant (available ${variant.stock}, requested ${-input.delta})`,
      );
    }
    await tx.productVariant.update({ where: { id: variant.id }, data: { stock: newStock } });
    await tx.stockMovement.create({
      data: {
        productId: input.productId,
        variantId: variant.id,
        delta: input.delta,
        reason: input.reason,
        note: input.note ?? null,
        createdById: input.createdById ?? null,
      },
    });
    return { id: variant.id, stock: newStock };
  }

  const product = await lockProduct(tx, input.productId);
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }
  const newStock = product.stock + input.delta;
  if (newStock < 0) {
    throw new AppError(
      409,
      ErrorCodes.INSUFFICIENT_STOCK,
      `Insufficient stock for product (available ${product.stock}, requested ${-input.delta})`,
    );
  }
  await tx.product.update({ where: { id: product.id }, data: { stock: newStock } });
  await tx.stockMovement.create({
    data: {
      productId: product.id,
      delta: input.delta,
      reason: input.reason,
      note: input.note ?? null,
      createdById: input.createdById ?? null,
    },
  });
  return { id: product.id, stock: newStock };
}

export interface SetStockAbsoluteInput {
  productId: string;
  variantId?: string | null;
  newStock: number;
  reason: StockMovementReason;
  note?: string | null;
  createdById?: string | null;
}

export async function setStockAbsolute(
  input: SetStockAbsoluteInput,
  tx?: Transaction,
): Promise<ApplyStockResult> {
  if (!Number.isInteger(input.newStock) || input.newStock < 0) {
    throw AppError.badRequest('newStock must be a non-negative integer', ErrorCodes.VALIDATION_ERROR);
  }

  if (tx) {
    return setStockAbsoluteInTransaction(input, tx);
  }
  return prisma.$transaction((transaction) => setStockAbsoluteInTransaction(input, transaction));
}

async function setStockAbsoluteInTransaction(
  input: SetStockAbsoluteInput,
  tx: Transaction,
): Promise<ApplyStockResult> {
  const variantId = input.variantId ?? null;

  if (variantId) {
    const variant = await lockVariant(tx, variantId);
    if (!variant) {
      throw AppError.notFound('Variant not found', ErrorCodes.PRODUCT_NOT_FOUND);
    }
    if (variant.productId !== input.productId) {
      throw AppError.badRequest('Variant does not belong to this product', ErrorCodes.VALIDATION_ERROR);
    }
    const delta = input.newStock - variant.stock;
    await tx.productVariant.update({ where: { id: variant.id }, data: { stock: input.newStock } });
    if (delta !== 0) {
      await tx.stockMovement.create({
        data: {
          productId: input.productId,
          variantId: variant.id,
          delta,
          reason: input.reason,
          note: input.note ?? null,
          createdById: input.createdById ?? null,
        },
      });
    }
    return { id: variant.id, stock: input.newStock };
  }

  const product = await lockProduct(tx, input.productId);
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }
  const delta = input.newStock - product.stock;
  await tx.product.update({ where: { id: product.id }, data: { stock: input.newStock } });
  if (delta !== 0) {
    await tx.stockMovement.create({
      data: {
        productId: product.id,
        delta,
        reason: input.reason,
        note: input.note ?? null,
        createdById: input.createdById ?? null,
      },
    });
  }
  return { id: product.id, stock: input.newStock };
}

export interface BundleAvailabilityInput {
  type: 'SIMPLE' | 'BUNDLE';
  stock: number;
  reservedStock: number;
  variants?: Array<{ stock: number; isActive?: boolean }>;
  bundleItems: Array<{
    quantity: number;
    component: {
      stock: number;
      reservedStock: number;
      variants?: Array<{ stock: number; isActive?: boolean }>;
    };
  }>;
}

function sellableStock(entry: {
  stock: number;
  reservedStock: number;
  variants?: Array<{ stock: number; isActive?: boolean }>;
}): number {
  const activeVariants = entry.variants?.filter((variant) => variant.isActive !== false);
  if (activeVariants && activeVariants.length > 0) {
    return activeVariants.reduce((sum, variant) => sum + Math.max(0, variant.stock), 0);
  }
  return Math.max(0, entry.stock - entry.reservedStock);
}

export function availableStock(input: BundleAvailabilityInput): number {
  if (input.type === 'BUNDLE') {
    if (input.bundleItems.length === 0) {
      return 0;
    }
    let min = Number.POSITIVE_INFINITY;
    for (const item of input.bundleItems) {
      if (item.quantity <= 0) {
        return 0;
      }
      const sellable = sellableStock(item.component);
      min = Math.min(min, Math.floor(sellable / item.quantity));
    }
    return Number.isFinite(min) ? min : 0;
  }
  return sellableStock(input);
}
