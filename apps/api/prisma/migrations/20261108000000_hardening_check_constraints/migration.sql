-- Phase 7 hardening: database check constraints
-- Ensures non-negative stock, prices, quantities, and fees at the database layer.

ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_non_negative" CHECK ("stock" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_reservedStock_non_negative" CHECK ("reservedStock" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_non_negative" CHECK ("price" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_compareAtPrice_non_negative" CHECK ("compareAtPrice" IS NULL OR "compareAtPrice" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_lowStockThreshold_non_negative" CHECK ("lowStockThreshold" >= 0);

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_stock_non_negative" CHECK ("stock" >= 0);

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_qty_positive" CHECK ("qty" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_unitPrice_non_negative" CHECK ("unitPrice" >= 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_lineTotal_non_negative" CHECK ("lineTotal" >= 0);

ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_qty_positive" CHECK ("qty" > 0);

ALTER TABLE "Order" ADD CONSTRAINT "Order_subtotal_non_negative" CHECK ("subtotal" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_discountTotal_non_negative" CHECK ("discountTotal" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingFee_non_negative" CHECK ("shippingFee" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_non_negative" CHECK ("total" >= 0);

ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_value_non_negative" CHECK ("value" >= 0);
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_minSubtotal_non_negative" CHECK ("minSubtotal" IS NULL OR "minSubtotal" >= 0);
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_maxDiscount_non_negative" CHECK ("maxDiscount" IS NULL OR "maxDiscount" >= 0);
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_usageLimit_non_negative" CHECK ("usageLimit" IS NULL OR "usageLimit" >= 0);
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_perUserLimit_non_negative" CHECK ("perUserLimit" IS NULL OR "perUserLimit" >= 0);

ALTER TABLE "ShippingZone" ADD CONSTRAINT "ShippingZone_feeEgp_non_negative" CHECK ("feeEgp" >= 0);
