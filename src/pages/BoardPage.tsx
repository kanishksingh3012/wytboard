import { Button, Spinner, Tooltip } from '@heroui/react'
import { House } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useTheme } from '../app/useTheme'
import { Board, type BoardHandle, type SaveState } from '../canvas/Board'
import { ChatPanel } from '../interviewer/ChatPanel'
import { generateFeedback } from '../interviewer/feedback'
import { FeedbackDialog } from '../interviewer/FeedbackDialog'
import { SessionBar } from '../interviewer/SessionBar'
import { llmConfigFrom, sessionDefaultsFrom, useSettings } from '../settings/settings'
import {
  getBoardMeta,
  getBoardScene,
  getTranscript,
  renameBoard,
  updateBoardMeta,
  type BoardMeta,
  type BoardScene,
} from '../library/boards'

type Loaded = { meta: BoardMeta; scene?: BoardScene } | 'missing' | null

const SAVE_LABEL: Record<SaveState, string> = {
  saved: 'Saved',
  saving: 'Saving…',
  error: 'Not saved',
}

export function BoardPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const boardRef = useRef<BoardHandle>(null)
  const [loaded, setLoaded] = useState<Loaded>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [title, setTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const settings = useSettings()
  const [ending, setEnding] = useState(false)
  const [endError, setEndError] = useState('')
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void Promise.all([getBoardMeta(id), getBoardScene(id)]).then(([meta, scene]) => {
      if (cancelled) return
      setLoaded(meta ? { meta, scene } : 'missing')
      if (meta) setTitle(meta.title)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (title) document.title = `${title} · Wytboard`
    return () => {
      document.title = 'Wytboard'
    }
  }, [title])

  if (loaded === null) {
    return (
      <div className="dot-grid flex h-full items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (loaded === 'missing') {
    return (
      <div className="dot-grid flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-base font-medium">This board could not be found.</p>
        <p className="text-muted text-sm">
          Boards are stored in the browser they were made in.
        </p>
        <Link to="/" className="text-accent text-sm font-medium underline-offset-4 hover:underline">
          Back to home
        </Link>
      </div>
    )
  }

  const { meta } = loaded
  const durationMin = (meta.session ?? sessionDefaultsFrom(settings)).durationMin

  // Keeps the stored board and the screen in step.
  const patchMeta = (patch: Partial<BoardMeta>) => {
    setLoaded({ ...loaded, meta: { ...meta, ...patch } })
    void updateBoardMeta(id, patch)
  }

  const startSession = () => {
    const startedAt = Date.now()
    patchMeta({ startedAt })
    return startedAt
  }

  // Stops the clock, then asks the model to score the session.
  const endSession = async () => {
    const config = llmConfigFrom(settings)
    if (!config || !meta.startedAt) return
    const endedAt = meta.endedAt ?? Date.now()
    patchMeta({ endedAt })
    setEnding(true)
    setEndError('')
    try {
      await boardRef.current?.flush()
      const feedback = await generateFeedback(config, {
        brief: meta.brief,
        transcript: await getTranscript(id),
        board: await boardRef.current?.capture(),
        minutes: Math.max(1, Math.round((endedAt - meta.startedAt) / 60_000)),
      })
      setLoaded({ ...loaded, meta: { ...meta, endedAt, feedback } })
      void updateBoardMeta(id, { feedback })
      setFeedbackOpen(true)
    } catch (cause) {
      setEndError(cause instanceof Error ? cause.message : 'Could not get feedback.')
    } finally {
      setEnding(false)
    }
  }

  const goHome = async () => {
    // Wait for the save so the library shows the latest thumbnail.
    await boardRef.current?.flush()
    void navigate('/')
  }

  const commitTitle = async () => {
    setEditingTitle(false)
    const next = title.trim() || meta.title
    setTitle(next)
    await renameBoard(id, next)
  }

  return (
    <div className="relative h-full w-full">
      <Board
        key={id}
        ref={boardRef}
        boardId={id}
        theme={theme}
        initialScene={loaded.scene}
        onSaveStateChange={setSaveState}
      />

      {/* Sits to the right of Excalidraw's menu button. */}
      <div className="bg-surface shadow-float absolute top-4 left-[4.25rem] z-10 flex h-9 max-w-[clamp(9rem,calc(100vw-29rem),22rem)] items-center gap-1 rounded-xl pr-3 pl-0.5">
        <Tooltip delay={400}>
          <Button isIconOnly size="sm" variant="ghost" aria-label="Home" onPress={() => void goHome()}>
            <House className="size-4" />
          </Button>
          <Tooltip.Content>Home</Tooltip.Content>
        </Tooltip>

        {editingTitle ? (
          <input
            autoFocus
            aria-label="Board title"
            className="text-foreground min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => void commitTitle()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
        ) : (
          <button
            type="button"
            title="Rename board"
            className="hover:text-accent min-w-0 flex-1 cursor-text truncate text-left text-sm font-medium"
            onClick={() => setEditingTitle(true)}
          >
            {title}
          </button>
        )}

        <span
          aria-live="polite"
          className={`shrink-0 pl-2 text-xs ${saveState === 'error' ? 'text-danger' : 'text-muted'}`}
        >
          {SAVE_LABEL[saveState]}
        </span>
      </div>

      <ChatPanel
        boardId={id}
        brief={loaded.meta.brief}
        session={loaded.meta.session}
        captureBoard={() => boardRef.current?.capture()}
        startedAt={meta.startedAt}
        ended={meta.endedAt !== undefined}
        hintsUsed={meta.hintsUsed ?? 0}
        onStart={startSession}
        onHintUsed={() => patchMeta({ hintsUsed: (meta.hintsUsed ?? 0) + 1 })}
      />

      {meta.startedAt && (
        <SessionBar
          startedAt={meta.startedAt}
          endedAt={meta.endedAt}
          durationMin={durationMin}
          hasFeedback={meta.feedback !== undefined}
          ending={ending}
          onEnd={() => void endSession()}
          onShowFeedback={() => setFeedbackOpen(true)}
        />
      )}

      {endError && (
        <p
          role="alert"
          className="bg-surface shadow-float text-danger absolute bottom-24 left-1/2 z-10 max-w-md -translate-x-1/2 rounded-xl px-4 py-2 text-sm"
        >
          {endError}
        </p>
      )}

      <FeedbackDialog
        feedback={meta.feedback ?? null}
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </div>
  )
}
