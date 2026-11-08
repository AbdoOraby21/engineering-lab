-- Phase 2 (extend): catalog data model hardening.
-- Adds: ProductType/StockMovementReason/ReviewStatus enums, StockMovement table,
-- normalized search columns + tsvector trigger, banner CTA fields, SEO fields,
-- data migration from isBundle/approved, and GIN/trigram indexes.
-- Order matters: add columns first, backfill data, then alter/drop, then indexes.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Arabic-aware normalization shared by the search trigger and backfill.
-- Mirrors normalizeSearchText() in packages/shared (keep both in sync):
-- lowercase, strip tashkeel/tatweel, fold alef forms to bare alef,
-- ى→ي, ة→ه, Arabic-Indic digits → Latin digits.
CREATE OR REPLACE FUNCTION search_normalize(input text) RETURNS text
LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE AS $$
DECLARE
  t text;
BEGIN
  t := lower(coalesce(input, ''));
  t := regexp_replace(t, '[ً-ٰٟـ]', '', 'g');
  t := regexp_replace(t, '[أإآٱ]', 'ا', 'g');
  t := regexp_replace(t, 'ى', 'ي', 'g');
  t := regexp_replace(t, 'ة', 'ه', 'g');
  t := translate(t, '۰۱۲۳۴۵۶۷۸۹', '0123456789');
  t := translate(t, '٠١٢٣٤٥٦٧٨٩', '0123456789');
  t := regexp_replace(t, '\s+', ' ', 'g');
  RETURN btrim(t);
END;
$$;

CREATE OR REPLACE FUNCTION product_refresh_search() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW."searchText" := btrim(regexp_replace(concat_ws(' ',
    search_normalize(NEW."nameAr"),
    search_normalize(NEW."nameEn"),
    search_normalize(NEW."sku"),
    search_normalize(NEW."shortDescriptionAr"),
    search_normalize(NEW."shortDescriptionEn"),
    search_normalize(array_to_string(NEW."tags", ' ')),
    search_normalize(NEW."descriptionAr"),
    search_normalize(NEW."descriptionEn")), '\s+', ' ', 'g'));

  NEW."searchVector" :=
      setweight(to_tsvector('simple', search_normalize(coalesce(NEW."nameAr", ''))), 'A')
    || setweight(to_tsvector('simple', search_normalize(coalesce(NEW."nameEn", ''))), 'A')
    || setweight(to_tsvector('simple', search_normalize(coalesce(NEW."sku", ''))), 'B')
    || setweight(to_tsvector('simple', search_normalize(coalesce(array_to_string(NEW."tags", ' '), ''))), 'B')
    || setweight(to_tsvector('simple', search_normalize(coalesce(NEW."shortDescriptionEn", ''))), 'C')
    || setweight(to_tsvector('simple', search_normalize(coalesce(NEW."shortDescriptionAr", ''))), 'C')
    || setweight(to_tsvector('simple', search_normalize(coalesce(NEW."descriptionEn", ''))), 'D')
    || setweight(to_tsvector('simple', search_normalize(coalesce(NEW."descriptionAr", ''))), 'D');

  RETURN NEW;
END;
$$;

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'BUNDLE');

-- CreateEnum
CREATE TYPE "StockMovementReason" AS ENUM ('INITIAL', 'MANUAL_ADJUSTMENT', 'ORDER_PLACED', 'ORDER_CANCELLED', 'RETURN', 'IMPORT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropIndex (superseded by the maintained tsvector column)
DROP INDEX "Product_search_fts_idx";
DROP INDEX "Review_productId_approved_createdAt_idx";

-- AlterTable
ALTER TABLE "Banner" ADD COLUMN     "bulletsAr" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "bulletsEn" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ctaLabelAr" TEXT,
ADD COLUMN     "ctaLabelEn" TEXT,
ADD COLUMN     "highlightAr" TEXT,
ADD COLUMN     "highlightEn" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "seoDescriptionAr" TEXT,
ADD COLUMN     "seoDescriptionEn" TEXT,
ADD COLUMN     "seoTitleAr" TEXT,
ADD COLUMN     "seoTitleEn" TEXT;

-- AlterTable
ALTER TABLE "Product"
ADD COLUMN     "isNew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reservedStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "searchText" TEXT,
ADD COLUMN     "searchVector" tsvector,
ADD COLUMN     "seoDescriptionAr" TEXT,
ADD COLUMN     "seoDescriptionEn" TEXT,
ADD COLUMN     "seoTitleAr" TEXT,
ADD COLUMN     "seoTitleEn" TEXT,
ADD COLUMN     "shortDescriptionAr" TEXT,
ADD COLUMN     "shortDescriptionEn" TEXT,
ADD COLUMN     "type" "ProductType" NOT NULL DEFAULT 'SIMPLE';

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicId" TEXT;

-- AlterTable
ALTER TABLE "Review"
ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "title" TEXT;

-- Data migration: isBundle -> type, approved -> status, null comments -> ''
UPDATE "Product" SET "type" = CASE WHEN "isBundle" THEN 'BUNDLE'::"ProductType" ELSE 'SIMPLE'::"ProductType" END;
UPDATE "Review" SET "status" = CASE WHEN "approved" THEN 'APPROVED'::"ReviewStatus" ELSE 'PENDING'::"ReviewStatus" END;
UPDATE "Review" SET "comment" = '' WHERE "comment" IS NULL;

-- AlterTable (drops after data migration)
ALTER TABLE "Product" DROP COLUMN "isBundle";
ALTER TABLE "Review" DROP COLUMN "approved";
ALTER TABLE "Review" ALTER COLUMN "comment" SET NOT NULL;

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "delta" INTEGER NOT NULL,
    "reason" "StockMovementReason" NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_variantId_createdAt_idx" ON "StockMovement"("variantId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_reason_createdAt_idx" ON "StockMovement"("reason", "createdAt");

-- CreateIndex
CREATE INDEX "Product_isActive_isNew_idx" ON "Product"("isActive", "isNew");

-- CreateIndex
CREATE INDEX "Product_price_idx" ON "Product"("price");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "Product_soldCount_idx" ON "Product"("soldCount");

-- CreateIndex
CREATE INDEX "Review_productId_status_createdAt_idx" ON "Review"("productId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Review_status_createdAt_idx" ON "Review"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Normalized-search trigger (fresh writes) and backfill (existing rows)
DROP TRIGGER IF EXISTS product_refresh_search_trigger ON "Product";
CREATE TRIGGER product_refresh_search_trigger
  BEFORE INSERT OR UPDATE OF "nameAr", "nameEn", "sku", "tags",
    "shortDescriptionAr", "shortDescriptionEn", "descriptionAr", "descriptionEn"
  ON "Product"
  FOR EACH ROW EXECUTE FUNCTION product_refresh_search();

UPDATE "Product" SET "nameAr" = "nameAr";

-- Search indexes: tsvector GIN + trigram GIN on the normalized column
CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");
CREATE INDEX "Product_searchText_trgm_idx" ON "Product" USING GIN ("searchText" gin_trgm_ops);

-- Old raw-column trigram indexes are subsumed by the normalized column index
DROP INDEX "Product_nameEn_idx";
DROP INDEX "Product_nameAr_idx";
DROP INDEX "Product_sku_idx";
