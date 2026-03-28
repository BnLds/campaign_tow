// Campaign TOW — PostMatchWizard orchestrator (JSX router)

import type { PostMatchWizardProps } from './types'
import { usePostMatchWizard } from './use-post-match-wizard'
import { WizardEmpty } from './wizard-empty'
import { PhaseXp } from './phase-xp'
import { PhaseConsequences } from './phase-consequences'
import { PhaseTierUp } from './phase-tierup'

export type { PostMatchWizardProps }

export function PostMatchWizard(props: PostMatchWizardProps) {
  const result = usePostMatchWizard(props)

  switch (result.phase) {
    case 'empty':
      return <WizardEmpty {...result.props} />
    case 'xp': {
      const { key, ...xpProps } = result.props
      return (
        <>
          {result.completeError && (
            <p role="alert" style={{ color: '#b82c2c', marginBottom: '0.5rem' }}>{result.completeError}</p>
          )}
          <PhaseXp key={key} {...xpProps} />
        </>
      )
    }
    case 'consequences': {
      const { key, ...csqProps } = result.props
      return (
        <>
          {result.consequenceError && (
            <p role="alert" style={{ color: '#b82c2c', marginBottom: '0.5rem' }}>{result.consequenceError}</p>
          )}
          <PhaseConsequences key={key} {...csqProps} />
        </>
      )
    }
    case 'tierup': {
      const { key, ...tierUpProps } = result.props
      return (
        <>
          {result.completeError && (
            <p role="alert" style={{ color: '#b82c2c', marginBottom: '0.5rem' }}>{result.completeError}</p>
          )}
          <PhaseTierUp key={key} {...tierUpProps} />
        </>
      )
    }
    case 'complete':
      return null
  }
}
