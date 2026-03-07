# Epic 5: Campaign Reference Tables

Any logged-in player can instantly consult campaign rules during a game: XP tables, 2D6 injury/destruction tables, and improvement lists per tier.

## Story 5.1: Campaign Reference Tables

As a player,
I want to consult all campaign reference tables from a dedicated section,
So that I can quickly look up rules during a game without leaving the app.

**Acceptance Criteria:**

**Given** I am logged in and navigate to the Références tab,
**When** the page loads,
**Then** I see all five reference sections: unit XP gain table, character XP gain table, permanent injuries table (2D6), unit destruction table (2D6), and improvements list per tier (FR30–FR34)

**Given** I view the unit XP gain table,
**When** the data is displayed,
**Then** it matches exactly the values defined in `lib/constants.ts` — single source of truth

**Given** I view the 2D6 tables (injuries or destructions),
**When** the data is displayed,
**Then** each row shows the 2D6 result and its corresponding outcome, rendered via the `RefTable` component

**Given** I view the improvements list per tier,
**When** the data is displayed,
**Then** improvements are grouped by tier (Aguerri / Expérimenté / Vétéran) for both units and characters

**Given** I am on any screen of the app,
**When** I tap the Références tab,
**Then** navigation takes less than 500ms and the page is immediately readable (NFR2)

*No database tables created — all data served from `lib/constants.ts` (static)*
