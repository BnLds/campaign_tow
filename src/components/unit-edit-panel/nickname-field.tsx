// Campaign TOW — NicknameField: blur-save nickname editing for UnitEditPanel

import { useEffect, useState } from 'react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { updateNicknameFn } from '../../server-fns/unit-mutations'
import { useFeedback, FeedbackMsg } from './use-feedback'
import { useUnitMutation } from './use-unit-mutation'

interface NicknameFieldProps {
  armyId: string
  unitId: string
  unitNickname: string | null
  onMutationSuccess: () => Promise<void>
}

export function NicknameField({ armyId, unitId, unitNickname, onMutationSuccess }: NicknameFieldProps) {
  const [nicknameInput, setNicknameInput] = useState(unitNickname ?? '')
  const nicknameFeedback = useFeedback()
  const { mutate, isPending } = useUnitMutation(nicknameFeedback, onMutationSuccess)

  useEffect(() => {
    setNicknameInput(unitNickname ?? '')
  }, [unitNickname])

  async function handleNicknameBlur() {
    if (isPending) return
    const trimmed = nicknameInput.trim()
    const newVal = trimmed === '' ? null : trimmed
    if (newVal === (unitNickname ?? null)) return
    await mutate(
      () => updateNicknameFn({ data: { armyId, unitId, nickname: newVal } }),
      { successMsg: 'Surnom enregistré' },
    )
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
