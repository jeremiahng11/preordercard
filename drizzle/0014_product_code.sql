-- Admin-editable product code. Backfill existing rows from their slug so the
-- column can be NOT NULL + unique without losing data.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "code" varchar(48);
UPDATE "products" SET "code" = "slug" WHERE "code" IS NULL;
ALTER TABLE "products" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "products_code_uq" ON "products" ("code");
