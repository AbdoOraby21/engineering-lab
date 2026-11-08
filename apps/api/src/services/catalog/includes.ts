import { Prisma } from '@prisma/client';

export const productCardInclude = Prisma.validator<Prisma.ProductInclude>()({
  brand: true,
  category: true,
  images: { orderBy: { sortOrder: 'asc' } },
});

export const productDetailInclude = Prisma.validator<Prisma.ProductInclude>()({
  brand: true,
  category: true,
  images: { orderBy: { sortOrder: 'asc' } },
  variants: { orderBy: { sortOrder: 'asc' } },
  bundleItems: {
    include: {
      component: {
        include: {
          brand: true,
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          variants: { select: { stock: true, isActive: true } },
        },
      },
    },
  },
});

export type ProductCardSource = Prisma.ProductGetPayload<{
  include: typeof productCardInclude;
}>;

export type ProductDetailSource = Prisma.ProductGetPayload<{
  include: typeof productDetailInclude;
}>;

export type ReviewSource = Prisma.ReviewGetPayload<{
  include: { user: { select: { id: true; name: true } } };
}>;
