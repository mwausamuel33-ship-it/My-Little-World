import { useEffect, useState } from 'react'

// Shows a small banner when a new version of the app has installed itself in
// the background, so nobody is left on an old copy without knowing.
export default function UpdateNotice() {
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // The first time the service worker takes control (first visit) is not an
    // update, so only react when one was already in charge of this page.
    let hadController = Boolean(navigator.serviceWorker.controller)

    function handleControllerChange() {
      if (hadController) {
        setUpdateReady(true)
      }

      hadController = true
    }

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    )

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      )
    }
  }, [])

  if (!updateReady) return null

  return (
    <div className="update-notice" role="status">
      <span>A new version of My Little World is ready.</span>
      <button
        type="button"
        className="primary-button"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
      <button
        type="button"
        className="text-button"
        onClick={() => setUpdateReady(false)}
      >
        Later
      </button>
    </div>
  )
}
