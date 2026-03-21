-- Step 1: Drop old FK and unique index on army_id
ALTER TABLE "match_participants" DROP CONSTRAINT "match_participants_army_id_armies_id_fk";
--> statement-breakpoint
DROP INDEX "mp_match_army_unique";
--> statement-breakpoint

-- Step 2: Add player_id as NULLABLE first (for backfill)
ALTER TABLE "match_participants" ADD COLUMN "player_id" text;
--> statement-breakpoint

-- Step 3: Backfill player_id from armies table
UPDATE match_participants mp SET player_id = a.player_id FROM armies a WHERE mp.army_id = a.id;
--> statement-breakpoint

-- Step 4: Delete orphan participants whose army had no player assigned.
-- Expected data loss: match_participants linked to unassigned armies cannot be
-- attributed to any player and are intentionally removed.
DELETE FROM match_participants WHERE player_id IS NULL;
--> statement-breakpoint

-- Step 5: Make player_id NOT NULL now that all rows are backfilled
ALTER TABLE "match_participants" ALTER COLUMN "player_id" SET NOT NULL;
--> statement-breakpoint

-- Step 6: Make army_id nullable
ALTER TABLE "match_participants" ALTER COLUMN "army_id" DROP NOT NULL;
--> statement-breakpoint

-- Step 7: Add new FKs
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_army_id_armies_id_fk" FOREIGN KEY ("army_id") REFERENCES "public"."armies"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Step 8: Create new indexes
CREATE UNIQUE INDEX "mp_match_player_unique" ON "match_participants" USING btree ("match_id","player_id");
--> statement-breakpoint
CREATE INDEX "idx_mp_player_id" ON "match_participants" USING btree ("player_id");
