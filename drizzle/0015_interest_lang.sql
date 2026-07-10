ALTER TABLE "customer_interests" ADD COLUMN IF NOT EXISTS "lang" varchar(8) NOT NULL DEFAULT 'en';
