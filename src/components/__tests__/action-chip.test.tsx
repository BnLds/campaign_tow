// src/components/__tests__/action-chip.test.tsx
// Story 3.2: Match Creation & Pending Actions
// Status: RED — written before implementation (TDD)
//
// Static file-contract tests for the ActionChip component.
// Follows the pattern established in src/components/__tests__/army-list-item.test.tsx.
//
// Covers Tasks 8.3, 8.4 (AC: 5)
// All tests will fail until the implementation is complete.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../..')

function getActionChip() {
  return readFileSync(resolve(root, 'src/components/action-chip.tsx'), 'utf-8')
}

// ---------------------------------------------------------------------------
// AC5 — File exists and exports ActionChip (Task 6.1)
// ---------------------------------------------------------------------------

describe('[AC5][P0] ActionChip — component file exists and exports', () => {
  it('[3.2-ACP-001] src/components/action-chip.tsx file exists', () => {
    // AC: 5
    expect(existsSync(resolve(root, 'src/components/action-chip.tsx'))).toBe(true)
  })

  it('[3.2-ACP-002] action-chip.tsx exports ActionChip as named export', () => {
    // AC: 5
    const code = getActionChip()
    expect(code).toMatch(/export function ActionChip/)
  })
})

// ---------------------------------------------------------------------------
// AC5 — Props interface (Task 6.1)
// Test 8.3, 8.4
// ---------------------------------------------------------------------------

describe('[AC5][P0] ActionChip — props interface (Task 6.1)', () => {
  it('[3.2-ACP-003] ActionChip accepts label prop (string)', () => {
    // AC: 5
    const code = getActionChip()
    expect(code).toMatch(/label[\s]*:[\s]*string/)
  })

  it('[3.2-ACP-004] ActionChip accepts optional href prop (string)', () => {
    // AC: 5 — Test 8.4
    const code = getActionChip()
    expect(code).toMatch(/href[\s]*\?[\s]*:[\s]*string|href[\s]*:[\s]*(string \| undefined|string\?)/)
  })

  it('[3.2-ACP-005] ActionChip accepts optional onClick prop (callback)', () => {
    // AC: 5
    const code = getActionChip()
    expect(code).toMatch(/onClick[\s]*\?[\s]*:[\s]*((\(\)[\s]*=>|function))/)
  })
})

// ---------------------------------------------------------------------------
// AC5 — Styling: blue pill shape, correct colors (Task 6.1, 8.3)
// Test 8.3
// ---------------------------------------------------------------------------

describe('[AC5][P0] ActionChip — styling (Task 6.1, 8.3)', () => {
  it('[3.2-ACP-006] ActionChip has background color #eef4ff (blue tint) — Test 8.3', () => {
    // AC: 5 — Test 8.3
    const code = getActionChip()
    expect(code).toContain('#eef4ff')
  })

  it('[3.2-ACP-007] ActionChip has border 1px solid #d7e1ef', () => {
    // AC: 5 — Test 8.3
    const code = getActionChip()
    expect(code).toContain('#d7e1ef')
  })

  it('[3.2-ACP-008] ActionChip has border-radius 999px (pill shape) — Test 8.3', () => {
    // AC: 5 — Test 8.3
    const code = getActionChip()
    expect(code).toMatch(/borderRadius.*999|border-radius.*999/)
  })

  it('[3.2-ACP-009] ActionChip has color #334155 (navy text)', () => {
    // AC: 5 — Test 8.3
    const code = getActionChip()
    expect(code).toContain('#334155')
  })

  it('[3.2-ACP-010] ActionChip has padding 8px 12px', () => {
    // AC: 5 — Test 8.3
    const code = getActionChip()
    expect(code).toMatch(/padding.*8.*12|8px 12px/)
  })

  it('[3.2-ACP-011] ActionChip has font-size 11px', () => {
    // AC: 5 — Test 8.3
    const code = getActionChip()
    expect(code).toMatch(/fontSize.*11|font-size.*11/)
  })

  it('[3.2-ACP-012] ActionChip has font-weight 700 (bold)', () => {
    // AC: 5 — Test 8.3
    const code = getActionChip()
    expect(code).toMatch(/fontWeight.*700|font-weight.*700/)
  })

  it('[3.2-ACP-013] ActionChip has white-space: nowrap (no wrapping)', () => {
    // AC: 5 — Test 8.3
    const code = getActionChip()
    expect(code).toMatch(/whiteSpace.*nowrap|white-space.*nowrap/)
  })

  it('[3.2-ACP-014] ActionChip has box-shadow for elevation', () => {
    // AC: 5
    const code = getActionChip()
    expect(code).toMatch(/boxShadow|box-shadow/)
  })

  it('[3.2-ACP-015] ActionChip has cursor: pointer (interactive)', () => {
    // AC: 5
    const code = getActionChip()
    expect(code).toMatch(/cursor.*pointer/)
  })
})

// ---------------------------------------------------------------------------
// AC5 — Chevron appended after label (Task 6.2, 8.3)
// Test 8.3
// ---------------------------------------------------------------------------

describe('[AC5][P0] ActionChip — chevron after label (Task 6.2, 8.3)', () => {
  it('[3.2-ACP-016] ActionChip renders label text', () => {
    // AC: 5 — Test 8.3
    const code = getActionChip()
    expect(code).toMatch(/\{label\}/)
  })

  it('[3.2-ACP-017] ActionChip appends a chevron ">" after the label (Task 6.2, 8.3)', () => {
    // AC: 5 — Test 8.3
    const code = getActionChip()
    // Chevron: > or › character after label
    expect(code).toMatch(/[>›❯]/)
  })

  it('[3.2-ACP-018] Chevron has margin-left 6px and higher opacity/weight (Task 6.2)', () => {
    // AC: 5
    const code = getActionChip()
    expect(code).toMatch(/marginLeft.*6|margin-left.*6/)
  })
})

// ---------------------------------------------------------------------------
// AC5 — Render as <a> when href provided, <button> otherwise (Task 6.3, 8.4)
// Test 8.4
// ---------------------------------------------------------------------------

describe('[AC5][P0] ActionChip — renders as <a> or <button> based on href (Task 6.3, 8.4)', () => {
  it('[3.2-ACP-019] ActionChip renders as <a> when href is provided — Test 8.4', () => {
    // AC: 5 — Test 8.4
    const code = getActionChip()
    // Must include an <a> element or href-based render branch
    expect(code).toMatch(/href[\s\S]{0,400}(<a|return.*<a)/)
  })

  it('[3.2-ACP-020] ActionChip renders as <button> when href is not provided — Test 8.4', () => {
    // AC: 5 — Test 8.4
    const code = getActionChip()
    expect(code).toMatch(/<button/)
  })

  it('[3.2-ACP-021] ActionChip button has role="button" when rendered as button (Task 6.3)', () => {
    // AC: 5 — Test 8.4
    const code = getActionChip()
    expect(code).toMatch(/role=["']button["']/)
  })

  it('[3.2-ACP-022] ActionChip has data-testid="action-chip" (Task 6.3)', () => {
    // AC: 5
    const code = getActionChip()
    expect(code).toContain('data-testid="action-chip"')
  })
})
