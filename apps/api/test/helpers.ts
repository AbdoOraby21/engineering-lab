import { prisma } from '../src/lib/prisma.js';
import { invalidateCatalogCache } from '../src/utils/cache.js';

export async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.ticketMessage.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.contactMessage.deleteMany(),
    prisma.faqItem.deleteMany(),
    prisma.page.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.review.deleteMany(),
    prisma.wishlistItem.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.bundleItem.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.address.deleteMany(),
    prisma.product.deleteMany(),
    prisma.brand.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  invalidateCatalogCache();
}

export function extractCookie(setCookieHeader: string | string[] | undefined, name: string): string | undefined {
  if (!setCookieHeader) {
    return undefined;
  }
  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const cookie of cookies) {
    if (cookie.startsWith(`${name}=`)) {
      return cookie.split(';')[0];
    }
  }
  return undefined;
}
