import { Component, type ReactNode } from 'react'

/** Last line of defence: shows a recoverable screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Wytboard crashed', error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="bg-background text-foreground flex h-full flex-col items-center justify-center gap-3 p-6 text-center font-sans">
        <p className="text-base font-medium">Something went wrong.</p>
        <p className="text-muted max-w-sm text-sm">
          Your boards are saved in this browser and are not affected. Reload to carry on.
        </p>
        <button
          type="button"
          className="bg-accent text-accent-foreground cursor-pointer rounded-xl px-4 py-2 text-sm font-medium"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    )
  }
}
