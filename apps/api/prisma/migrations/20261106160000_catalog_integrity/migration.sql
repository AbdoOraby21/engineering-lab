-- Phase 2 (hardening): catalog data integrity + recursive category visibility.
-- Raw SQL because Prisma does not model CHECK constraints or helper functions.

-- A product is publicly visible only when every category on its ancestor chain
-- is active. Used by the public catalog SQL in visibility.ts.
CREATE OR REPLACE FUNCTION category_is_visible(category_id text) RETURNS boolean
LANGUAGE plpgsql STABLE PARALLEL SAFE AS $$
DECLARE
  current_id text := category_id;
  current_active boolean;
  current_parent text;
  visited text[] := ARRAY[]::text[];
BEGIN
  WHILE current_id IS NOT NULL AND NOT (current_id = ANY(visited)) LOOP
    SELECT "isActive", "parentId"
      INTO current_active, current_parent
      FROM "Category"
      WHERE "id" = current_id;

    IF NOT FOUND OR current_active IS NOT TRUE THEN
      RETURN FALSE;
    END IF;

    visited := array_append(visited, current_id);
    current_id := current_parent;
  END LOOP;

  -- Reaching the root sets current_id to NULL. A non-null value means a cycle.
  RETURN current_id IS NULL;
END;
$$;

-- compareAtPrice, when set, must be strictly greater than price.
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_compare_price_gt_price"
  CHECK ("compareAtPrice" IS NULL OR "compareAtPrice" > "price");

-- Inventory can never go negative.
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_reserved_stock_nonnegative"
  CHECK ("reservedStock" >= 0);

ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "ProductVariant_stock_nonnegative"
  CHECK ("stock" >= 0);
