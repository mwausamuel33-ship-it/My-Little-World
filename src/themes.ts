// The colour themes people can choose from. The colours themselves are made
// at build time by vite.themes.ts (keep the ids in step with that file); the
// swatch and background here are only used for the little preview circles and
// the phone's address-bar colour.

export interface ThemeOption {
  id: string
  name: string
  swatch: string
  background: string
}

export const THEMES: ThemeOption[] = [
  { id: 'blush', name: 'Blush', swatch: '#b18189', background: '#faf8f3' },
  { id: 'meadow', name: 'Meadow', swatch: '#799a7a', background: '#f3fbf3' },
  { id: 'lavender', name: 'Lavender', swatch: '#9588b0', background: '#f9f7ff' },
  { id: 'honey', name: 'Honey', swatch: '#ab886a', background: '#fff7f0' },
  { id: 'sea', name: 'Sea glass', swatch: '#6798ac', background: '#f0faff' },
]

const THEME_KEY = 'my-little-world-theme'
const DEFAULT_THEME = 'blush'

export function readTheme(): string {
  try {
    const saved = localStorage.getItem(THEME_KEY)

    if (saved && THEMES.some((theme) => theme.id === saved)) {
      return saved
    }
  } catch (error) {
    console.warn('Could not read the saved theme:', error)
  }

  return DEFAULT_THEME
}

export function saveTheme(id: string): boolean {
  try {
    localStorage.setItem(THEME_KEY, id)
    return true
  } catch (error) {
    console.error('Could not save the theme:', error)
    return false
  }
}

export function applyTheme(id: string): void {
  const theme = THEMES.find((option) => option.id === id) ?? THEMES[0]
  const root = document.documentElement

  if (theme.id === DEFAULT_THEME) {
    delete root.dataset.theme
  } else {
    root.dataset.theme = theme.id
  }

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme.background)
}
