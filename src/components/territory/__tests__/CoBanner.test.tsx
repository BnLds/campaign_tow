// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CoBanner } from '../CoBanner'

describe('CoBanner', () => {
  it('[1.5-UI-001][P1] renders balance formatted with fr-FR locale', () => {
    render(<CoBanner coBalance={1234} factionDisplayName="Bretonniens" />)
    expect(screen.getByText(/1\s*234\s*CO/)).toBeInTheDocument()
  })

  it('[1.5-UI-002][P1] balance node has aria-live="polite"', () => {
    render(<CoBanner coBalance={1234} factionDisplayName="Bretonniens" />)
    expect(screen.getByText(/1\s*234\s*CO/).closest('[aria-live]')).toHaveAttribute('aria-live', 'polite')
  })

  it('[1.5-UI-003][P1] renders faction display name', () => {
    render(<CoBanner coBalance={0} factionDisplayName="Bretonniens" />)
    expect(screen.getByText('Bretonniens')).toBeInTheDocument()
  })

  it('[1.5-UI-004][P2] renders pulsing dot with aria-hidden when isFetching=true', () => {
    const { container } = render(<CoBanner coBalance={0} factionDisplayName="Bretonniens" isFetching={true} />)
    expect(container.querySelector('[aria-hidden].animate-pulse')).not.toBeNull()
  })
})
