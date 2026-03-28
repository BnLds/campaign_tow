// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../src/lib/server-fns/player-import-army', () => ({
  playerImportArmyFn: vi.fn(),
}))
import { playerImportArmyFn } from '../../src/lib/server-fns/player-import-army'
const mockImportFn = playerImportArmyFn as ReturnType<typeof vi.fn>

import { ArmyImportForm } from '../../src/components/army-import-form'

function renderForm(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <ArmyImportForm onSuccess={onSuccess} />
    </QueryClientProvider>
  )
  return { ...result, onSuccess }
}

describe('ArmyImportForm', () => {
  beforeEach(() => {
    mockImportFn.mockReset()
  })

  it('submit with empty field → button disabled, server fn NOT called', async () => {
    renderForm()

    expect(screen.getByTestId('player-owb-import-submit')).toBeDisabled()
    expect(mockImportFn).not.toHaveBeenCalled()
  })

  it('submit with valid text → server fn called with trimmed text, success message, form reset', async () => {
    const user = userEvent.setup()
    mockImportFn.mockResolvedValueOnce({
      success: true,
      data: { armyId: 'a1', armyName: 'Mon Armée', faction: 'Empire', unitCount: 5 },
    })
    renderForm()

    await user.type(screen.getByTestId('player-owb-import-textarea'), 'some valid text')
    await user.click(screen.getByTestId('player-owb-import-submit'))

    await waitFor(() =>
      expect(mockImportFn).toHaveBeenCalledWith({ data: { rawText: 'some valid text' } })
    )
    await waitFor(() =>
      expect(screen.getByText(/Mon Armée.*Empire.*5 unités/)).toBeInTheDocument()
    )
    expect(screen.getByTestId('player-owb-import-textarea')).toHaveValue('')
  })

  it('server fn throws → error message visible', async () => {
    const user = userEvent.setup()
    mockImportFn.mockResolvedValueOnce({
      success: false,
      error: { message: 'Armée invalide' },
    })
    renderForm()

    await user.type(screen.getByTestId('player-owb-import-textarea'), 'some text')
    await user.click(screen.getByTestId('player-owb-import-submit'))

    await waitFor(() =>
      expect(screen.getByText('Armée invalide')).toBeInTheDocument()
    )
  })

  it('re-submit after success → success message clears when submit starts', async () => {
    const user = userEvent.setup()
    mockImportFn.mockResolvedValueOnce({
      success: true,
      data: { armyId: 'a1', armyName: 'Mon Armée', faction: 'Empire', unitCount: 5 },
    })
    renderForm()

    await user.type(screen.getByTestId('player-owb-import-textarea'), 'first text')
    await user.click(screen.getByTestId('player-owb-import-submit'))

    await waitFor(() =>
      expect(screen.getByText(/Mon Armée.*Empire.*5 unités/)).toBeInTheDocument()
    )

    mockImportFn.mockReturnValueOnce(new Promise(() => {}))

    await user.type(screen.getByTestId('player-owb-import-textarea'), 'second text')
    await user.click(screen.getByTestId('player-owb-import-submit'))

    await waitFor(() =>
      expect(screen.queryByText(/Mon Armée.*Empire.*5 unités/)).not.toBeInTheDocument()
    )
  })

  it('button disabled during mutation.isPending', async () => {
    const user = userEvent.setup()
    mockImportFn.mockReturnValueOnce(new Promise(() => {}))
    renderForm()

    await user.type(screen.getByTestId('player-owb-import-textarea'), 'some text')
    await user.click(screen.getByTestId('player-owb-import-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('player-owb-import-submit')).toBeDisabled()
    )
  })
})
