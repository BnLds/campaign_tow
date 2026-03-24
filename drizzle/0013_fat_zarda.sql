CREATE TYPE "public"."unit_status" AS ENUM('active', 'graveyard');--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "status" "unit_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "graveyard_reason" text;