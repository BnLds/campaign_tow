# Deferred Work

## Deferred from: code review of 1-1-db-migration-factions-table-and-backfill-armies-faction-fk (2026-04-21)

- No down/rollback migration — pre-existing pattern across all files in `drizzle/`. No migration has a documented down script; revisit when deploy tooling/ops flow matures.
- `CanonicalFactionId` type exported from `src/db/seeds/factions.ts` but unused in this story — Story 1.2 is the declared consumer per spec Task 1.
- `ON DELETE RESTRICT` runtime behavior not exercised by a behavioral test — covered by drizzle snapshot; a real delete-is-rejected test becomes more valuable once Story 1.2 introduces faction admin flows.
- `[1.1-MIG-003]` couples only the faction `id` (not `name`/`displayName`) at the migration-SQL layer — compensated by `[1.1-FAC-005]` (docs-parity drift check) and `[1.1-SEED-003]` (live DB check for `chaos-dwarfs → 'Nains du Chaos'`).
