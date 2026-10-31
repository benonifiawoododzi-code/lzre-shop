CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Product_name_description_trgm"
ON "Product"
USING gin ((name || ' ' || description) gin_trgm_ops);
