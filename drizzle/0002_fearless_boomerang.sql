CREATE TABLE "match_unit_selections" (
	"id" text PRIMARY KEY NOT NULL,
	"match_participant_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_unit_selections_match_participant_id_unit_id_unique" UNIQUE("match_participant_id","unit_id")
);
--> statement-breakpoint
ALTER TABLE "match_participants" ADD COLUMN "unit_selection_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "match_unit_selections" ADD CONSTRAINT "match_unit_selections_match_participant_id_match_participants_id_fk" FOREIGN KEY ("match_participant_id") REFERENCES "public"."match_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_unit_selections" ADD CONSTRAINT "match_unit_selections_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;