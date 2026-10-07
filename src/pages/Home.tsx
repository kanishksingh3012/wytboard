import { AlertDialog, Button, Dropdown, Label, TextArea } from '@heroui/react'
import { ArrowRight, BookOpen, Dices, Ellipsis, Settings, SquarePen, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { Brand } from '../app/Brand'
import { OptionSelect } from '../app/OptionSelect'
import { ProgressSummary } from '../app/ProgressSummary'
import { SetupGuide } from '../app/SetupGuide'
import { ThemeToggle } from '../app/ThemeToggle'
import { suggestChallenge } from '../challenges/generate'
import { PERSONALITIES } from '../interviewer/personalities'
import { DURATIONS, INTERVIEW_TYPES, MODES, type SessionOptions } from '../interviewer/session'
import { llmConfigFrom, sessionDefaultsFrom, updateSettings, useSettings } from '../settings/settings'
import {
  createBoard,
  deleteBoard,
  exportBoard,
  getTranscript,
  importBoard,
  listBoards,
  type BoardMeta,
} from '../library/boards'
import { createShareLink } from '../library/share'

function formatEdited(timestamp: number): string {
  const date = new Date(timestamp)
  const sameDay = date.toDateString() === new Date().toDateString()
  return sameDay
    ? `Edited today, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : `Edited ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export function Home() {
  const navigate = useNavigate()
  const settings = useSettings()
  const session = sessionDefaultsFrom(settings)
  const [brief, setBrief] = useState('')
  const [boards, setBoards] = useState<BoardMeta[] | null>(null)
  const [pendingDelete, setPendingDelete] = useState<BoardMeta | null>(null)

  useEffect(() => {
    void listBoards().then(setBoards)
  }, [])

  // The choices are remembered as the defaults for next time.
  const setOption = (patch: Partial<SessionOptions>) => updateSettings(patch)

  const start = async (text: string) => {
    const board = await createBoard(text, session)
    void navigate(`/board/${board.id}`)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void start(brief)
    }
  }

  // Starts a fresh board on the same problem, to compare attempts.
  const retryBoard = async (board: BoardMeta) => {
    // When the interviewer chose the problem, it is their first message.
    const stated = (await getTranscript(board.id)).find((message) => message.role === 'assistant')
    const copy = await createBoard(board.brief || stated?.content || '', board.session ?? session)
    void navigate(`/board/${copy.id}`)
  }

  const fileInput = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState('')
  const [shareNotice, setShareNotice] = useState('')

  const copyShareLink = async (board: BoardMeta) => {
    setImportError('')
    try {
      await navigator.clipboard.writeText(await createShareLink(board.id))
      setShareNotice(`Link to “${board.title}” copied. Anyone with the link can view the board.`)
    } catch (cause) {
      setShareNotice('')
      setImportError(cause instanceof Error ? cause.message : 'Could not create the link.')
    }
  }

  // Saves the board, its drawing and its transcript as one file.
  const downloadBoard = async (board: BoardMeta) => {
    const file = await exportBoard(board.id)
    if (!file) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${board.title.replace(/[^\w -]+/g, '').trim() || 'board'}.wytboard.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImportError('')
    try {
      await importBoard(JSON.parse(await file.text()))
      setBoards(await listBoards())
    } catch (cause) {
      setImportError(
        cause instanceof SyntaxError
          ? 'This file could not be read as a board.'
          : cause instanceof Error
            ? cause.message
            : 'Import failed.',
      )
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await deleteBoard(pendingDelete.id)
    setPendingDelete(null)
    setBoards(await listBoards())
  }

  return (
    <div className="bg-background h-full overflow-y-auto">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Brand />
        <div className="flex items-center gap-1">
          <Button variant="ghost" onPress={() => void navigate('/learn')}>
            <BookOpen className="size-4.5" />
            Learn
          </Button>
          <Button variant="ghost" onPress={() => void navigate('/settings')}>
            <Settings className="size-4.5" />
            Settings
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="pt-[7vh] pb-14">
          <h1 className="text-center text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            What do you want to practise today?
          </h1>
          <p className="text-muted mt-3 text-center text-base text-balance">
            Describe a challenge, a domain or a company. Leave it empty and the interviewer picks
            a problem for you.
          </p>

          <div className="bg-surface shadow-float focus-within:ring-accent/40 mt-8 rounded-3xl p-4 transition-shadow focus-within:ring-2">
            <TextArea
              aria-label="What do you want to practise today?"
              className="w-full resize-none border-0 bg-transparent px-2 py-1 text-base shadow-none outline-none focus:ring-0"
              placeholder="e.g. Design a booking flow for a dental clinic"
              rows={2}
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              onKeyDown={onKeyDown}
            />

            <div className="border-separator mt-3 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4">
              <OptionSelect
                label="Interview type"
                value={session.interviewType}
                options={INTERVIEW_TYPES}
                onChange={(interviewType) => setOption({ interviewType })}
              />
              <OptionSelect
                label="Interviewer"
                value={session.personality}
                options={PERSONALITIES.map((p) => ({ id: p.id, label: `${p.name} · ${p.label}` }))}
                onChange={(personality) => setOption({ personality })}
              />
              <OptionSelect
                label="Duration"
                value={session.durationMin}
                options={DURATIONS.map((minutes) => ({ id: minutes, label: `${minutes} min` }))}
                onChange={(durationMin) => setOption({ durationMin })}
              />
              <OptionSelect
                label="Mode"
                value={session.mode}
                options={MODES}
                onChange={(mode) => setOption({ mode })}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                <Button variant="ghost" onPress={() => void start('')}>
                  <SquarePen className="size-4" />
                  Blank board
                </Button>
                <Button
                  variant="ghost"
                  onPress={() => setBrief(suggestChallenge(session.interviewType))}
                >
                  <Dices className="size-4" />
                  Suggest a challenge
                </Button>
              </div>
              <Button variant="primary" onPress={() => void start(brief)}>
                Start practising
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>

        {!llmConfigFrom(settings) && <SetupGuide />}

        {boards && <ProgressSummary boards={boards} />}

        <section aria-labelledby="library-heading">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="library-heading" className="text-lg font-semibold tracking-tight">
              Your boards
            </h2>
            <div className="flex items-center gap-3">
              {boards && boards.length > 0 && (
                <span className="text-muted text-sm">
                  {boards.length} {boards.length === 1 ? 'board' : 'boards'}
                </span>
              )}
              <Button size="sm" variant="tertiary" onPress={() => fileInput.current?.click()}>
                <Upload className="size-4" />
                Import board
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                className="hidden"
                aria-label="Import a board file"
                onChange={(event) => void onImport(event)}
              />
            </div>
          </div>

          <p className="text-muted -mt-2 mb-4 text-sm">
            Saved only in this browser. Nobody else can see a board unless you share its link or
            an exported file.
          </p>

          {shareNotice && (
            <p role="status" className="text-success mb-4 text-sm">
              {shareNotice}
            </p>
          )}

          {importError && (
            <p role="alert" className="text-danger mb-4 text-sm">
              {importError}
            </p>
          )}

          {boards?.length === 0 && (
            <div className="border-border text-muted rounded-3xl border border-dashed px-6 py-12 text-center text-sm">
              No boards yet. Boards you start are saved here automatically, and you can import a
              board exported from another device.
            </div>
          )}

          {boards && boards.length > 0 && (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <li
                  key={board.id}
                  className="bg-surface shadow-float group relative overflow-hidden rounded-3xl"
                >
                  <button
                    type="button"
                    className="focus-visible:ring-accent block w-full cursor-pointer rounded-3xl text-left outline-none focus-visible:ring-2"
                    onClick={() => void navigate(`/board/${board.id}`)}
                  >
                    <div className="border-separator aspect-[16/10] border-b bg-white">
                      {board.thumbnail ? (
                        <img
                          src={board.thumbnail}
                          alt=""
                          className="size-full object-contain p-3"
                        />
                      ) : (
                        <div className="text-muted flex size-full items-center justify-center text-sm">
                          Empty board
                        </div>
                      )}
                    </div>
                    <div className="pt-3.5 pr-12 pb-5 pl-5">
                      <p className="truncate text-sm font-medium">{board.title}</p>
                      <p className="text-muted mt-0.5 text-xs">{formatEdited(board.updatedAt)}</p>
                    </div>
                  </button>

                  <div className="absolute right-3 bottom-4">
                    <Dropdown>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        aria-label={`Options for ${board.title}`}
                      >
                        <Ellipsis className="size-4" />
                      </Button>
                      <Dropdown.Popover placement="bottom end">
                        <Dropdown.Menu
                          onAction={(key) => {
                            if (key === 'open') void navigate(`/board/${board.id}`)
                            if (key === 'retry') void retryBoard(board)
                            if (key === 'share') void copyShareLink(board)
                            if (key === 'export') void downloadBoard(board)
                            if (key === 'delete') setPendingDelete(board)
                          }}
                        >
                          <Dropdown.Item id="open" textValue="Open">
                            <Label>Open</Label>
                          </Dropdown.Item>
                          <Dropdown.Item id="retry" textValue="Retry this problem">
                            <Label>Retry this problem</Label>
                          </Dropdown.Item>
                          <Dropdown.Item id="share" textValue="Copy share link">
                            <Label>Copy share link</Label>
                          </Dropdown.Item>
                          <Dropdown.Item id="export" textValue="Export">
                            <Label>Export</Label>
                          </Dropdown.Item>
                          <Dropdown.Item id="delete" textValue="Delete" variant="danger">
                            <Label>Delete</Label>
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <AlertDialog.Backdrop
        isOpen={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-md">
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete this board?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              “{pendingDelete?.title}” and its interview transcript will be removed from this
              browser. This cannot be undone.
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="tertiary" onPress={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" onPress={() => void confirmDelete()}>
                Delete board
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </div>
  )
}
