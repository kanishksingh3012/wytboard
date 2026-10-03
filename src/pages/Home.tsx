import { AlertDialog, Button, Dropdown, Label, TextArea } from '@heroui/react'
import { ArrowRight, Ellipsis, Settings, SquarePen } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { Brand } from '../app/Brand'
import { ThemeToggle } from '../app/ThemeToggle'
import { createBoard, deleteBoard, listBoards, type BoardMeta } from '../library/boards'

const EXAMPLES = [
  'Design a grocery delivery app for older adults',
  'Improve onboarding for a fintech app',
  'A whiteboard challenge for a travel company',
]

function formatEdited(timestamp: number): string {
  const date = new Date(timestamp)
  const sameDay = date.toDateString() === new Date().toDateString()
  return sameDay
    ? `Edited today, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : `Edited ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export function Home() {
  const navigate = useNavigate()
  const [brief, setBrief] = useState('')
  const [boards, setBoards] = useState<BoardMeta[] | null>(null)
  const [pendingDelete, setPendingDelete] = useState<BoardMeta | null>(null)

  useEffect(() => {
    void listBoards().then(setBoards)
  }, [])

  const start = async (text: string) => {
    const board = await createBoard(text)
    void navigate(`/board/${board.id}`)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && brief.trim()) {
      event.preventDefault()
      void start(brief)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await deleteBoard(pendingDelete.id)
    setPendingDelete(null)
    setBoards(await listBoards())
  }

  return (
    <div className="dot-grid h-full overflow-y-auto">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Brand />
        <div className="flex items-center gap-1">
          <Button variant="ghost" onPress={() => void navigate('/settings')}>
            <Settings className="size-4.5" />
            Settings
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="mx-auto max-w-2xl pt-[10vh] pb-16 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            What do you want to practise today?
          </h1>
          <p className="text-muted mt-3 text-base text-balance">
            Describe a design challenge, a domain or the kind of company you are preparing for.
          </p>

          <div className="bg-surface shadow-float focus-within:ring-accent/40 mt-8 rounded-3xl p-3 text-left transition-shadow focus-within:ring-2">
            <TextArea
              aria-label="What do you want to practise today?"
              className="w-full resize-none border-0 bg-transparent px-3 py-2 text-base shadow-none outline-none focus:ring-0"
              placeholder="e.g. Design a booking flow for a dental clinic"
              rows={2}
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              onKeyDown={onKeyDown}
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              <Button variant="ghost" onPress={() => void start('')}>
                <SquarePen className="size-4" />
                Blank board
              </Button>
              <Button
                variant="primary"
                isDisabled={!brief.trim()}
                onPress={() => void start(brief)}
              >
                Start practising
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((example) => (
              <Button key={example} size="sm" variant="tertiary" onPress={() => setBrief(example)}>
                {example}
              </Button>
            ))}
          </div>
        </section>

        <section aria-labelledby="library-heading">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="library-heading" className="text-lg font-semibold tracking-tight">
              Your boards
            </h2>
            {boards && boards.length > 0 && (
              <span className="text-muted text-sm">
                {boards.length} {boards.length === 1 ? 'board' : 'boards'}
              </span>
            )}
          </div>

          {boards?.length === 0 && (
            <div className="border-border text-muted rounded-3xl border border-dashed px-6 py-12 text-center text-sm">
              No boards yet. Boards you start are saved here automatically.
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
                    <div className="py-3 pr-12 pl-4">
                      <p className="truncate text-sm font-medium">{board.title}</p>
                      <p className="text-muted mt-0.5 text-xs">{formatEdited(board.updatedAt)}</p>
                    </div>
                  </button>

                  <div className="absolute right-2 bottom-2.5">
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
                            if (key === 'delete') setPendingDelete(board)
                          }}
                        >
                          <Dropdown.Item id="open" textValue="Open">
                            <Label>Open</Label>
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
