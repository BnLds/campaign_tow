// Campaign TOW — SubProfilesSection: mount toggle switches for UnitEditPanel

import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { toggleMountFn } from '../../server-fns/unit-mutations'
import { useFeedback, FeedbackMsg } from './use-feedback'
import type { SubProfileItem } from './types'

interface SubProfilesSectionProps {
  armyId: string
  subProfiles: SubProfileItem[]
}

export function SubProfilesSection({ armyId, subProfiles }: SubProfilesSectionProps) {
  const mountFeedback = useFeedback()
  const router = useRouter()

  const { mutate, isPending } = useMutation({
    mutationFn: (params: { subProfileId: string; isMount: boolean }) =>
      toggleMountFn({ data: { armyId, subProfileId: params.subProfileId, isMount: params.isMount } }),
    onSuccess: (result) => {
      if (result.success) {
        mountFeedback.show('Monture mise à jour', false)
        void router.invalidate({ filter: (d) => d.routeId === '/armies/$armyId' })
      } else {
        mountFeedback.show(result.error.message, true)
      }
    },
    onError: () => {
      mountFeedback.show('Erreur réseau', true)
    },
  })

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
                onCheckedChange={(checked) => {
                  mutate({ subProfileId: sp.id, isMount: checked })
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
