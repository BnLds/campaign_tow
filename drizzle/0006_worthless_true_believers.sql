CREATE TABLE "match_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"army_id" text NOT NULL,
	"result" text,
	"evolutions_entered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"created_by_player_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_army_id_armies_id_fk" FOREIGN KEY ("army_id") REFERENCES "public"."armies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_player_id_players_id_fk" FOREIGN KEY ("created_by_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;