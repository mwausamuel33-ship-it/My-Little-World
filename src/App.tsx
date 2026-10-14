
import { lazy, Suspense, useEffect, useState } from 'react'
import { db, type JournalEntry } from './db'
import BackupPanel from './BackupPanel'
import './App.css'

const MoodCalendar = lazy(() => import('./MoodCalendar'))
const Scrapbook = lazy(() => import('./Scrapbook'))

const navigation = [
  { name: 'Home', icon: '⌂' },
  { name: 'My Journals', icon: '📔' },
  { name: 'Mood & Calendar', icon: '🌷' },
  { name: 'Scrapbook', icon: '🎀' },
  { name: 'Growth', icon: '🌱' },
  { name: 'Faith & Prayer', icon: '🕊️' },
  { name: 'Memories', icon: '💗' },
]

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function App() {
  const [activeSection, setActiveSection] = useState('Home')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(true)

  // Load journal entries when the app first opens.
  // The cancellation guard prevents state updates after unmounting.
  useEffect(() => {
    let cancelled = false

    async function loadInitialEntries() {
      try {
        const savedEntries = await db.entries
          .orderBy('createdAt')
          .reverse()
          .toArray()

        if (!cancelled) {
          setEntries(savedEntries)
        }
      } catch (error) {
        console.error('Could not load journal entries:', error)

        if (!cancelled) {
          setSaveError(
            'Could not load your journals. Please refresh the page.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadInitialEntries()

    return () => {
      cancelled = true
    }
  }, [])

  // Refresh the journal list after saving or deleting an entry.
  async function loadEntries() {
    try {
      const savedEntries = await db.entries
        .orderBy('createdAt')
        .reverse()
        .toArray()

      setEntries(savedEntries)
      setSaveError('')
    } catch (error) {
      console.error('Could not load journal entries:', error)
      setSaveError(
        'Could not load your journals. Please refresh the page.',
      )
    } finally {
      setLoading(false)
    }
  }

  function startNewEntry() {
    setSelectedEntry(null)
    setTitle('')
    setText('')
    setSaveError('')
    setIsCreating(true)
  }

  function openEntry(entry: JournalEntry) {
    setSelectedEntry(entry)
    setTitle(entry.title)
    setText(entry.text)
    setSaveError('')
    setIsCreating(true)
  }

  function closeEditor() {
    setSelectedEntry(null)
    setIsCreating(false)
    setTitle('')
    setText('')
    setSaveError('')
  }

  async function saveEntry() {
    if (!title.trim() && !text.trim()) {
      setSaveError('Write a little something before saving 💗')
      return
    }

    const now = new Date().toISOString()

    try {
      if (selectedEntry?.id !== undefined) {
        await db.entries.update(selectedEntry.id, {
          title: title.trim() || 'Untitled memory',
          text: text.trim(),
          updatedAt: now,
        })
      } else {
        await db.entries.add({
          title: title.trim() || 'Untitled memory',
          text: text.trim(),
          createdAt: now,
          updatedAt: now,
        })
      }

      await loadEntries()
      closeEditor()
    } catch (error) {
      console.error('Could not save journal entry:', error)
      setSaveError('Your journal could not be saved. Please try again.')
    }
  }

  async function deleteEntry(entry: JournalEntry) {
    if (entry.id === undefined) return

    const confirmed = window.confirm(
      `Delete "${entry.title || 'Untitled memory'}"? This cannot be undone.`,
    )

    if (!confirmed) return

    try {
      await db.entries.delete(entry.id)

      if (selectedEntry?.id === entry.id) {
        closeEditor()
      }

      await loadEntries()
    } catch (error) {
      console.error('Could not delete journal entry:', error)
      setSaveError('Could not delete that entry. Please try again.')
    }
  }

  const filteredEntries = entries.filter((entry) => {
    const query = search.toLowerCase().trim()

    return (
      !query ||
      entry.title.toLowerCase().includes(query) ||
      entry.text.toLowerCase().includes(query)
    )
  })

  function renderJournalList() {
    if (loading) {
      return (
        <p className="empty-state">
          Opening your little memories… 🌷
        </p>
      )
    }

    if (filteredEntries.length === 0) {
      return (
        <div className="empty-state">
          <div style={{ fontSize: 42 }}>📔</div>
          <h3>{search ? 'No matching memories' : 'Your story starts here'}</h3>
          <p>
            {search
              ? 'Try another word to find your journal.'
              : 'Every little thought deserves a place to live.'}
          </p>
          {!search && (
            <button className="primary-button" onClick={startNewEntry}>
              Write your first journal
            </button>
          )}
        </div>
      )
    }

    return (
      <div className="journal-list">
        {filteredEntries.map((entry) => (
          <article className="journal-card" key={entry.id}>
            <button
              className="journal-card-content"
              onClick={() => openEntry(entry)}
            >
              <h3>{entry.title || 'Untitled memory'}</h3>
              <p>{entry.text}</p>
              <span className="entry-date">
                {formatDate(entry.createdAt)}
              </span>
            </button>

            <div className="entry-actions">
              <button
                className="edit-entry"
                onClick={() => openEntry(entry)}
                aria-label={`Edit ${entry.title || 'journal entry'}`}
              >
                Edit
              </button>
              <button
                className="delete-entry"
                onClick={() => void deleteEntry(entry)}
                aria-label={`Delete ${entry.title || 'journal entry'}`}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    )
  }

  function renderHome() {
    return (
      <>
        <header className="welcome-header">
          <p className="eyebrow">A LITTLE SPACE JUST FOR YOU</p>
          <h1>Welcome to your little world 🌷</h1>
          <p>
            A gentle place to write, remember, grow, and be yourself.
          </p>
        </header>

        <section className="home-quote">
          <span className="quote-flower">✿</span>
          <p>“You are allowed to grow at your own pace.”</p>
          <span>One little moment at a time ♡</span>
        </section>

        <section className="home-section">
          <div className="section-heading">
            <div>
              <h2>Your little corner</h2>
              <p>What would you like to do today?</p>
            </div>
          </div>

          <div className="feature-grid">
            <button
              className="feature-card"
              onClick={() => setActiveSection('My Journals')}
            >
              <span className="feature-icon">📔</span>
              <h3>My Journals</h3>
              <p>Let your thoughts find their words.</p>
            </button>

            <button
              className="feature-card"
              onClick={() => setActiveSection('Mood & Calendar')}
            >
              <span className="feature-icon">🌷</span>
              <h3>Mood &amp; Calendar</h3>
              <p>Check in with how you're feeling.</p>
            </button>

            <button
              className="feature-card"
              onClick={() => setActiveSection('Scrapbook')}
            >
              <span className="feature-icon">🎀</span>
              <h3>Scrapbook Studio</h3>
              <p>Make something lovely out of little memories.</p>
            </button>

            <button
              className="feature-card"
              onClick={() => setActiveSection('Growth')}
            >
              <span className="feature-icon">🌱</span>
              <h3>Growth Garden</h3>
              <p>Celebrate every small step forward.</p>
            </button>

            <button
              className="feature-card"
              onClick={() => setActiveSection('Faith & Prayer')}
            >
              <span className="feature-icon">🕊️</span>
              <h3>Faith &amp; Prayer</h3>
              <p>A quiet space for hope and gratitude.</p>
            </button>

            <button
              className="feature-card"
              onClick={() => setActiveSection('Memories')}
            >
              <span className="feature-icon">💗</span>
              <h3>Memories</h3>
              <p>Keep the moments you want to hold close.</p>
            </button>
          </div>
        </section>

        <section className="recent-section">
          <div className="section-heading">
            <div>
              <h2>Little pages from your story</h2>
              <p>Your latest journal entries</p>
            </div>

            <button
              className="text-button"
              onClick={() => setActiveSection('My Journals')}
            >
              View all →
            </button>
          </div>

          {loading ? (
            <p className="empty-state">Opening your little memories… 🌷</p>
          ) : entries.length === 0 ? (
            <div className="soft-empty-card">
              Your first memory is waiting to be written. 💗
              <button className="text-button" onClick={startNewEntry}>
                Write one →
              </button>
            </div>
          ) : (
            <div className="recent-entries">
              {entries.slice(0, 3).map((entry) => (
                <button
                  className="recent-entry"
                  key={entry.id}
                  onClick={() => openEntry(entry)}
                >
                  <span className="recent-entry-icon">🌸</span>
                  <span className="recent-entry-info">
                    <strong>{entry.title || 'Untitled memory'}</strong>
                    <small>{formatDate(entry.createdAt)}</small>
                  </span>
                  <span className="recent-entry-arrow">→</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <BackupPanel onRestored={loadEntries} />
      </>
    )
  }

  function renderJournalEditor() {
    return (
      <section className="journal-editor">
        <button className="back-button" onClick={closeEditor}>
          ← Back to journals
        </button>

        <div className="editor-heading">
          <p className="eyebrow">
            {selectedEntry
              ? 'A MEMORY ALREADY WRITTEN'
              : 'A FRESH LITTLE PAGE'}
          </p>
          <h1>
            {selectedEntry ? 'Edit your journal' : 'Write your heart out'} 💗
          </h1>
          <p>There are no perfect words here. Just yours.</p>
        </div>

        <label className="editor-label" htmlFor="journal-title">
          Give this memory a title
        </label>
        <input
          id="journal-title"
          className="journal-title-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="A little moment..."
          maxLength={120}
        />

        <label className="editor-label" htmlFor="journal-text">
          What's on your mind?
        </label>
        <textarea
          id="journal-text"
          className="journal-text-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Dear diary..."
          rows={12}
        />

        {saveError && (
          <p className="save-error" role="alert">
            {saveError}
          </p>
        )}

        <div className="editor-actions">
          <button
            className="primary-button"
            onClick={() => void saveEntry()}
          >
            Save this memory ♡
          </button>
          <button className="secondary-button" onClick={closeEditor}>
            Cancel
          </button>
        </div>
      </section>
    )
  }

  function renderPlaceholder(section: string) {
    const content: Record<
      string,
      { icon: string; title: string; description: string }
    > = {
      Growth: {
        icon: '🌱',
        title: 'Something lovely is growing',
        description:
          'Your goals, habits, and little wins will have a home here soon.',
      },
      'Faith & Prayer': {
        icon: '🕊️',
        title: 'A little space for faith',
        description:
          'Prayer notes, favourite verses, and moments of gratitude are coming.',
      },
      Memories: {
        icon: '💗',
        title: 'Keep the moments close',
        description:
          'A special place for the little things you never want to forget.',
      },
    }

    const item = content[section] ?? {
      icon: '🌷',
      title: 'Something lovely is growing',
      description: 'More little features are on their way.',
    }

    return (
      <section className="coming-soon">
        <span className="coming-soon-icon">{item.icon}</span>
        <p className="eyebrow">A LITTLE SOMETHING IS BLOOMING</p>
        <h1>{item.title}</h1>
        <p>{item.description}</p>
        <button
          className="primary-button"
          onClick={() => setActiveSection('Home')}
        >
          Back to my little world
        </button>
      </section>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => {
            setActiveSection('Home')
            closeEditor()
          }}
        >
          <span className="brand-flower">✿</span>
          <span className="brand-text">
            <strong>My Little World</strong>
            <small>a place to bloom</small>
          </span>
        </button>

        <div className="sidebar-label">YOUR LITTLE SPACE</div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                activeSection === item.name ? 'active' : ''
              }`}
              aria-current={activeSection === item.name ? 'page' : undefined}
              onClick={() => {
                setActiveSection(item.name)
                closeEditor()
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
              {activeSection === item.name && (
                <span className="nav-active-dot">•</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-note">
          <span>🌼</span>
          <p>Little by little, day by day, you are growing.</p>
        </div>

        <div className="sidebar-footer">Made with love ♡</div>
      </aside>

      <main className="main-content">
        <div className="mobile-brand">
          <span>✿</span> My Little World
        </div>

        {isCreating ? (
          renderJournalEditor()
        ) : activeSection === 'Home' ? (
          renderHome()
        ) : activeSection === 'My Journals' ? (
          <section className="journals-page">
            <header className="page-header">
              <div>
                <p className="eyebrow">YOUR THOUGHTS, YOUR SPACE</p>
                <h1>My Journals 📔</h1>
                <p>Every page holds a little piece of your story.</p>
              </div>

              <button className="primary-button" onClick={startNewEntry}>
                + New journal
              </button>
            </header>

            <div className="journal-search">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find a memory..."
                aria-label="Search journal entries"
              />
            </div>

            {saveError && (
              <p className="save-error" role="alert">
                {saveError}
              </p>
            )}

            {renderJournalList()}
          </section>
        ) : activeSection === 'Mood & Calendar' ? (
          <Suspense
            fallback={
              <p className="empty-state">Opening your little calendar… 🌷</p>
            }
          >
            <MoodCalendar />
          </Suspense>
        ) : activeSection === 'Scrapbook' ? (
          <Suspense
            fallback={
              <p className="empty-state">Preparing your scrapbook… 🎀</p>
            }
          >
            <Scrapbook />
          </Suspense>
        ) : (
          renderPlaceholder(activeSection)
        )}
      </main>
    </div>
  )
}

export default App
