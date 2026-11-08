import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

// Phase 4: verified-buyer rule. A user can review a product only if they have
// an order item for it whose order status is DELIVERED.
export interface PurchaseVerifier {
  canReview(userId: string, productId: string): Promise<boolean>;
}

export class DbPurchaseVerifier implements PurchaseVerifier {
  async canReview(userId: string, productId: string): Promise<boolean> {
    const count = await prisma.orderItem.count({
      where: {
        productId,
        order: { userId, status: 'DELIVERED' },
      },
    });
    return count > 0;
  }
}

export const purchaseVerifier: PurchaseVerifier = env.REVIEWS_REQUIRE_PURCHASE
  ? new DbPurchaseVerifier()
  : new DbPurchaseVerifier();
