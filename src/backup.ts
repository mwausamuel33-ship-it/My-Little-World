import {
  db,
  type JournalEntry,
  type Mood,
  type MoodRecord,
  type ScrapbookElement,
  type ScrapbookElementType,
  type ScrapbookPage,
  type ScrapbookPaperStyle,
} from './db'

// This must match FAVORITES_KEY in Scrapbook.tsx. It is repeated here on
// purpose: importing from Scrapbook.tsx would pull the whole lazy-loaded
// scrapbook chunk back into the initial bundle.
const FAVORITES_KEY = 'my-little-world-sticker-favorites'

const BACKUP_FORMAT = 'my-little-world-backup'
const BACKUP_VERSION = 1
const MAX_BACKUP_BYTES = 150 * 1024 * 1024

const MOODS: readonly Mood[] = [
  'Happy',
  'Loved',
  'Peaceful',
  'Sad',
  'Anxious',
  'Frustrated',
]
const ELEMENT_TYPES: readonly ScrapbookElementType[] = [
  'text',
  'sticker',
  'image',
]
const PAPER_STYLES: readonly ScrapbookPaperStyle[] = [
  'Plain',
  'Lined',
  'Dotted',
  'Grid',
]

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  entries: JournalEntry[]
  moods: MoodRecord[]
  scrapbookPages: ScrapbookPage[]
  stickerFavorites: string[]
}

export interface RecordCounts {
  entries: number
  moods: number
  scrapbookPages: number
}

export interface ImportSummary {
  added: RecordCounts
  skipped: RecordCounts
  favoritesAdded: number
  favoritesSaved: boolean
}

// Errors with a message that is safe to show to the person using the app.
export class BackupError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function readArray(source: Record<string, unknown>, key: string, label: string) {
  const value = source[key]

  if (!Array.isArray(value)) {
    throw new BackupError(`This backup file is missing its ${label}.`)
  }

  return value as unknown[]
}

function parseEntries(source: Record<string, unknown>): JournalEntry[] {
  return readArray(source, 'entries', 'journal entries').map((item, index) => {
    if (!isRecord(item)) {
      throw new BackupError(`Journal entry ${index + 1} is not valid.`)
    }

    const { title, text, createdAt, updatedAt } = item

    if (
      typeof title !== 'string' ||
      typeof text !== 'string' ||
      typeof createdAt !== 'string' ||
      typeof updatedAt !== 'string'
    ) {
      throw new BackupError(`Journal entry ${index + 1} is not valid.`)
    }

    return { title, text, createdAt, updatedAt }
  })
}

function parseMoods(source: Record<string, unknown>): MoodRecord[] {
  return readArray(source, 'moods', 'mood records').map((item, index) => {
    if (!isRecord(item)) {
      throw new BackupError(`Mood record ${index + 1} is not valid.`)
    }

    const { dateKey, mood, note, createdAt, updatedAt } = item

    if (
      typeof dateKey !== 'string' ||
      typeof mood !== 'string' ||
      !MOODS.includes(mood as Mood) ||
      typeof note !== 'string' ||
      typeof createdAt !== 'string' ||
      typeof updatedAt !== 'string'
    ) {
      throw new BackupError(`Mood record ${index + 1} is not valid.`)
    }

    return { dateKey, mood: mood as Mood, note, createdAt, updatedAt }
  })
}

function parseElement(item: unknown, label: string): ScrapbookElement {
  if (!isRecord(item)) {
    throw new BackupError(`${label} is not valid.`)
  }

  const { id, type, x, y, width, height, rotation, content, color, fontSize } =
    item

  if (
    typeof id !== 'string' ||
    typeof type !== 'string' ||
    !ELEMENT_TYPES.includes(type as ScrapbookElementType) ||
    !isFiniteNumber(x) ||
    !isFiniteNumber(y) ||
    !isFiniteNumber(width) ||
    !isFiniteNumber(height) ||
    !isFiniteNumber(rotation) ||
    typeof content !== 'string' ||
    typeof color !== 'string' ||
    !isFiniteNumber(fontSize)
  ) {
    throw new BackupError(`${label} is not valid.`)
  }

  return {
    id,
    type: type as ScrapbookElementType,
    x,
    y,
    width,
    height,
    rotation,
    content,
    color,
    fontSize,
  }
}

function parseScrapbookPages(
  source: Record<string, unknown>,
): ScrapbookPage[] {
  return readArray(source, 'scrapbookPages', 'scrapbook pages').map(
    (item, index) => {
      const label = `Scrapbook page ${index + 1}`

      if (!isRecord(item)) {
        throw new BackupError(`${label} is not valid.`)
      }

      const { title, background, paperStyle, elements, createdAt, updatedAt } =
        item

      if (
        typeof title !== 'string' ||
        typeof background !== 'string' ||
        !Array.isArray(elements) ||
        typeof createdAt !== 'string' ||
        typeof updatedAt !== 'string' ||
        (paperStyle !== undefined &&
          !PAPER_STYLES.includes(paperStyle as ScrapbookPaperStyle))
      ) {
        throw new BackupError(`${label} is not valid.`)
      }

      return {
        title,
        background,
        paperStyle: (paperStyle as ScrapbookPaperStyle | undefined) ?? 'Plain',
        elements: (elements as unknown[]).map((element, elementIndex) =>
          parseElement(element, `${label}, item ${elementIndex + 1}`),
        ),
        createdAt,
        updatedAt,
      }
    },
  )
}

// Checks everything before anything is written, so a bad file changes nothing.
function parseBackup(text: string): BackupFile {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new BackupError('That file is not a valid backup (it is not JSON).')
  }

  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT) {
    throw new BackupError('That file is not a My Little World backup.')
  }

  if (!isFiniteNumber(parsed.version) || parsed.version > BACKUP_VERSION) {
    throw new BackupError(
      'This backup was made by a newer version of the app and cannot be read here.',
    )
  }

  const favorites = parsed.stickerFavorites ?? []

  if (!isStringArray(favorites)) {
    throw new BackupError('The sticker favourites in this backup are not valid.')
  }

  return {
    format: BACKUP_FORMAT,
    version: parsed.version,
    exportedAt:
      typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
    entries: parseEntries(parsed),
    moods: parseMoods(parsed),
    scrapbookPages: parseScrapbookPages(parsed),
    stickerFavorites: favorites,
  }
}

function readStoredFavorites(): string[] {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY)
    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)
    return isStringArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Fingerprints used to recognise records that are already in the database.
// IDs are not used, because auto-increment IDs differ between browsers.
const entryKey = (e: JournalEntry) =>
  JSON.stringify([e.createdAt, e.updatedAt, e.title, e.text])
const moodKey = (m: MoodRecord) =>
  JSON.stringify([m.dateKey, m.mood, m.note, m.createdAt, m.updatedAt])
const pageKey = (p: ScrapbookPage) =>
  JSON.stringify([p.createdAt, p.updatedAt, p.title, p.elements.length])

function keepNew<T>(
  existing: T[],
  incoming: T[],
  keyOf: (item: T) => string,
): { fresh: T[]; skipped: number } {
  const seen = new Set(existing.map(keyOf))
  const fresh: T[] = []

  for (const item of incoming) {
    const key = keyOf(item)

    if (!seen.has(key)) {
      seen.add(key)
      fresh.push(item)
    }
  }

  return { fresh, skipped: incoming.length - fresh.length }
}

export async function createBackup(): Promise<BackupFile> {
  const [entries, moods, scrapbookPages] = await db.transaction(
    'r',
    db.entries,
    db.moods,
    db.scrapbookPages,
    () =>
      Promise.all([
        db.entries.toArray(),
        db.moods.toArray(),
        db.scrapbookPages.toArray(),
      ]),
  )

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    entries,
    moods,
    scrapbookPages,
    stickerFavorites: readStoredFavorites(),
  }
}

// Builds the backup and hands it to the browser as a file download.
// A browser cannot report whether the person actually saved the file.
export async function downloadBackup(): Promise<RecordCounts> {
  const backup = await createBackup()
  const blob = new Blob([JSON.stringify(backup)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `my-little-world-backup-${backup.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)

  return {
    entries: backup.entries.length,
    moods: backup.moods.length,
    scrapbookPages: backup.scrapbookPages.length,
  }
}

// Merges a backup into the existing data. Nothing is deleted or overwritten:
// records that already exist are skipped, new ones get fresh IDs.
export async function importBackup(file: File): Promise<ImportSummary> {
  if (file.size > MAX_BACKUP_BYTES) {
    throw new BackupError('That file is too large to be a backup.')
  }

  const backup = parseBackup(await file.text())

  const summary = await db.transaction(
    'rw',
    db.entries,
    db.moods,
    db.scrapbookPages,
    async () => {
      const entries = keepNew(
        await db.entries.toArray(),
        backup.entries,
        entryKey,
      )
      const moods = keepNew(await db.moods.toArray(), backup.moods, moodKey)
      const pages = keepNew(
        await db.scrapbookPages.toArray(),
        backup.scrapbookPages,
        pageKey,
      )

      await db.entries.bulkAdd(entries.fresh)
      await db.moods.bulkAdd(moods.fresh)
      await db.scrapbookPages.bulkAdd(pages.fresh)

      return {
        added: {
          entries: entries.fresh.length,
          moods: moods.fresh.length,
          scrapbookPages: pages.fresh.length,
        },
        skipped: {
          entries: entries.skipped,
          moods: moods.skipped,
          scrapbookPages: pages.skipped,
        },
      }
    },
  )

  // Favourites live in localStorage, outside the database transaction, so
  // they are merged only after the database import has succeeded.
  const existingFavorites = readStoredFavorites()
  const merged = [...new Set([...existingFavorites, ...backup.stickerFavorites])]
  const favoritesAdded = merged.length - existingFavorites.length
  let favoritesSaved = true

  if (favoritesAdded > 0) {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(merged))
    } catch {
      favoritesSaved = false
    }
  }

  return { ...summary, favoritesAdded, favoritesSaved }
}
