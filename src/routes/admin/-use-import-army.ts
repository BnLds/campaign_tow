import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { importArmyFn } from '#/server-fns/admin-armies'
import type { AdminQueries } from './-use-admin-queries'
import type { ResultMessage } from './-admin-helpers'

export interface ImportArmyState { owbText: string; importResult: ResultMessage }
export interface ImportArmyActions { handleImport: () => void; setOwbText: (v: string) => void }
export interface ImportArmyApi { state: ImportArmyState; actions: ImportArmyActions; isPending: boolean; error: Error | null }

export function useImportArmy(queries: AdminQueries): ImportArmyApi {
  const [owbText, setOwbText] = useState('')
  const [importResult, setImportResult] = useState<ResultMessage>(null)

  const mutation = useMutation({
    mutationFn: async (rawText: string) => {
      const result = await importArmyFn({ data: { rawText } })
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: async (data) => {
      setImportResult({
        success: true,
        message: `Armée "${data.armyName}" importée — ${data.unitCount} unité${data.unitCount > 1 ? 's' : ''}`,
      })
      setOwbText('')
      await queries.queryClient.invalidateQueries({ queryKey: ['admin', 'armies'] })
    },
  })

  const handleImport = () => {
    setImportResult(null)
    mutation.mutate(owbText)
  }

  return {
    state: { owbText, importResult },
    actions: { handleImport, setOwbText },
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
