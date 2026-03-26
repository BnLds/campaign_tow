// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useCorrection } from '../use-correction'
import type { AdminQueries } from '../use-admin-queries'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function createWrapper() {
  const queryClient = createTestQueryClient()
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

function createMockQueries(): AdminQueries {
  const queryClient = createTestQueryClient()
  return {
    playersQuery: { data: [], isLoading: false, error: null } as any,
    armiesQuery: { data: [], isLoading: false, error: null } as any,
    matchesQuery: { data: [], isLoading: false, error: null } as any,
    queryClient,
  }
}

describe('useCorrection — cascading reset', () => {
  it('setCorrArmyId resets unitId, subProfileId, and stats', () => {
    const queries = createMockQueries()
    const { result } = renderHook(() => useCorrection(queries), { wrapper: createWrapper() })

    // Set initial values
    act(() => { result.current.actions.setCorrArmyId('army-1') })
    expect(result.current.state.corrArmyId).toBe('army-1')

    // Change army — should reset unit, subprofile, stats
    act(() => { result.current.actions.setCorrArmyId('army-2') })
    expect(result.current.state.corrArmyId).toBe('army-2')
    expect(result.current.state.corrUnitId).toBe('')
    expect(result.current.state.corrSubProfileId).toBe('')
    expect(result.current.state.corrStats).toEqual({ m: '', cc: '', ct: '', f: '', e: '', pv: '', i: '', a: '', cd: '' })
  })

  it('setCorrUnitId resets subProfileId and stats, preserves armyId', () => {
    const queries = createMockQueries()
    const { result } = renderHook(() => useCorrection(queries), { wrapper: createWrapper() })

    act(() => { result.current.actions.setCorrArmyId('army-1') })
    act(() => { result.current.actions.setCorrUnitId('unit-1') })
    expect(result.current.state.corrUnitId).toBe('unit-1')

    // Change unit — should reset subprofile and stats, preserve army
    act(() => { result.current.actions.setCorrUnitId('unit-2') })
    expect(result.current.state.corrArmyId).toBe('army-1')
    expect(result.current.state.corrUnitId).toBe('unit-2')
    expect(result.current.state.corrSubProfileId).toBe('')
    expect(result.current.state.corrStats).toEqual({ m: '', cc: '', ct: '', f: '', e: '', pv: '', i: '', a: '', cd: '' })
  })

  it('setCorrSubProfileId updates subProfileId, preserves armyId and unitId', () => {
    const queries = createMockQueries()
    const { result } = renderHook(() => useCorrection(queries), { wrapper: createWrapper() })

    act(() => { result.current.actions.setCorrArmyId('army-1') })
    act(() => { result.current.actions.setCorrUnitId('unit-1') })
    act(() => { result.current.actions.setCorrSubProfileId('sp-1') })

    expect(result.current.state.corrArmyId).toBe('army-1')
    expect(result.current.state.corrUnitId).toBe('unit-1')
    expect(result.current.state.corrSubProfileId).toBe('sp-1')
  })
})
