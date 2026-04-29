-- Speed up shop / API list queries (category, newest, filters).
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_category_createdAt_idx" ON "Product"("category", "createdAt");

-- Speed up variant loads per product (avoids sequential scans on large catalogs).
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");
