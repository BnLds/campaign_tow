CREATE TABLE "armies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"faction" text NOT NULL,
	"player_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"label" text NOT NULL,
	"m" text,
	"cc" text,
	"ct" text,
	"f" text,
	"e" text,
	"pv" text,
	"i" text,
	"a" text,
	"cd" text
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"army_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"points" integer,
	"model_count" integer,
	"special_rules" text,
	"options" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "armies" ADD CONSTRAINT "armies_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_profiles" ADD CONSTRAINT "sub_profiles_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_army_id_armies_id_fk" FOREIGN KEY ("army_id") REFERENCES "public"."armies"("id") ON DELETE cascade ON UPDATE no action;