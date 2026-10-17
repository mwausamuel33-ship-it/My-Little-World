import CompanionScene from './CompanionScene'
import { findCompanion } from './companion'
import { useCompanion } from './useCompanion'
import './Companion.css'

interface CompanionCardProps {
  onOpen: () => void
}

// The small card on the Home page.
export default function CompanionCard({ onOpen }: CompanionCardProps) {
  const { choice, progress } = useCompanion()
  const type = choice ? findCompanion(choice.typeId) : undefined

  if (!choice || !type) {
    return (
      <section className="companion-card">
        <span className="companion-card-emoji" aria-hidden="true">
          🌱
        </span>
        <div className="companion-card-copy">
          <strong>Choose a little friend to grow with</strong>
          <span>
            A tree or a pet that grows as you write, check in and make things.
          </span>
        </div>
        <button type="button" className="primary-button" onClick={onOpen}>
          Choose
        </button>
      </section>
    )
  }

  const displayName = choice.name || type.name

  return (
    <section className="companion-card">
      {progress ? (
        <CompanionScene
          type={type}
          stageIndex={progress.stageIndex}
          size="small"
        />
      ) : (
        <span className="companion-card-emoji" aria-hidden="true">
          🌷
        </span>
      )}
      <div className="companion-card-copy">
        <strong>{displayName}</strong>
        <span>
          {progress
            ? type.stages[progress.stageIndex].name
            : 'Checking in…'}
        </span>
        {progress && (
          <div
            className="companion-progress companion-progress-small"
            role="progressbar"
            aria-label={`${displayName}'s growth`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress.stageShare * 100)}
          >
            <span style={{ width: `${Math.round(progress.stageShare * 100)}%` }} />
          </div>
        )}
      </div>
      <button type="button" className="secondary-button" onClick={onOpen}>
        Visit
      </button>
    </section>
  )
}
