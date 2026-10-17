import { useEffect, useState } from 'react'
import {
  cleanName,
  computeProgress,
  loadActivity,
  readCompanionChoice,
  saveCompanionChoice,
  type CompanionChoice,
  type CompanionProgress,
} from './companion'

// Loads how the companion is doing (from the dates of saved journals, moods
// and scrapbook pages) and remembers which companion was chosen.
export function useCompanion() {
  const [choice, setChoice] = useState<CompanionChoice | null>(
    readCompanionChoice,
  )
  const [progress, setProgress] = useState<CompanionProgress | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const activity = await loadActivity()

        if (!cancelled) {
          setProgress(computeProgress(activity, new Date()))
        }
      } catch (error) {
        console.error('Could not load growth progress:', error)

        if (!cancelled) {
          setFailed(true)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  // Returns true only when the choice was really saved.
  function choose(next: CompanionChoice): boolean {
    const clean = { typeId: next.typeId, name: cleanName(next.name) }

    if (!saveCompanionChoice(clean)) return false

    setChoice(clean)
    return true
  }

  return { choice, progress, failed, choose }
}
