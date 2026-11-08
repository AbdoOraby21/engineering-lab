import type {
  CartDto,
  CouponValidationResult,
  OrderDto,
  OrderSummaryDto,
  PaymentProofStatus,
  PlaceOrderInput,
} from '@engineering-lab/shared';
import { api } from './api';

interface Data<T> {
  data: T;
}

export async function getCart(): Promise<CartDto> {
  const response = await api.get<Data<{ cart: CartDto }>>('/cart');
  return response.data.data.cart;
}

export async function addCartItem(productId: string, qty: number, variantId: string | null = null) {
  const response = await api.post<Data<{ cart: CartDto }>>('/cart/items', { productId, qty, variantId });
  return response.data.data.cart;
}

export async function updateCartItem(itemId: string, qty: number): Promise<CartDto> {
  const response = await api.patch<Data<{ cart: CartDto }>>(`/cart/items/${itemId}`, { qty });
  return response.data.data.cart;
}

export async function removeCartItem(itemId: string): Promise<CartDto> {
  const response = await api.delete<Data<{ cart: CartDto }>>(`/cart/items/${itemId}`);
  return response.data.data.cart;
}

export async function clearCart(): Promise<CartDto> {
  const response = await api.delete<Data<{ cart: CartDto }>>('/cart');
  return response.data.data.cart;
}

export async function mergeCart(items: { productId: string; variantId: string | null; qty: number }[]): Promise<CartDto> {
  const response = await api.post<Data<{ cart: CartDto }>>('/cart/merge', { items });
  return response.data.data.cart;
}

export async function getCheckoutSummary(addressId?: string, coupon?: string | null): Promise<OrderSummaryDto> {
  const params = new URLSearchParams();
  if (addressId) params.set('addressId', addressId);
  if (coupon) params.set('coupon', coupon);
  const response = await api.get<Data<{ summary: OrderSummaryDto }>>(`/checkout/summary?${params}`);
  return response.data.data.summary;
}

export async function validateCoupon(code: string): Promise<CouponValidationResult> {
  const response = await api.post<Data<CouponValidationResult>>('/coupons/validate', { code });
  return response.data.data;
}

export async function placeOrder(input: PlaceOrderInput): Promise<{ order: OrderDto; total: number }> {
  const response = await api.post<Data<{ order: OrderDto; total: number }>>('/orders', input);
  return response.data.data;
}

export async function getMyOrders({
  page = 1,
  pageSize = 20,
  status,
}: { page?: number; pageSize?: number; status?: string }): Promise<{
  orders: OrderDto[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set('status', status);
  const response = await api.get<Data<{ orders: OrderDto[]; pagination: unknown }>>(`/orders?${params}`);
  return {
    orders: response.data.data.orders,
    pagination: response.data.data.pagination as { page: number; pageSize: number; total: number; totalPages: number },
  };
}

export async function getOrder(orderNumber: string): Promise<OrderDto> {
  const response = await api.get<Data<{ order: OrderDto }>>(`/orders/${encodeURIComponent(orderNumber)}`);
  return response.data.data.order;
}

export async function cancelOrder(orderNumber: string, reason?: string | null): Promise<OrderDto> {
  const response = await api.post<Data<{ order: OrderDto }>>(
    `/orders/${encodeURIComponent(orderNumber)}/cancel`,
    { reason },
  );
  return response.data.data.order;
}

export async function submitPaymentProof(
  orderNumber: string,
  formData: FormData,
): Promise<{ proof: { id: string; status: PaymentProofStatus } }> {
  const response = await api.post<Data<{ proof: { id: string; status: PaymentProofStatus } }>>(
    `/orders/${encodeURIComponent(orderNumber)}/payment-proof`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response.data.data;
}

export async function getOrderInvoice(orderNumber: string): Promise<Blob> {
  const response = await api.get(`/orders/${encodeURIComponent(orderNumber)}/invoice`, {
    responseType: 'blob',
  });
  return response.data as Blob;
}
