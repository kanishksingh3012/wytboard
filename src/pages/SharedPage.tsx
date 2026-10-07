import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { Button, Spinner } from '@heroui/react'
import { House } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useTheme } from '../app/useTheme'
import '../canvas/board.css'
import { applyDotGrid } from '../canvas/dotGrid'
import { readShareData, saveSharedCopy, type SharedBoard } from '../library/share'

/** A board opened from a share link: view only, with the option to keep a copy. */
export function SharedPage() {
  const { data = '' } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [shared, setShared] = useState<SharedBoard | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    readShareData(data).then(
      (board) => !cancelled && setShared(board),
      (cause: Error) => !cancelled && setError(cause.message),
    )
    return () => {
      cancelled = true
    }
  }, [data])

  if (error) {
    return (
      <div className="bg-background flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-base font-medium">This board could not be opened</p>
        <p className="text-muted max-w-sm text-sm">{error}</p>
        <Link to="/" className="text-accent text-sm font-medium underline-offset-4 hover:underline">
          Go to Wytboard
        </Link>
      </div>
    )
  }

  if (!shared) {
    return (
      <div className="dot-grid flex h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const keepCopy = async () => {
    const meta = await saveSharedCopy(shared)
    void navigate(`/board/${meta.id}`)
  }

  return (
    <div className="relative h-full w-full">
      <div ref={wrapperRef} className="board dot-grid h-full w-full">
        <Excalidraw
          theme={theme}
          viewModeEnabled
          onScrollChange={(x, y, zoom) => applyDotGrid(wrapperRef.current, x, y, zoom.value)}
          initialData={{
            elements: shared.scene.elements,
            files: shared.scene.files,
            appState: { viewBackgroundColor: 'transparent' },
            scrollToContent: true,
          }}
        />
      </div>

      <div className="bg-surface shadow-float absolute top-4 left-4 z-10 flex h-9 max-w-[min(24rem,calc(100vw-2rem))] items-center gap-1 rounded-xl pr-3 pl-0.5">
        <Button isIconOnly size="sm" variant="ghost" aria-label="Go to Wytboard" onPress={() => void navigate('/')}>
          <House className="size-4" />
        </Button>
        <span className="min-w-0 truncate text-sm font-medium">{shared.title}</span>
        <span className="text-muted shrink-0 pl-2 text-xs">Shared · view only</span>
      </div>

      <aside className="bg-surface shadow-float absolute top-16 left-4 z-10 w-[min(20rem,calc(100vw-2rem))] rounded-2xl p-4">
        {shared.brief && (
          <>
            <p className="text-muted text-xs font-medium">Problem</p>
            <p className="mt-1 mb-3 text-sm whitespace-pre-wrap">{shared.brief}</p>
          </>
        )}
        <Button size="sm" variant="primary" onPress={() => void keepCopy()}>
          Save a copy to my boards
        </Button>
      </aside>
    </div>
  )
}
