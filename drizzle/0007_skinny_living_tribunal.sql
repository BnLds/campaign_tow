CREATE TYPE "public"."match_result" AS ENUM('victory', 'defeat', 'draw');--> statement-breakpoint
ALTER TABLE "match_participants" ALTER COLUMN "result" SET DATA TYPE "public"."match_result" USING "result"::"public"."match_result";--> statement-breakpoint
CREATE UNIQUE INDEX "mp_match_army_unique" ON "match_participants" USING btree ("match_id","army_id");--> statement-breakpoint
CREATE INDEX "idx_mp_army_id" ON "match_participants" USING btree ("army_id");--> statement-breakpoint
CREATE INDEX "idx_mp_match_id" ON "match_participants" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "idx_matches_date" ON "matches" USING btree ("date");