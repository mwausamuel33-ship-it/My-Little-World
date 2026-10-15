import { Component, type ErrorInfo, type ReactNode } from 'react'

interface SectionErrorBoundaryProps {
  children: ReactNode
}

interface SectionErrorBoundaryState {
  failed: boolean
}

// Catches a section that fails to load (for example offline, or after an
// update changed the file names) or crashes while drawing, so the rest of
// the app keeps working instead of going blank.
export default class SectionErrorBoundary extends Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('A section failed to load or crashed:', error, info)
  }

  render() {
    if (!this.state.failed) {
      return this.props.children
    }

    return (
      <section className="coming-soon" role="alert">
        <span className="coming-soon-icon">🌧️</span>
        <p className="eyebrow">SOMETHING WENT WRONG</p>
        <h1>This page could not open</h1>
        <p>
          Check your connection and try again. Your journals and everything
          you saved are safe.
        </p>
        <button
          type="button"
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </section>
    )
  }
}
