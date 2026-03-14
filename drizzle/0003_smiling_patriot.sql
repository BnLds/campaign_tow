CREATE TABLE "stat_modifiers" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"stat" text NOT NULL,
	"delta" integer NOT NULL,
	"source" text NOT NULL,
	"temporary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_gains" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"description" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stat_modifiers" ADD CONSTRAINT "stat_modifiers_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_gains" ADD CONSTRAINT "unit_gains_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;