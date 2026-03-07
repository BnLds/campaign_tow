# Epic 4: Post-Match Flow & XP Progression

Players can complete the post-match ritual — enter XP unit by unit, discover tier-ups, choose improvements, record character injuries and bonuses. Retroactive entry is supported. This is the core value loop of the app.

## Story 4.1: Post-Match Flow — XP Entry per Unit & Character

As a player,
I want to launch the post-match flow and enter XP gained for each unit and character,
So that my army's progression is recorded after every game.

**Acceptance Criteria:**

**Given** a match exists involving my army and I have not yet entered my evolutions,
**When** I tap the corresponding ActionChip or access the match from the timeline,
**Then** the PostMatchWizard launches and presents my units one by one in sequence (FR21)

**Given** the wizard is on a unit step,
**When** I enter the XP gained and confirm,
**Then** the XP is added to `units.xp` and the wizard advances to the next unit (FR22)

**Given** the wizard reaches a character,
**When** I enter the XP gained and confirm,
**Then** the XP is added to the character's `units.xp` and the wizard advances (FR23)

**Given** I have entered XP for all units and characters,
**When** the wizard completes,
**Then** all XP values are saved and the match is marked as evolutions-entered for my army

**Given** I want to enter evolutions retroactively for an older match,
**When** I access that match from the timeline,
**Then** the PostMatchWizard launches identically regardless of when the match took place (FR29)

---

## Story 4.2: Tier-Up Detection & Improvement Choice

As a player,
I want the app to detect when a unit or character crosses an XP tier and let me choose an improvement,
So that the tier-up moment becomes a satisfying in-app reward.

**Acceptance Criteria:**

**Given** I enter XP for a unit in the wizard,
**When** `calculateTier(newXp)` detects a tier crossing (Aguerri / Expérimenté / Vétéran),
**Then** the TierUpScreen appears showing the new tier and the list of available improvements for that tier (FR24, FR26)

**Given** the TierUpScreen is displayed for a unit,
**When** I select an improvement from the list,
**Then** the improvement is saved as a `unit_gains` entry (active: true, source: tier_up) and the wizard continues

**Given** I enter XP for a character in the wizard,
**When** `calculateTier(newXp)` detects a tier crossing,
**Then** the TierUpScreen appears with character-specific improvement options (FR25, FR27)

**Given** the TierUpScreen is displayed,
**When** I have not yet selected an improvement,
**Then** the wizard cannot advance — selection is mandatory before continuing

---

## Story 4.3: Character Injuries & Bonuses

As a player,
I want to record permanent injuries and bonuses for characters taken out of action during the match,
So that the lasting consequences of battle are preserved on the character's card.

**Acceptance Criteria:**

**Given** the wizard reaches a character step,
**When** I indicate the character was taken out of action,
**Then** I am prompted to enter a permanent injury or bonus (as noted on paper during the game) (FR28)

**Given** I enter an injury (e.g. -1 Endurance),
**When** I confirm,
**Then** a `stat_modifiers` entry is created (source: injury, temporary: false) and the character card displays the red delta

**Given** I enter a bonus (e.g. +1 Leadership),
**When** I confirm,
**Then** a `stat_modifiers` entry is created (source: injury_bonus, temporary: false) and the character card displays the green delta

**Given** the character was not taken out of action,
**When** I skip the injury prompt,
**Then** no entry is created and the wizard continues normally

---
