CREATE TYPE "public"."terrain_type" AS ENUM('port', 'plaines', 'plaine_agricole', 'lisiere_forestiere', 'montagnes', 'foret', 'plaine_fluviale', 'marais');--> statement-breakpoint
CREATE TABLE "tiles" (
	"id" text PRIMARY KEY NOT NULL,
	"player_territory_id" text NOT NULL,
	"terrain_type" "terrain_type" NOT NULL,
	"name" text,
	"river_adjacent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tiles_river_adjacent_only_on_plaine_fluviale" CHECK ("tiles"."river_adjacent" = false OR "tiles"."terrain_type" = 'plaine_fluviale')
);
--> statement-breakpoint
ALTER TABLE "tiles" ADD CONSTRAINT "tiles_player_territory_id_player_territories_id_fk" FOREIGN KEY ("player_territory_id") REFERENCES "public"."player_territories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tiles_player_territory_id" ON "tiles" USING btree ("player_territory_id");