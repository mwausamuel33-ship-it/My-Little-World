import { db } from './db'

export type CompanionKind = 'tree' | 'pet'

export interface CompanionStage {
  emoji: string
  name: string
  scale: number
}

export interface CompanionType {
  id: string
  kind: CompanionKind
  name: string
  blurb: string
  stages: CompanionStage[]
  decorations: string[]
}

export interface CompanionChoice {
  typeId: string
  name: string
}

// How much sunlight each kind of activity gives, the most it can give in one
// day (so nobody has to "farm" it), and the total needed for each stage.
export const SUNLIGHT = { entry: 3, scrapbookPage: 3, mood: 1 }
export const DAILY_CAP = 6
export const STAGE_THRESHOLDS = [0, 3, 12, 30, 60, 100]
export const MAX_NAME_LENGTH = 20

const CHOICE_KEY = 'my-little-world-companion'

const TREE_STAGE_NAMES = [
  'Seed',
  'Sprout',
  'Sapling',
  'Young tree',
  'Growing tall',
  'Fully grown',
]
const TREE_SCALES = [0.6, 0.75, 0.9, 0.95, 1.05, 1.2]

const PET_STAGE_NAMES = [
  'Mystery egg',
  'Newborn',
  'Little one',
  'Growing up',
  'Happy and healthy',
  'Best friend',
]
const PET_SCALES = [0.85, 0.6, 0.78, 0.95, 1.1, 1.25]

function makeTree(
  id: string,
  name: string,
  blurb: string,
  mature: string,
  decorations: string[],
): CompanionType {
  const emojis = ['🌰', '🌱', '🌿', mature, mature, mature]

  return {
    id,
    kind: 'tree',
    name,
    blurb,
    decorations,
    stages: TREE_STAGE_NAMES.map((stageName, index) => ({
      emoji: emojis[index],
      name: stageName,
      scale: TREE_SCALES[index],
    })),
  }
}

function makePet(
  id: string,
  name: string,
  blurb: string,
  animal: string,
): CompanionType {
  const emojis = ['🥚', animal, animal, animal, animal, animal]

  return {
    id,
    kind: 'pet',
    name,
    blurb,
    decorations: ['💗', '🌼', '🎀', '✨'],
    stages: PET_STAGE_NAMES.map((stageName, index) => ({
      emoji: emojis[index],
      name: stageName,
      scale: PET_SCALES[index],
    })),
  }
}

export const COMPANIONS: CompanionType[] = [
  makeTree('cherry', 'Cherry blossom', 'Soft pink petals in spring', '🌳', ['🌸', '🌸', '🌸', '🦋']),
  makeTree('apple', 'Apple tree', 'Sweet fruit and busy bees', '🌳', ['🍎', '🍎', '🐝', '🍎']),
  makeTree('maple', 'Maple tree', 'Warm autumn leaves', '🌳', ['🍁', '🍁', '🍂', '🍁']),
  makeTree('pine', 'Little pine', 'Calm, steady and evergreen', '🌲', ['⭐', '❄️', '⭐', '✨']),
  makeTree('palm', 'Palm tree', 'Sunshine and coconuts', '🌴', ['🥥', '☀️', '🥥', '🌺']),
  makeTree('bamboo', 'Bamboo', 'Grows tall, bends and never breaks', '🎋', ['🍃', '🍃', '🐼', '✨']),
  makePet('bunny', 'Bunny', 'Gentle and a little shy', '🐰'),
  makePet('kitten', 'Kitten', 'Curious and cuddly', '🐱'),
  makePet('duckling', 'Duckling', 'Cheerful and always splashing', '🐥'),
  makePet('fox', 'Fox', 'Clever and warm-hearted', '🦊'),
  makePet('hedgehog', 'Hedgehog', 'Small, spiky on the outside, soft inside', '🦔'),
  makePet('panda', 'Panda', 'Sleepy, snacky and kind', '🐼'),
]

export function findCompanion(typeId: string): CompanionType | undefined {
  return COMPANIONS.find((companion) => companion.id === typeId)
}

export function cleanName(name: string): string {
  return name.trim().slice(0, MAX_NAME_LENGTH)
}

export function readCompanionChoice(): CompanionChoice | null {
  try {
    const saved = localStorage.getItem(CHOICE_KEY)
    if (!saved) return null

    const parsed: unknown = JSON.parse(saved)

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'typeId' in parsed &&
      'name' in parsed &&
      typeof parsed.typeId === 'string' &&
      typeof parsed.name === 'string' &&
      findCompanion(parsed.typeId)
    ) {
      return { typeId: parsed.typeId, name: cleanName(parsed.name) }
    }
  } catch (error) {
    console.warn('Could not read the saved companion:', error)
  }

  return null
}

export function saveCompanionChoice(choice: CompanionChoice): boolean {
  try {
    localStorage.setItem(
      CHOICE_KEY,
      JSON.stringify({ typeId: choice.typeId, name: cleanName(choice.name) }),
    )
    return true
  } catch (error) {
    console.error('Could not save the companion:', error)
    return false
  }
}

export interface ActivityItem {
  at: string
  weight: number
}

export interface WeekDay {
  key: string
  label: string
  active: boolean
  isToday: boolean
}

export interface CompanionProgress {
  points: number
  stageIndex: number
  pointsToNext: number | null
  stageShare: number
  daysThisMonth: number
  streak: number
  week: WeekDay[]
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

// The calendar day on the person's own clock, like "2026-10-16".
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
}

// Everything that grows the companion comes from what was already saved, so
// it needs no extra storage. Only dates are read, never the writing itself.
export async function loadActivity(): Promise<ActivityItem[]> {
  const [entryTimes, pageTimes, moods] = await Promise.all([
    db.entries.orderBy('createdAt').keys(),
    db.scrapbookPages.orderBy('createdAt').keys(),
    db.moods.toArray(),
  ])

  return [
    ...entryTimes.map((at) => ({ at: String(at), weight: SUNLIGHT.entry })),
    ...pageTimes.map((at) => ({ at: String(at), weight: SUNLIGHT.scrapbookPage })),
    ...moods.map((mood) => ({ at: mood.createdAt, weight: SUNLIGHT.mood })),
  ]
}

export function computeProgress(
  activity: ActivityItem[],
  now: Date,
): CompanionProgress {
  const perDay = new Map<string, number>()

  for (const item of activity) {
    const time = new Date(item.at)
    if (Number.isNaN(time.getTime())) continue

    const key = dayKey(time)
    perDay.set(key, (perDay.get(key) ?? 0) + item.weight)
  }

  let points = 0
  const activeDays = new Set<string>()

  for (const [key, total] of perDay) {
    points += Math.min(DAILY_CAP, total)
    if (total > 0) activeDays.add(key)
  }

  let stageIndex = 0
  STAGE_THRESHOLDS.forEach((threshold, index) => {
    if (points >= threshold) stageIndex = index
  })

  const current = STAGE_THRESHOLDS[stageIndex]
  const next = STAGE_THRESHOLDS[stageIndex + 1]

  const monthPrefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-`
  const daysThisMonth = [...activeDays].filter((key) =>
    key.startsWith(monthPrefix),
  ).length

  // A "gentle" streak: one rest day in a row is always forgiven, so a single
  // missed day never resets it. Two missed days in a row do.
  const days = [...activeDays].map(dayNumber).sort((a, b) => b - a)
  const today = dayNumber(dayKey(now))
  let streak = 0

  if (days.length > 0 && today - days[0] <= 2) {
    streak = 1
    for (let i = 1; i < days.length; i++) {
      if (days[i - 1] - days[i] <= 2) streak++
      else break
    }
  }

  const week: WeekDay[] = []
  for (let back = 6; back >= 0; back--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back)
    const key = dayKey(date)

    week.push({
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      active: activeDays.has(key),
      isToday: back === 0,
    })
  }

  return {
    points,
    stageIndex,
    pointsToNext: next === undefined ? null : next - points,
    stageShare: next === undefined ? 1 : (points - current) / (next - current),
    daysThisMonth,
    streak,
    week,
  }
}
