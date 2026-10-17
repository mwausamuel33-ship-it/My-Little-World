import { useState } from 'react'
import CompanionScene from './CompanionScene'
import {
  COMPANIONS,
  DAILY_CAP,
  MAX_NAME_LENGTH,
  SUNLIGHT,
  findCompanion,
  type CompanionKind,
  type CompanionType,
} from './companion'
import { useCompanion } from './useCompanion'
import './Companion.css'

const GROUPS: { kind: CompanionKind; title: string }[] = [
  { kind: 'tree', title: 'Trees' },
  { kind: 'pet', title: 'Pets' },
]

export default function GrowthGarden() {
  const { choice, progress, failed, choose } = useCompanion()
  const [picking, setPicking] = useState(choice === null)
  const [draftId, setDraftId] = useState(choice?.typeId ?? '')
  const [draftName, setDraftName] = useState(choice?.name ?? '')
  const [error, setError] = useState('')

  const current = choice ? findCompanion(choice.typeId) : undefined

  function confirmChoice() {
    if (!findCompanion(draftId)) return

    if (!choose({ typeId: draftId, name: draftName })) {
      setError('Your choice could not be saved in this browser. Please try again.')
      return
    }

    setError('')
    setPicking(false)
  }

  function startChanging() {
    setDraftId(choice?.typeId ?? '')
    setDraftName(choice?.name ?? '')
    setError('')
    setPicking(true)
  }

  function renderPicker() {
    const selected = findCompanion(draftId)

    return (
      <div className="companion-picker">
        <p className="companion-intro">
          {choice
            ? 'Pick a new look. Everything it has grown so far stays with you.'
            : 'Pick a tree or a pet. It grows a little every time you write, check in or make something.'}
        </p>

        {GROUPS.map((group) => (
          <div key={group.kind}>
            <h2 className="companion-group-title">{group.title}</h2>
            <div className="companion-options">
              {COMPANIONS.filter((option) => option.kind === group.kind).map(
                (option) => (
                  <button
                    type="button"
                    key={option.id}
                    className={`companion-option${draftId === option.id ? ' selected' : ''}`}
                    aria-pressed={draftId === option.id}
                    onClick={() => setDraftId(option.id)}
                  >
                    <CompanionScene
                      type={option}
                      stageIndex={5}
                      size="small"
                      decorative
                    />
                    <strong>{option.name}</strong>
                    <span>{option.blurb}</span>
                  </button>
                ),
              )}
            </div>
          </div>
        ))}

        <label className="editor-label" htmlFor="companion-name">
          Give it a name (optional)
        </label>
        <input
          id="companion-name"
          className="journal-title-input"
          value={draftName}
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder={selected?.name ?? 'A little name…'}
        />

        {error && (
          <p className="save-error" role="alert">
            {error}
          </p>
        )}

        <div className="editor-actions">
          <button
            type="button"
            className="primary-button"
            disabled={!selected}
            onClick={confirmChoice}
          >
            {selected?.kind === 'pet' ? 'Welcome it home 🐾' : 'Plant it 🌱'}
          </button>
          {choice && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => setPicking(false)}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    )
  }

  function renderGarden(type: CompanionType, displayName: string) {
    if (failed) {
      return (
        <p className="empty-state" role="alert">
          Could not check how {displayName} is doing. Please refresh the page.
        </p>
      )
    }

    if (!progress) {
      return <p className="empty-state">Checking on {displayName}… 🌷</p>
    }

    const stage = type.stages[progress.stageIndex]
    const nextStage = type.stages[progress.stageIndex + 1]
    const percent = Math.round(progress.stageShare * 100)
    const activeThisWeek = progress.week.filter((day) => day.active).length

    return (
      <div className="companion-garden">
        <CompanionScene type={type} stageIndex={progress.stageIndex} />

        <h2 className="companion-name">{displayName}</h2>
        <p className="companion-stage">{stage.name}</p>

        <div
          className="companion-progress"
          role="progressbar"
          aria-label={`Growth towards the next stage`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="companion-hint">
          {nextStage && progress.pointsToNext !== null
            ? `${progress.pointsToNext} more sunlight until ${nextStage.name}`
            : 'Fully grown! Keep writing and it will keep glowing ✨'}
        </p>

        <div className="companion-stats">
          <div className="companion-stat">
            <strong>{progress.points}</strong>
            <span>sunlight collected</span>
          </div>
          <div className="companion-stat">
            <strong>{progress.daysThisMonth}</strong>
            <span>days you showed up this month</span>
          </div>
          <div className="companion-stat">
            <strong>{progress.streak}</strong>
            <span>day gentle streak</span>
          </div>
        </div>

        <ul
          className="companion-week"
          aria-label={`You showed up on ${activeThisWeek} of the last 7 days`}
        >
          {progress.week.map((day) => (
            <li
              key={day.key}
              className={`${day.active ? 'active' : ''}${day.isToday ? ' today' : ''}`}
            >
              <span className="companion-dot" aria-hidden="true">
                {day.active ? '✿' : '·'}
              </span>
              <small>{day.label}</small>
            </li>
          ))}
        </ul>

        <details className="companion-how">
          <summary>How does it grow?</summary>
          <p>
            Every journal you write gives {SUNLIGHT.entry} sunlight, every
            scrapbook page {SUNLIGHT.scrapbookPage}, and every mood check-in{' '}
            {SUNLIGHT.mood}, up to {DAILY_CAP} a day. It never withers or
            goes backwards, so rest whenever you need to. Your gentle streak
            forgives one rest day, so a single missed day never resets it.
          </p>
        </details>

        <button
          type="button"
          className="secondary-button"
          onClick={startChanging}
        >
          Change my companion
        </button>
      </div>
    )
  }

  return (
    <section className="growth-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">A LITTLE FRIEND TO GROW WITH</p>
          <h1>Growth Garden 🌱</h1>
          <p>It grows a little every time you write, check in or make something.</p>
        </div>
      </header>

      {picking || !current || !choice
        ? renderPicker()
        : renderGarden(current, choice.name || current.name)}
    </section>
  )
}
