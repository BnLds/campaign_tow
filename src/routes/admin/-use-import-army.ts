import { useState } from 'react'
import { importArmyFn } from '#/server-fns/admin-armies'
import type { AdminQueries } from './-use-admin-queries'
import type { ResultMessage } from './-admin-helpers'

export interface ImportArmyState { owbText: string; importResult: ResultMessage; importSubmitting: boolean }
export interface ImportArmyActions { handleImport: () => Promise<void>; setOwbText: (v: string) => void }
export interface ImportArmyApi { state: ImportArmyState; actions: ImportArmyActions }

export function useImportArmy(queries: AdminQueries): ImportArmyApi {
  const [owbText, setOwbText] = useState('')
  const [importResult, setImportResult] = useState<ResultMessage>(null)
  const [importSubmitting, setImportSubmitting] = useState(false)

  const handleImport = async () => {
    setImportResult(null)
    setImportSubmitting(true)
    try {
      const result = await importArmyFn({ data: { rawText: owbText } })
      if (result.success) {
        setImportResult({
          success: true,
          message: `Armée "${result.data.armyName}" importée — ${result.data.unitCount} unité${result.data.unitCount > 1 ? 's' : ''}`,
        })
        setOwbText('')
        await queries.queryClient.invalidateQueries({ queryKey: ['admin', 'armies'] })
      } else {
        setImportResult({ success: false, message: result.error.message })
      }
    } catch {
      setImportResult({ success: false, message: "Erreur réseau — veuillez réessayer" })
    } finally {
      setImportSubmitting(false)
    }
  }

  return {
    state: { owbText, importResult, importSubmitting },
    actions: { handleImport, setOwbText },
  }
}
