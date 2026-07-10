CREATE TABLE IF NOT EXISTS "promo_codes" (
  "id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(120) NOT NULL,
  "code" varchar(32) NOT NULL,
  "discount_percent" integer NOT NULL,
  "expires_at" timestamp with time zone,
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_code_uq" ON "promo_codes" ("code");

CREATE TABLE IF NOT EXISTS "customer_interests" (
  "id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  "full_name" varchar(200) NOT NULL,
  "email" varchar(200) NOT NULL,
  "mobile" varchar(40) NOT NULL,
  "product_name" varchar(120) NOT NULL,
  "product_code" varchar(48) NOT NULL,
  "price_minor" integer NOT NULL,
  "currency" varchar(3) NOT NULL DEFAULT 'SGD',
  "promo_code" varchar(32),
  "promo_discount_percent" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
