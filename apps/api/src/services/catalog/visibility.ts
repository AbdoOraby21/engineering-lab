import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

// A product is publicly visible when:
//   - the product itself is active,
//   - every category on its ancestor chain is active,
//   - its brand is active (or the product has no brand).
// Keep the ORM and raw-SQL variants in sync.

interface CategoryRow {
  id: string;
  parentId: string | null;
  isActive: boolean;
}

function isCategoryVisible(category: CategoryRow, byId: Map<string, CategoryRow>): boolean {
  const seen = new Set<string>();
  let current: CategoryRow | undefined = category;
  while (current) {
    if (!current.isActive) {
      return false;
    }
    if (!current.parentId || seen.has(current.id)) {
      return true;
    }
    seen.add(current.id);
    current = byId.get(current.parentId);
  }
  return true;
}

export async function getVisibleCategoryIds(): Promise<string[]> {
  const categories = await prisma.category.findMany({
    select: { id: true, parentId: true, isActive: true },
  });
  const byId = new Map(categories.map((category) => [category.id, category]));
  return categories
    .filter((category) => isCategoryVisible(category, byId))
    .map((category) => category.id);
}

export async function publicProductWhereAsync(): Promise<Prisma.ProductWhereInput> {
  const visibleCategoryIds = await getVisibleCategoryIds();
  return {
    isActive: true,
    categoryId: { in: visibleCategoryIds },
    OR: [{ brandId: null }, { brand: { isActive: true } }],
  };
}

export function publicProductSql(): Prisma.Sql {
  return Prisma.sql`(
    p."isActive" = true
    AND category_is_visible(p."categoryId")
    AND (
      p."brandId" IS NULL
      OR EXISTS (
        SELECT 1 FROM "Brand" b
        WHERE b."id" = p."brandId" AND b."isActive" = true
      )
    )
  )`;
}

export function inStockSql(): Prisma.Sql {
  return Prisma.sql`(
    p."stock" > 0
    OR EXISTS (
      SELECT 1 FROM "ProductVariant" v
      WHERE v."productId" = p."id" AND v."isActive" = true AND v."stock" > 0
    )
  )`;
}
