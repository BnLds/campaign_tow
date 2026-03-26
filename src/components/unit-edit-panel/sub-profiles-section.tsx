// Campaign TOW — SubProfilesSection: mount toggle switches for UnitEditPanel

import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { toggleMountFn } from '../../server-fns/unit-mutations'
import { useFeedback, FeedbackMsg } from './use-feedback'
import { useUnitMutation } from './use-unit-mutation'
import type { SubProfileItem } from './types'

interface SubProfilesSectionProps {
  armyId: string
  subProfiles: SubProfileItem[]
  onMutationSuccess: () => Promise<void>
}

export function SubProfilesSection({ armyId, subProfiles, onMutationSuccess }: SubProfilesSectionProps) {
  const mountFeedback = useFeedback()
  const { mutate, isPending } = useUnitMutation(mountFeedback, onMutationSuccess)

  if (!(subProfiles.length >= 2)) return null

  return (
    <section data-testid="section-sub-profiles" className="mb-6">
      <h4 className="font-[family-name:var(--font-body)] font-bold text-xs uppercase tracking-wider text-[var(--color-section-label)] mb-3">
        Sous-profils
      </h4>
      <ul className="list-none p-0">
        {subProfiles.map((sp) => (
          <li
            key={sp.id}
            className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-[var(--color-separator)]"
          >
            <span className="text-[var(--color-text-primary)]">{sp.label}</span>
            <div className="flex items-center gap-2">
              <Label
                htmlFor={`mount-${sp.id}`}
                className="text-xs text-[var(--color-text-secondary)] cursor-pointer"
              >
                Monture
              </Label>
              <Switch
                id={`mount-${sp.id}`}
                checked={sp.isMount}
                disabled={isPending}
                onCheckedChange={async (checked) => {
                  await mutate(
                    () => toggleMountFn({ data: { armyId, subProfileId: sp.id, isMount: checked } }),
                    { successMsg: 'Monture mise à jour' },
                  )
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <FeedbackMsg message={mountFeedback.message} />
    </section>
  )
}
