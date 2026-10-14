
import { useEffect, useState } from 'react'
import { db, type JournalEntry, type Mood, type MoodRecord } from './db'
import './MoodCalendar.css'

const moodOptions: {
  mood: Mood
  emoji: string
  description: string
}[] = [
  { mood: 'Happy', emoji: '😊', description: 'Feeling good' },
  { mood: 'Loved', emoji: '🥰', description: 'Heart feels full' },
  { mood: 'Peaceful', emoji: '😌', description: 'Feeling calm' },
  { mood: 'Sad', emoji: '😔', description: 'A heavy heart' },
  { mood: 'Anxious', emoji: '😰', description: 'Feeling worried' },
  { mood: 'Frustrated', emoji: '😤', description: 'Having a tough day' },
]

function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)

  return new Date(year, month - 1, day).toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function MoodCalendar() {
  const todayKey = getDateKey(new Date())

  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const [moods, setMoods] = useState<MoodRecord[]>([])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [selectedMood, setSelectedMood] = useState<Mood | ''>('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [savedMoods, savedEntries] = await Promise.all([
          db.moods.toArray(),
          db.entries.toArray(),
        ])

        setMoods(savedMoods)
        setEntries(savedEntries)
      } catch (error) {
        console.error('Could not load mood calendar:', error)
        setMessage('Could not load your memories. Please refresh and try again.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  useEffect(() => {
    const existing = moods.find((record) => record.dateKey === selectedDate)

    setSelectedMood(existing?.mood ?? '')
    setNote(existing?.note ?? '')
    setMessage('')
  }, [selectedDate, moods])

  const calendarDays = (() => {
    const year = visibleMonth.getFullYear()
    const month = visibleMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ]
  })()

  const monthLabel = visibleMonth.toLocaleDateString('en-KE', {
    month: 'long',
    year: 'numeric',
  })

  const selectedDayEntries = entries.filter(
    (entry) => entry.createdAt.slice(0, 10) === selectedDate,
  )

  async function saveMood() {
    if (!selectedMood) {
      setMessage('Choose a mood first, lovely. 🌷')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const existing = moods.find(
        (record) => record.dateKey === selectedDate,
      )
      const now = new Date().toISOString()

      const record: MoodRecord = {
        ...(existing?.id !== undefined ? { id: existing.id } : {}),
        dateKey: selectedDate,
        mood: selectedMood,
        note: note.trim(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }

      if (existing?.id !== undefined) {
        await db.moods.update(existing.id, {
          mood: record.mood,
          note: record.note,
          updatedAt: record.updatedAt,
        })
      } else {
        record.id = await db.moods.add(record)
      }

      setMoods((current) => [
        ...current.filter((item) => item.dateKey !== selectedDate),
        record,
      ])

      setMessage('Your mood has been saved. Be gentle with yourself. 💗')
    } catch (error) {
      console.error('Could not save mood:', error)
      setMessage('Your mood could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function changeMonth(amount: number) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    )
  }

  return (
    <section className="mood-page">
      <div className="mood-page-heading">
        <span className="eyebrow">CHECK IN WITH YOURSELF</span>
        <h2>Your feelings matter. 🌷</h2>
        <p>
          Every feeling has a place here. Take a breath and tell your little
          world how you're doing.
        </p>
      </div>

      <div className="mood-layout">
        <div className="mood-panel">
          <span className="eyebrow">YOUR DAILY CHECK-IN</span>
          <h3>How are you feeling?</h3>
          <p className="mood-date">{formatDateKey(selectedDate)}</p>

          <div className="mood-options">
            {moodOptions.map((option) => (
              <button
                type="button"
                key={option.mood}
                className={`mood-option ${
                  selectedMood === option.mood ? 'selected' : ''
                }`}
                onClick={() => {
                  setSelectedMood(option.mood)
                  setMessage('')
                }}
                aria-pressed={selectedMood === option.mood}
              >
                <span className="mood-emoji">{option.emoji}</span>
                <span className="mood-option-copy">
                  <strong>{option.mood}</strong>
                  <small>{option.description}</small>
                </span>
                {selectedMood === option.mood && (
                  <span className="mood-check">✓</span>
                )}
              </button>
            ))}
          </div>

          <label className="mood-note-label" htmlFor="mood-note">
            Anything on your mind? (optional)
          </label>
          <textarea
            id="mood-note"
            className="mood-note-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="You can write a little about why you feel this way..."
            rows={4}
          />

          <button
            className="primary-button mood-save-button"
            onClick={() => void saveMood()}
            disabled={saving || loading}
          >
            {saving ? 'Saving...' : 'Save my mood 💗'}
          </button>

          {message && (
            <p className="mood-feedback" role="status">
              {message}
            </p>
          )}
        </div>

        <div className="calendar-panel">
          <div className="calendar-heading">
            <div>
              <span className="eyebrow">YOUR LITTLE TIMELINE</span>
              <h3>Memory calendar</h3>
            </div>

            <div className="calendar-navigation">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => changeMonth(-1)}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => changeMonth(1)}
              >
                ›
              </button>
            </div>
          </div>

          <div className="calendar-month">{monthLabel}</div>

          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
              (day) => (
                <div className="calendar-weekday" key={day}>
                  {day}
                </div>
              ),
            )}

            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div className="calendar-blank" key={`blank-${index}`} />
              }

              const dateKey = getDateKey(
                new Date(
                  visibleMonth.getFullYear(),
                  visibleMonth.getMonth(),
                  day,
                ),
              )

              const moodRecord = moods.find(
                (record) => record.dateKey === dateKey,
              )

              const hasEntry = entries.some(
                (entry) => entry.createdAt.slice(0, 10) === dateKey,
              )

              const emoji = moodOptions.find(
                (option) => option.mood === moodRecord?.mood,
              )?.emoji

              return (
                <button
                  type="button"
                  key={dateKey}
                  className={`calendar-day ${
                    selectedDate === dateKey ? 'selected' : ''
                  } ${dateKey === todayKey ? 'today' : ''}`}
                  onClick={() => setSelectedDate(dateKey)}
                  aria-label={`${formatDateKey(dateKey)}${
                    moodRecord ? `, mood: ${moodRecord.mood}` : ''
                  }${hasEntry ? ', journal entry saved' : ''}`}
                >
                  <span>{day}</span>
                  {emoji ? (
                    <small className="calendar-mood">{emoji}</small>
                  ) : hasEntry ? (
                    <small className="calendar-entry-dot">•</small>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="calendar-legend">
            <span><i className="legend-mood" /> Mood recorded</span>
            <span><i className="legend-entry" /> Journal entry</span>
          </div>

          <div className="selected-day-summary">
            <span className="eyebrow">THIS DAY IN YOUR STORY</span>
            <h4>{formatDateKey(selectedDate)}</h4>

            {loading ? (
              <p>Looking through your memories...</p>
            ) : (
              <>
                {moods.find((record) => record.dateKey === selectedDate) ? (
                  <p>
                    {moodOptions.find(
                      (option) =>
                        option.mood ===
                        moods.find((record) => record.dateKey === selectedDate)
                          ?.mood,
                    )?.emoji}{' '}
                    {moods.find((record) => record.dateKey === selectedDate)?.mood}
                  </p>
                ) : (
                  <p>No mood recorded for this day.</p>
                )}

                {selectedDayEntries.length > 0 ? (
                  <div className="calendar-entry-list">
                    {selectedDayEntries.map((entry) => (
                      <div className="calendar-entry-item" key={entry.id}>
                        <strong>{entry.title}</strong>
                        <p>{entry.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No journal entries saved for this day.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
