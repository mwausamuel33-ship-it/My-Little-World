import { useState } from 'react'
import { THEMES, applyTheme, readTheme, saveTheme } from './themes'
import './ThemePicker.css'

export default function ThemePicker() {
  const [themeId, setThemeId] = useState(readTheme)
  const [saveFailed, setSaveFailed] = useState(false)

  function choose(id: string) {
    applyTheme(id)
    setThemeId(id)
    setSaveFailed(!saveTheme(id))
  }

  return (
    <section className="home-section theme-picker">
      <div className="section-heading">
        <div>
          <h2>Pick your colours</h2>
          <p>Make your little world feel like yours.</p>
        </div>
      </div>

      <div className="theme-options" role="group" aria-label="Colour theme">
        {THEMES.map((theme) => (
          <button
            type="button"
            key={theme.id}
            className={`theme-option${themeId === theme.id ? ' selected' : ''}`}
            aria-pressed={themeId === theme.id}
            onClick={() => choose(theme.id)}
          >
            <span
              className="theme-swatch"
              style={{
                background: `linear-gradient(135deg, ${theme.background} 50%, ${theme.swatch} 50%)`,
              }}
              aria-hidden="true"
            />
            <span>{theme.name}</span>
          </button>
        ))}
      </div>

      {saveFailed && (
        <p className="save-error" role="alert">
          Your choice could not be remembered on this device, but it is showing
          for now.
        </p>
      )}
    </section>
  )
}
