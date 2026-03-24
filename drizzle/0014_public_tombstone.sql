CREATE TYPE "public"."match_type" AS ENUM('standard', 'initial_setup');--> statement-breakpoint
ALTER TABLE "armies" ADD COLUMN "needs_initial_xp" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "match_xp_entries" ADD COLUMN "deroute_xp_lost" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "match_type" "match_type" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "unit_gains" ADD COLUMN "threshold_xp" integer;--> statement-breakpoint
ALTER TABLE "unit_gains" ADD COLUMN "cleared_by_match_participant_id" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "nickname" text;--> statement-breakpoint
ALTER TABLE "unit_gains" ADD CONSTRAINT "unit_gains_cleared_by_match_participant_id_match_participants_id_fk" FOREIGN KEY ("cleared_by_match_participant_id") REFERENCES "public"."match_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_xp_entries" ADD CONSTRAINT "mxe_deroute_xp_lost_non_negative" CHECK ("match_xp_entries"."deroute_xp_lost" >= 0);