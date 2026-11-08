import type {
  OrderDto,
  OrderItemDto,
  OrderStatus,
  PaymentMethod,
  PlaceOrderInput,
} from '@engineering-lab/shared';
import { Prisma, StockMovementReason } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { applyStockDelta } from './inventory.service.js';
import { validateCoupon } from './coupon.service.js';
import { getShippingFee } from './shipping.service.js';
import { purchaseVerifier } from './purchase-verifier.js';
import { notifyOrderPlaced } from './notification.service.js';

const ORDER_STATUS_SEQUENCE: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PENDING_PAYMENT_REVIEW', 'CANCELLED', 'EXPIRED'],
  PENDING_PAYMENT_REVIEW: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'REFUNDED'],
  CANCELLED: [],
  EXPIRED: [],
  RETURNED: [],
  REFUNDED: [],
};

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_SEQUENCE[from]?.includes(to) ?? false;
}

function formatOrderNumber(seq: number): string {
  const year = new Date().getFullYear();
  return `EL-${year}-${String(seq).padStart(6, '0')}`;
}

type CartItemWithProduct = {
  id: string;
  qty: number;
  variantId: string | null;
  product: {
    id: string;
    slug: string;
    sku: string;
    nameAr: string;
    nameEn: string;
    price: number;
    stock: number;
    isActive: boolean;
    type: 'SIMPLE' | 'BUNDLE';
    images: { url: string }[];
  };
  variant: { id: string; sku: string; nameAr: string; nameEn: string; priceDelta: number; stock: number; isActive: boolean } | null;
};

function buildOrderItemDto(item: {
  id: string;
  productId: string;
  variantId: string | null;
  qty: number;
  nameAr: string;
  nameEn: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  lineTotal: number;
  isBundle: boolean;
}): OrderItemDto {
  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    qty: item.qty,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    sku: item.sku,
    imageUrl: item.imageUrl,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    isBundle: item.isBundle,
  };
}

type OrderInputForDto = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  addressSnapshot: unknown;
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  total: number;
  couponCode: string | null;
  customerNote: string | null;
  paymentDeadlineAt: Date | null;
  confirmedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  trackingCompany: string | null;
  trackingNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: { id: string; productId: string; variantId: string | null; qty: number; nameAr: string; nameEn: string; sku: string; imageUrl: string | null; unitPrice: number; lineTotal: number; isBundle: boolean }[];
  proofs: { id: string; status: string; createdAt: Date; rejectReason: string | null }[];
  returnRequests: { id: string; status: string; createdAt: Date }[];
  statusHistory: { id: string; from: OrderStatus | null; to: OrderStatus; createdAt: Date }[];
};

function buildOrderDto(order: OrderInputForDto): OrderDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    addressSnapshot: null,
    contactName: order.contactName,
    contactPhone: order.contactPhone,
    contactEmail: order.contactEmail,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    shippingFee: order.shippingFee,
    total: order.total,
    couponCode: order.couponCode,
    customerNote: order.customerNote,
    paymentDeadlineAt: order.paymentDeadlineAt?.toISOString() ?? null,
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancelReason: order.cancelReason,
    trackingCompany: order.trackingCompany,
    trackingNumber: order.trackingNumber,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map(buildOrderItemDto),
    proofs: order.proofs as unknown as OrderDto['proofs'],
    returnRequests: order.returnRequests as unknown as OrderDto['returnRequests'],
    statusHistory: order.statusHistory as unknown as OrderDto['statusHistory'],
  };
}

export async function placeOrder(userId: string, input: PlaceOrderInput) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const cartRaw = await tx.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true, slug: true, sku: true, nameAr: true, nameEn: true,
                price: true, stock: true, isActive: true, type: true,
                images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
              },
            },
            variant: {
              select: { id: true, sku: true, nameAr: true, nameEn: true, priceDelta: true, stock: true, isActive: true },
            },
          },
        },
      },
    });
    const cart = cartRaw as unknown as { id: string; userId: string; items: CartItemWithProduct[] } | null;
    if (!cart || !cart.items || cart.items.length === 0) {
      throw AppError.badRequest('Cart is empty', ErrorCodes.VALIDATION_ERROR);
    }

    const [user, address] = await Promise.all([
      tx.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, locale: true, emailVerified: true } }),
      tx.address.findFirst({ where: { id: input.addressId, userId } }),
    ]);
    if (!user) {
      throw AppError.notFound('User not found', ErrorCodes.NOT_FOUND);
    }
    if (!user.emailVerified) {
      throw AppError.forbidden('Email verification is required before checkout');
    }
    if (!address) {
      throw AppError.notFound('Address not found', ErrorCodes.ADDRESS_NOT_FOUND);
    }

    const codSetting = await tx.setting.findUnique({ where: { key: 'payment.methods' } });
    const methods = (codSetting?.value as Array<{ key: string }> | null) ?? [];
    // Cash on delivery is enabled by default unless explicitly disabled via settings.
    const codEnabled = methods.length === 0 || methods.some((m) => m.key === 'cash_on_delivery');
    if (input.paymentMethod === 'COD' && !codEnabled) {
      throw AppError.badRequest('Cash on delivery is not available', ErrorCodes.VALIDATION_ERROR);
    }

    const shipping = await getShippingFee(address.governorate);
    const shippingFee = shipping.feeEgp;

    let subtotal = 0;
    const orderItemsInput: Array<{
      productId: string;
      variantId: string | null;
      qty: number;
      nameAr: string;
      nameEn: string;
      sku: string;
      imageUrl: string | null;
      unitPrice: number;
      lineTotal: number;
      isBundle: boolean;
    }> = [];

    for (const item of cart.items as unknown as CartItemWithProduct[]) {
      const product = item.product;
      if (!product.isActive || product.stock <= 0) {
        throw AppError.conflict(`${product.nameEn} is no longer available`, ErrorCodes.OUT_OF_STOCK);
      }
      let unitPrice = product.price;
      const variantId = item.variantId ?? null;
      let maxStock = product.stock;
      const imageUrl = product.images[0]?.url ?? null;

      if (variantId && item.variant) {
        const variant = item.variant;
        if (!variant.isActive) {
          throw AppError.conflict('Selected variant is unavailable', ErrorCodes.OUT_OF_STOCK);
        }
        unitPrice = product.price + variant.priceDelta;
        maxStock = variant.stock;
      }
      if (item.qty > maxStock) {
        throw new AppError(409, ErrorCodes.INSUFFICIENT_STOCK, `Only ${maxStock} unit(s) available for ${product.nameEn}`);
      }

      subtotal += unitPrice * item.qty;
      orderItemsInput.push({
        productId: product.id,
        variantId,
        qty: item.qty,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        sku: variantId ? item.variant!.sku : product.sku,
        imageUrl,
        unitPrice,
        lineTotal: unitPrice * item.qty,
        isBundle: product.type === 'BUNDLE',
      });
    }

    let discountTotal = 0;
    let couponCode: string | null = null;
    if (input.couponCode) {
      const validation = await validateCoupon(input.couponCode, userId, subtotal);
      if (!validation.valid) {
        throw AppError.badRequest(validation.reason ?? 'Invalid coupon', ErrorCodes.VALIDATION_ERROR);
      }
      discountTotal = validation.discountTotal;
      couponCode = validation.code;
    }

    const total = Math.max(0, subtotal - discountTotal + shippingFee);
    const expiryHours = 24;
    const paymentDeadlineAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

    const seqRow = await tx.$queryRawUnsafe<{ nextval: number }[]>('SELECT nextval(\'order_number_seq\')');
    const orderNumber = formatOrderNumber(Number(seqRow[0]?.nextval ?? 1));

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: input.paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING_PAYMENT',
        paymentMethod: input.paymentMethod,
        addressSnapshot: {
          governorate: address.governorate,
          city: address.city,
          street: address.street,
          building: address.building,
          notes: address.notes,
          label: address.label,
        },
        contactName: user.name,
        contactPhone: user.phone ?? '',
        contactEmail: user.email,
        subtotal,
        discountTotal,
        shippingFee,
        total,
        couponCode,
        customerNote: input.customerNote ?? null,
        paymentDeadlineAt,
      },
    });

    for (const item of orderItemsInput) {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          qty: item.qty,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          sku: item.sku,
          imageUrl: item.imageUrl,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          isBundle: item.isBundle,
        },
      });
      await applyStockDelta(
        {
          productId: item.productId,
          variantId: item.variantId,
          delta: -item.qty,
          reason: StockMovementReason.ORDER_PLACED,
          note: `Order ${orderNumber}`,
          createdById: userId,
        },
        tx,
      );
    }

    if (couponCode) {
      const coupon = await tx.coupon.findFirst({ where: { code: couponCode, isActive: true } });
      if (coupon) {
        await tx.couponRedemption.create({ data: { couponId: coupon.id, userId, orderId: order.id } });
      }
    }

    await tx.orderStatusHistory.create({
      data: { orderId: order.id, from: null, to: order.status, actorId: userId, note: 'Order placed' },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    void notifyOrderPlaced(userId, user.email, (user.locale ?? 'en') as 'ar' | 'en', orderNumber);

    const fullOrder = await tx.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        proofs: true,
        returnRequests: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    return { order: buildOrderDto(fullOrder as OrderInputForDto), total, shippingFee, subtotal, discountTotal };
  }, { maxWait: 30000, timeout: 60000 });
}

export async function listMyOrders(
  userId: string,
  { page = 1, pageSize = 20, status }: { page?: number; pageSize?: number; status?: OrderStatus },
) {
  const offset = (page - 1) * pageSize;
  const where: Prisma.OrderWhereInput = { userId };
  if (status) {
    where.status = status;
  }
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: pageSize,
      include: {
        items: { select: { id: true, nameAr: true, nameEn: true, sku: true, qty: true, lineTotal: true, imageUrl: true, productId: true, variantId: true, isBundle: true, unitPrice: true } },
        proofs: { select: { id: true, status: true, createdAt: true, rejectReason: true } },
        returnRequests: { select: { id: true, status: true, createdAt: true } },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 6 },
      },
    }),
  ]);
  return {
    orders: orders.map((o) => buildOrderDto(o as OrderInputForDto)),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getOrder(orderNumber: string, userId: string, actorId?: string) {
  const order = await prisma.order.findFirst({
    where: { orderNumber, ...(actorId ? {} : { userId }) },
    include: {
      items: true,
      proofs: { orderBy: { createdAt: 'desc' } },
      returnRequests: true,
      statusHistory: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!order) {
    throw AppError.notFound('Order not found', ErrorCodes.NOT_FOUND);
  }
  if (!actorId && order.userId !== userId) {
    throw AppError.forbidden();
  }
  return buildOrderDto(order as OrderInputForDto);
}

export async function cancelOrder(orderNumber: string, userId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { orderNumber, userId },
      include: { items: true },
    });
    if (!order) {
      throw AppError.notFound('Order not found', ErrorCodes.NOT_FOUND);
    }
    if (!canTransition(order.status, 'CANCELLED')) {
      throw AppError.badRequest(`Cannot cancel order in ${order.status} status`, ErrorCodes.VALIDATION_ERROR);
    }
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason ?? null },
      include: { items: true },
    });
    for (const item of order.items) {
      await applyStockDelta(
        { productId: item.productId, variantId: item.variantId ?? undefined, delta: item.qty, reason: StockMovementReason.ORDER_CANCELLED, note: `Order ${orderNumber} cancelled`, createdById: userId },
        tx,
      );
    }
    await tx.orderStatusHistory.create({ data: { orderId: order.id, from: order.status, to: 'CANCELLED', actorId: userId, note: reason ?? 'Cancelled by customer' } });
    const full = await tx.order.findUnique({
      where: { id: order.id },
      include: { items: true, proofs: true, returnRequests: true, statusHistory: { orderBy: { createdAt: 'desc' } } },
    });
    return buildOrderDto(full as OrderInputForDto);
  });
}

export async function transitionOrderStatus(orderId: string, to: OrderStatus, actorId: string, note?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw AppError.notFound('Order not found', ErrorCodes.NOT_FOUND);
    }
    if (!canTransition(order.status, to)) {
      throw AppError.badRequest(`Illegal transition ${order.status} → ${to}`, ErrorCodes.VALIDATION_ERROR);
    }
    const data: Prisma.OrderUpdateArgs['data'] = { status: to };
    if (to === 'CONFIRMED') data.confirmedAt = new Date();
    if (to === 'SHIPPED') data.shippedAt = new Date();
    if (to === 'DELIVERED') data.deliveredAt = new Date();
    if (to === 'CANCELLED') data.cancelledAt = new Date();
    const updated = await tx.order.update({ where: { id: orderId }, data, include: { items: true } });
    await tx.orderStatusHistory.create({ data: { orderId, from: order.status, to, actorId, note: note ?? null } });
    if (to === 'DELIVERED') {
      for (const item of updated.items) {
        await tx.product.update({ where: { id: item.productId }, data: { soldCount: { increment: item.qty } } });
      }
    }
    const full = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, proofs: true, returnRequests: true, statusHistory: { orderBy: { createdAt: 'desc' } } },
    });
    return buildOrderDto(full as OrderInputForDto);
  });
}

export async function canReviewProduct(userId: string, productId: string): Promise<boolean> {
  return purchaseVerifier.canReview(userId, productId);
}
