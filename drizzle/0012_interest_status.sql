-- Start fresh: clear existing preorder interest registrations before adding
-- status tracking. Requested reset — this runs once on the next deploy.
DELETE FROM "customer_interests";

ALTER TABLE "customer_interests" ADD COLUMN IF NOT EXISTS "status" varchar(16) NOT NULL DEFAULT 'active';
ALTER TABLE "customer_interests" ADD COLUMN IF NOT EXISTS "last_emailed_at" timestamp with time zone;
