import type { CartDto, CartItemDto } from '@engineering-lab/shared';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { productCardInclude, type ProductCardSource } from './catalog/includes.js';
import { toProductCard } from './catalog/serializers.js';
import { publicProductWhereAsync } from './catalog/visibility.js';

async function getOrCreateCartId(userId: string): Promise<string> {
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }
  return cart.id;
}

export async function listCart(userId: string): Promise<CartDto> {
  const cartId = await getOrCreateCartId(userId);
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    select: { id: true, userId: true, updatedAt: true },
  });
  if (!cart) {
    throw AppError.notFound('Cart not found', ErrorCodes.NOT_FOUND);
  }
  const items = await prisma.cartItem.findMany({
    where: { cartId, product: { is: await publicProductWhereAsync() } },
    orderBy: { createdAt: 'asc' },
    include: { product: { include: productCardInclude } },
  });
  return {
    id: cart.id,
    userId: cart.userId,
    items: items.map((item): CartItemDto => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId ?? null,
      qty: item.qty,
      product: toProductCard(item.product as ProductCardSource),
    })),
    updatedAt: cart.updatedAt.toISOString(),
  };
}

export async function addCartItem(
  userId: string,
  productId: string,
  variantId: string | null,
  qty: number,
): Promise<CartDto> {
  const product = await prisma.product.findFirst({
    where: { id: productId, ...(await publicProductWhereAsync()) },
    select: { id: true, stock: true, isActive: true },
  });
  if (!product) {
    throw AppError.notFound('Product not found', ErrorCodes.PRODUCT_NOT_FOUND);
  }
  if (!product.isActive || product.stock <= 0) {
    throw AppError.conflict('Product is out of stock', ErrorCodes.OUT_OF_STOCK);
  }

  let maxStock = product.stock;
  if (variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true, isActive: true },
    });
    if (!variant || !variant.isActive) {
      throw AppError.notFound('Variant not found', ErrorCodes.PRODUCT_NOT_FOUND);
    }
    maxStock = variant.stock;
  }

  const cartId = await getOrCreateCartId(userId);
  const existing = await prisma.cartItem.findFirst({
    where: { cartId, productId, variantId: variantId ?? undefined },
  });

  const nextQty = Math.min(maxStock, (existing?.qty ?? 0) + qty);

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { qty: nextQty } });
  } else {
    await prisma.cartItem.create({
      data: { cartId, productId, variantId: variantId ?? undefined, qty: nextQty },
    });
  }

  return listCart(userId);
}

export async function updateCartItem(
  userId: string,
  itemId: string,
  qty: number,
): Promise<CartDto> {
  const cartId = await getOrCreateCartId(userId);
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId },
    include: { product: { select: { stock: true } } },
  });
  if (!item) {
    throw AppError.notFound('Cart item not found', ErrorCodes.CART_ITEM_NOT_FOUND);
  }
  let maxStock = item.product.stock;
  if (item.variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.variantId },
      select: { stock: true },
    });
    maxStock = variant?.stock ?? 0;
  }
  await prisma.cartItem.update({ where: { id: itemId }, data: { qty: Math.min(maxStock, qty) } });
  return listCart(userId);
}

export async function removeCartItem(userId: string, itemId: string): Promise<CartDto> {
  const cartId = await getOrCreateCartId(userId);
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
  return listCart(userId);
}

export async function clearCart(userId: string): Promise<CartDto> {
  const cartId = await getOrCreateCartId(userId);
  await prisma.cartItem.deleteMany({ where: { cartId } });
  return listCart(userId);
}

export async function mergeCart(
  userId: string,
  localItems: { productId: string; variantId: string | null; qty: number }[],
): Promise<CartDto> {
  for (const item of localItems) {
    await addCartItem(userId, item.productId, item.variantId, item.qty);
  }
  return listCart(userId);
}
