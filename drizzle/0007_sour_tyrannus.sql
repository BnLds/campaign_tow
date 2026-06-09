CREATE TABLE "player_territories" (
	"id" text PRIMARY KEY NOT NULL,
	"player_id" text NOT NULL,
	"co_balance" integer DEFAULT 0 NOT NULL,
	"last_income_week" integer DEFAULT 0 NOT NULL,
	"setup_completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_territories" ADD CONSTRAINT "player_territories_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_territories_player_id_unique" ON "player_territories" USING btree ("player_id");