// Campaign TOW — NicknameField: blur-save nickname editing for UnitEditPanel

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { updateNicknameFn } from '../../server-fns/unit-mutations'
import { useFeedback, FeedbackMsg } from './use-feedback'

interface NicknameFieldProps {
  armyId: string
  unitId: string
  unitNickname: string | null
}

export function NicknameField({ armyId, unitId, unitNickname }: NicknameFieldProps) {
  const [nicknameInput, setNicknameInput] = useState(unitNickname ?? '')
  const nicknameFeedback = useFeedback()
  const router = useRouter()

  const { mutate, isPending } = useMutation({
    mutationFn: (nickname: string | null) => updateNicknameFn({ data: { armyId, unitId, nickname } }),
    onSuccess: (result) => {
      if (result.success) {
        nicknameFeedback.show('Surnom enregistré', false)
        void router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
      } else {
        nicknameFeedback.show(result.error.message, true)
      }
    },
    onError: () => {
      nicknameFeedback.show('Erreur réseau', true)
    },
  })

  useEffect(() => {
    setNicknameInput(unitNickname ?? '')
  }, [unitNickname])

  function handleNicknameBlur() {
    if (isPending) return
    const trimmed = nicknameInput.trim()
    const newVal = trimmed === '' ? null : trimmed
    if (newVal === (unitNickname ?? null)) return
    mutate(newVal)
  }

  return (
    <div className="mb-4">
      <Label htmlFor={`nickname-${unitId}`} className="text-xs">Surnom</Label>
      <Input
        id={`nickname-${unitId}`}
        value={nicknameInput}
        onChange={(e) => setNicknameInput(e.target.value)}
        onBlur={handleNicknameBlur}
        disabled={isPending}
        maxLength={80}
        placeholder="Aucun surnom"
        className="mt-1"
      />
      <FeedbackMsg message={nicknameFeedback.message} />
    </div>
  )
}
