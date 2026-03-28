// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../src/lib/server-fns/add-units-to-army', () => ({
  addUnitsToArmyFn: vi.fn(),
}))
vi.mock('../../src/lib/owb-parser', () => ({
  parseOwbExport: vi.fn(),
}))
import { addUnitsToArmyFn } from '../../src/lib/server-fns/add-units-to-army'
import { parseOwbExport } from '../../src/lib/owb-parser'
const mockAddUnitsFn = addUnitsToArmyFn as ReturnType<typeof vi.fn>
const mockParseOwb = parseOwbExport as ReturnType<typeof vi.fn>

import { AddUnitsSheet } from '../../src/components/add-units-sheet'

function renderSheet(
  props: Partial<{
    armyId: string
    open: boolean
    onClose: () => void
    onSuccess: (n: number) => void
  }> = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const defaultProps = {
    armyId: 'army-1',
    open: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    ...props,
  }
  const result = render(
    <QueryClientProvider client={queryClient}>
      <AddUnitsSheet {...defaultProps} />
    </QueryClientProvider>,
  )
  return { ...result, ...defaultProps }
}

describe('AddUnitsSheet', () => {
  beforeEach(() => {
    mockAddUnitsFn.mockReset()
    mockParseOwb.mockReset()
  })

  it('submit with empty field → Zod error displayed, server fn NOT called', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByTestId('add-units-submit'))

    await waitFor(() =>
      expect(screen.getByText('Le texte OWB est requis')).toBeInTheDocument(),
    )
    expect(mockAddUnitsFn).not.toHaveBeenCalled()
  })

  it('submit with malformed OWB (parseOwbExport throws) → form-level error displayed', async () => {
    const user = userEvent.setup()
    mockParseOwb.mockImplementation(() => {
      throw new Error('Format OWB invalide')
    })
    renderSheet()

    await user.type(screen.getByTestId('add-units-textarea'), 'malformed text')
    await user.click(screen.getByTestId('add-units-submit'))

    await waitFor(() =>
      expect(screen.getByText('Format OWB invalide')).toBeInTheDocument(),
    )
    expect(mockAddUnitsFn).not.toHaveBeenCalled()
  })

  it('submit with 0 units parsed → form-level error', async () => {
    const user = userEvent.setup()
    mockParseOwb.mockReturnValue({ armyName: 'Test', faction: 'Empire', units: [] })
    renderSheet()

    await user.type(screen.getByTestId('add-units-textarea'), 'valid-looking text')
    await user.click(screen.getByTestId('add-units-submit'))

    await waitFor(() =>
      expect(
        screen.getByText('Aucune unité trouvée dans le texte collé'),
      ).toBeInTheDocument(),
    )
    expect(mockAddUnitsFn).not.toHaveBeenCalled()
  })

  it('submit with valid OWB → server fn called, onSuccess fires', async () => {
    const user = userEvent.setup()
    mockParseOwb.mockReturnValue({
      armyName: 'Test',
      faction: 'Empire',
      units: [{ name: 'Archers', type: 'Core' }],
    })
    mockAddUnitsFn.mockResolvedValueOnce({ success: true, data: { unitCount: 1 } })
    const { onSuccess } = renderSheet()

    await user.type(screen.getByTestId('add-units-textarea'), 'valid owb text')
    await user.click(screen.getByTestId('add-units-submit'))

    await waitFor(() =>
      expect(mockAddUnitsFn).toHaveBeenCalledWith({
        data: { armyId: 'army-1', units: [{ name: 'Archers', type: 'Core' }] },
      }),
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(1))
  })

  it('server fn throws → error message visible', async () => {
    const user = userEvent.setup()
    mockParseOwb.mockReturnValue({
      armyName: 'Test',
      faction: 'Empire',
      units: [{ name: 'Archers', type: 'Core' }],
    })
    mockAddUnitsFn.mockResolvedValueOnce({ success: false, error: { message: 'Erreur serveur' } })
    renderSheet()

    await user.type(screen.getByTestId('add-units-textarea'), 'valid owb text')
    await user.click(screen.getByTestId('add-units-submit'))

    await waitFor(() =>
      expect(screen.getByText('Erreur serveur')).toBeInTheDocument(),
    )
  })

  it('re-submit after error → error clears', async () => {
    const user = userEvent.setup()
    mockParseOwb.mockReturnValue({
      armyName: 'Test',
      faction: 'Empire',
      units: [{ name: 'Archers', type: 'Core' }],
    })
    mockAddUnitsFn.mockResolvedValueOnce({ success: false, error: { message: 'Erreur serveur' } })
    renderSheet()

    await user.type(screen.getByTestId('add-units-textarea'), 'valid owb text')
    await user.click(screen.getByTestId('add-units-submit'))

    await waitFor(() =>
      expect(screen.getByText('Erreur serveur')).toBeInTheDocument(),
    )

    // Second submit — never-resolving promise so we can check error clears
    mockAddUnitsFn.mockReturnValueOnce(new Promise(() => {}))

    await user.type(screen.getByTestId('add-units-textarea'), ' more text')
    await user.click(screen.getByTestId('add-units-submit'))

    await waitFor(() =>
      expect(screen.queryByText('Erreur serveur')).not.toBeInTheDocument(),
    )
  })

  it('button disabled during mutation.isPending', async () => {
    const user = userEvent.setup()
    mockParseOwb.mockReturnValue({
      armyName: 'Test',
      faction: 'Empire',
      units: [{ name: 'Archers', type: 'Core' }],
    })
    mockAddUnitsFn.mockReturnValueOnce(new Promise(() => {}))
    renderSheet()

    await user.type(screen.getByTestId('add-units-textarea'), 'valid owb text')
    await user.click(screen.getByTestId('add-units-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('add-units-submit')).toBeDisabled(),
    )
  })
})
