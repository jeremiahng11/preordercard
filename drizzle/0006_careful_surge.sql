CREATE TABLE "admin_audit" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" varchar(64),
	"action" varchar(48) NOT NULL,
	"target" varchar(200),
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
