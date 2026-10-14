
import Dexie, { type Table } from 'dexie'

export interface JournalEntry {
  id?: number
  title: string
  text: string
  createdAt: string
  updatedAt: string
}

export type Mood =
  | 'Happy'
  | 'Loved'
  | 'Peaceful'
  | 'Sad'
  | 'Anxious'
  | 'Frustrated'

export interface MoodRecord {
  id?: number
  dateKey: string
  mood: Mood
  note: string
  createdAt: string
  updatedAt: string
}

export type ScrapbookElementType = 'text' | 'sticker' | 'image'

export interface ScrapbookElement {
  id: string
  type: ScrapbookElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  content: string
  color: string
  fontSize: number
}

export type ScrapbookPaperStyle = 'Plain' | 'Lined' | 'Dotted' | 'Grid'

export interface ScrapbookPage {
  id?: number
  title: string
  background: string
  paperStyle?: ScrapbookPaperStyle
  elements: ScrapbookElement[]
  createdAt: string
  updatedAt: string
}

class MyLittleWorldDatabase extends Dexie {
  entries!: Table<JournalEntry, number>
  moods!: Table<MoodRecord, number>
  scrapbookPages!: Table<ScrapbookPage, number>

  constructor() {
    super('MyLittleWorldDB')

    this.version(1).stores({
      entries: '++id, title, createdAt, updatedAt',
    })

    this.version(2).stores({
      entries: '++id, title, createdAt, updatedAt',
      moods: '++id, dateKey, mood',
    })

    this.version(3).stores({
      entries: '++id, title, createdAt, updatedAt',
      moods: '++id, dateKey, mood',
      scrapbookPages: '++id, title, createdAt, updatedAt',
    })

    this.version(4)
      .stores({
        entries: '++id, title, createdAt, updatedAt',
        moods: '++id, dateKey, mood',
        scrapbookPages: '++id, title, createdAt, updatedAt',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table('scrapbookPages')
          .toCollection()
          .modify((page: ScrapbookPage) => {
            page.paperStyle ??= 'Plain'
          })
      })
  }
}

export const db = new MyLittleWorldDatabase()
