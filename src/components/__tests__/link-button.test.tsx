// @vitest-environment jsdom
// src/components/__tests__/link-button.test.tsx
// Tests for LinkButton component

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LinkButton } from '../link-button'

describe('LinkButton', () => {
  it('renders children', () => {
    render(<LinkButton>Cliquer ici</LinkButton>)
    expect(screen.getByText('Cliquer ici')).not.toBeNull()
  })

  it('passes data-testid prop to the button element', () => {
    render(<LinkButton data-testid="mon-lien">Texte</LinkButton>)
    expect(screen.getByTestId('mon-lien')).not.toBeNull()
  })

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(<LinkButton onClick={handleClick}>Cliquer</LinkButton>)
    fireEvent.click(screen.getByText('Cliquer'))
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('passes className to the button element', () => {
    render(<LinkButton className="ma-classe-custom">Texte</LinkButton>)
    const btn = screen.getByText('Texte')
    expect(btn.className).toContain('ma-classe-custom')
  })

  it('has type="button" (not submit)', () => {
    render(<LinkButton>Texte</LinkButton>)
    const btn = screen.getByText('Texte')
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('variant danger applies malus color classes', () => {
    render(<LinkButton variant="danger">Supprimer</LinkButton>)
    const btn = screen.getByText('Supprimer')
    expect(btn.className).toContain('text-cw-malus')
  })

  it('variant default applies secondary text color classes', () => {
    render(<LinkButton variant="default">Lien</LinkButton>)
    const btn = screen.getByText('Lien')
    expect(btn.className).toContain('text-cw-text-secondary')
  })

  it('default variant is "default" when no variant prop given', () => {
    render(<LinkButton>Lien</LinkButton>)
    const btn = screen.getByText('Lien')
    expect(btn.className).toContain('text-cw-text-secondary')
  })
})
