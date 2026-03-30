CREATE TYPE "public"."match_result" AS ENUM('victory', 'defeat', 'draw');--> statement-breakpoint
CREATE TYPE "public"."match_type" AS ENUM('standard', 'initial_setup');--> statement-breakpoint
CREATE TYPE "public"."unit_gain_type" AS ENUM('tier_up', 'honour_champion', 'honour_banner', 'death', 'haine', 'pertes_catastrophiques', 'deroute_sanglante', 'banner_lost');--> statement-breakpoint
CREATE TYPE "public"."unit_status" AS ENUM('active', 'graveyard');--> statement-breakpoint
CREATE TABLE "armies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"faction" text NOT NULL,
	"player_id" text,
	"initial_xp_completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"match_id" text NOT NULL,
	"player_id" text NOT NULL,
	"army_id" text,
	"result" "match_result",
	"evolutions_entered_at" timestamp,
	"bonus_xp" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_xp_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"match_participant_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"xp_gained" integer NOT NULL,
	"deroute_xp_lost" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "mxe_xp_gained_non_negative" CHECK ("match_xp_entries"."xp_gained" >= 0),
	CONSTRAINT "mxe_deroute_xp_lost_non_negative" CHECK ("match_xp_entries"."deroute_xp_lost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"match_type" "match_type" DEFAULT 'standard' NOT NULL,
	"created_by_player_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_guest" boolean DEFAULT false NOT NULL,
	"invite_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "players_username_unique" UNIQUE("username"),
	CONSTRAINT "players_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"player_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stat_modifiers" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"stat" text NOT NULL,
	"delta" integer NOT NULL,
	"source" text NOT NULL,
	"temporary" boolean DEFAULT false NOT NULL,
	"cleared" boolean DEFAULT false NOT NULL,
	"match_participant_id" text
);
--> statement-breakpoint
CREATE TABLE "sub_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"label" text NOT NULL,
	"m" text,
	"cc" text,
	"ct" text,
	"f" text,
	"e" text,
	"pv" text,
	"i" text,
	"a" text,
	"cd" text,
	"is_mount" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_gains" (
	"id" text PRIMARY KEY NOT NULL,
	"unit_id" text NOT NULL,
	"description" text NOT NULL,
	"type" "unit_gain_type" DEFAULT 'tier_up' NOT NULL,
	"cleared" boolean DEFAULT false NOT NULL,
	"match_participant_id" text,
	"threshold_xp" integer,
	"cleared_by_match_participant_id" text
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"army_id" text NOT NULL,
	"name" text NOT NULL,
	"nickname" text,
	"type" text NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"points" integer,
	"model_count" integer,
	"special_rules" text,
	"options" text,
	"status" "unit_status" DEFAULT 'active' NOT NULL,
	"graveyard_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "armies" ADD CONSTRAINT "armies_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_army_id_armies_id_fk" FOREIGN KEY ("army_id") REFERENCES "public"."armies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_xp_entries" ADD CONSTRAINT "match_xp_entries_match_participant_id_match_participants_id_fk" FOREIGN KEY ("match_participant_id") REFERENCES "public"."match_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_xp_entries" ADD CONSTRAINT "match_xp_entries_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_player_id_players_id_fk" FOREIGN KEY ("created_by_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stat_modifiers" ADD CONSTRAINT "stat_modifiers_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stat_modifiers" ADD CONSTRAINT "stat_modifiers_match_participant_id_match_participants_id_fk" FOREIGN KEY ("match_participant_id") REFERENCES "public"."match_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_profiles" ADD CONSTRAINT "sub_profiles_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_gains" ADD CONSTRAINT "unit_gains_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_gains" ADD CONSTRAINT "unit_gains_match_participant_id_match_participants_id_fk" FOREIGN KEY ("match_participant_id") REFERENCES "public"."match_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_gains" ADD CONSTRAINT "unit_gains_cleared_by_match_participant_id_match_participants_id_fk" FOREIGN KEY ("cleared_by_match_participant_id") REFERENCES "public"."match_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_army_id_armies_id_fk" FOREIGN KEY ("army_id") REFERENCES "public"."armies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "armies_player_id_unique" ON "armies" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mp_match_player_unique" ON "match_participants" USING btree ("match_id","player_id");--> statement-breakpoint
CREATE INDEX "idx_mp_player_id" ON "match_participants" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "idx_mp_army_id" ON "match_participants" USING btree ("army_id");--> statement-breakpoint
CREATE INDEX "idx_mp_match_id" ON "match_participants" USING btree ("match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mxe_participant_unit_unique" ON "match_xp_entries" USING btree ("match_participant_id","unit_id");--> statement-breakpoint
CREATE INDEX "idx_matches_date" ON "matches" USING btree ("date");