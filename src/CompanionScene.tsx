import type { CompanionType } from './companion'

interface CompanionSceneProps {
  type: CompanionType
  stageIndex: number
  size?: 'small' | 'large'
  // True when nearby text already says what this is.
  decorative?: boolean
}

// How many of the little extras (blossoms, fruit, hearts...) show per stage.
const DECORATIONS_BY_STAGE = [0, 0, 0, 1, 2, 4]

export default function CompanionScene({
  type,
  stageIndex,
  size = 'large',
  decorative = false,
}: CompanionSceneProps) {
  const index = Math.max(0, Math.min(stageIndex, type.stages.length - 1))
  const stage = type.stages[index]
  const extras = type.decorations.slice(0, DECORATIONS_BY_STAGE[index])

  return (
    <div
      className={`companion-scene companion-scene-${size}`}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : `${type.name}: ${stage.name}`}
      aria-hidden={decorative ? true : undefined}
    >
      <span className="companion-glow" />
      <span
        className="companion-main"
        style={{ transform: `scale(${stage.scale})` }}
      >
        {stage.emoji}
      </span>
      {extras.map((emoji, position) => (
        <span
          key={`${emoji}-${position}`}
          className={`companion-extra companion-extra-${position}`}
        >
          {emoji}
        </span>
      ))}
    </div>
  )
}
