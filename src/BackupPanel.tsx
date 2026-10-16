import { useRef, useState, type ChangeEvent } from 'react'
import {
  BackupError,
  downloadBackup,
  importBackup,
  readBackupStatus,
  type BackupStatus,
  type ImportSummary,
} from './backup'
import './BackupPanel.css'

interface BackupPanelProps {
  // Called after a successful restore so the journal list can refresh.
  onRestored: () => void | Promise<void>
}

type Status = { kind: 'success' | 'error'; text: string } | null

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

function describeImport(summary: ImportSummary) {
  const { added, skipped } = summary
  const addedTotal = added.entries + added.moods + added.scrapbookPages
  const skippedTotal = skipped.entries + skipped.moods + skipped.scrapbookPages

  if (addedTotal === 0 && summary.favoritesAdded === 0) {
    return 'Everything in that backup was already here, so nothing was added.'
  }

  const parts = [
    plural(added.entries, 'journal', 'journals'),
    plural(added.moods, 'mood record', 'mood records'),
    plural(added.scrapbookPages, 'scrapbook page', 'scrapbook pages'),
  ]

  let text = `Restored ${parts.join(', ')}.`

  if (skippedTotal > 0) {
    text += ` ${plural(skippedTotal, 'item was', 'items were')} already here and skipped.`
  }

  if (summary.favoritesAdded > 0 && summary.favoritesSaved) {
    text += ` ${plural(summary.favoritesAdded, 'sticker favourite', 'sticker favourites')} added.`
  }

  if (!summary.favoritesSaved) {
    text +=
      ' Your sticker favourites could not be saved in this browser, but everything else was restored.'
  }

  return text
}

const OVERDUE_AFTER_DAYS = 14

function describeBackupStatus(info: BackupStatus) {
  if (info.lastBackupAt === null || info.daysAgo === null) {
    return {
      text: 'No backup has been saved from this device yet. It only takes a few seconds.',
      overdue: true,
    }
  }

  const date = new Date(info.lastBackupAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (info.daysAgo === 0) {
    return { text: `Last backup file made today (${date}).`, overdue: false }
  }

  const ago = plural(info.daysAgo, 'day', 'days')

  if (info.daysAgo >= OVERDUE_AFTER_DAYS) {
    return {
      text: `Last backup file made on ${date}, ${ago} ago. It might be time for a fresh one.`,
      overdue: true,
    }
  }

  return { text: `Last backup file made on ${date} (${ago} ago).`, overdue: false }
}

export default function BackupPanel({ onRestored }: BackupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [backupInfo, setBackupInfo] = useState(readBackupStatus)
  const lastBackup = describeBackupStatus(backupInfo)

  async function handleExport() {
    setBusy(true)
    setStatus(null)

    try {
      const counts = await downloadBackup()
      setBackupInfo(readBackupStatus())
      setStatus({
        kind: 'success',
        text: `Backup file created with ${plural(counts.entries, 'journal', 'journals')}, ${plural(counts.moods, 'mood record', 'mood records')} and ${plural(counts.scrapbookPages, 'scrapbook page', 'scrapbook pages')}. Check your downloads folder and keep it somewhere safe.`,
      })
    } catch (error) {
      console.error('Could not create backup:', error)
      setStatus({
        kind: 'error',
        text: 'Your backup could not be created. Please try again.',
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]

    if (!file) return

    setBusy(true)
    setStatus(null)

    try {
      const summary = await importBackup(file)

      try {
        await onRestored()
      } catch (error) {
        console.error('Could not refresh after restore:', error)
      }

      setStatus({ kind: 'success', text: describeImport(summary) })
    } catch (error) {
      console.error('Could not restore backup:', error)
      setStatus({
        kind: 'error',
        text:
          error instanceof BackupError
            ? `${error.message} Nothing was changed.`
            : 'The backup could not be restored. Nothing was changed.',
      })
    } finally {
      setBusy(false)
      input.value = ''
    }
  }

  return (
    <section className="home-section backup-panel">
      <div className="section-heading">
        <div>
          <h2>Keep your little world safe</h2>
          <p>
            Your writing lives only in this browser. Save a copy so it can
            never be lost.
          </p>
        </div>
      </div>

      <div className="backup-actions">
        <button
          type="button"
          className="primary-button"
          onClick={() => void handleExport()}
          disabled={busy}
        >
          Save a backup
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          Restore from a backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="backup-file-input"
          onChange={(event) => void handleFileChosen(event)}
          aria-label="Choose a backup file to restore"
          tabIndex={-1}
        />
      </div>

      <p className="backup-hint">
        Restoring adds to what you already have. It never deletes or replaces
        your existing journals, moods or scrapbook pages.
      </p>

      <p
        className={`backup-last${lastBackup.overdue ? ' backup-last-overdue' : ''}`}
      >
        {lastBackup.text}
      </p>

      {busy && (
        <p className="backup-status" role="status">
          Working on it… 🌷
        </p>
      )}

      {status && (
        <p
          className={`backup-status backup-status-${status.kind}`}
          role={status.kind === 'error' ? 'alert' : 'status'}
        >
          {status.text}
        </p>
      )}
    </section>
  )
}
