import { Button, Chip, Spinner, TextArea } from '@heroui/react'
import { ChevronDown, ChevronUp, MessageCircle, SendHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { getTranscript, saveTranscript, type TranscriptMessage } from '../library/boards'
import { chat, type ChatMessage } from '../llm/client'
import { llmConfigFrom, useSettings } from '../settings/settings'
import { getPersonality } from './personalities'
import { OPENING_CUE, RULE_REMINDER, buildSystemPrompt } from './prompts'

/** Caps reply length so the interviewer cannot produce a full solution. */
const MAX_REPLY_TOKENS = 500
/** Below this width the panel starts collapsed so it does not cover the canvas. */
const COLLAPSE_BELOW_PX = 900

interface ChatPanelProps {
  boardId: string
  brief: string
}

export function ChatPanel({ boardId, brief }: ChatPanelProps) {
  const settings = useSettings()
  const config = llmConfigFrom(settings)
  const [open, setOpen] = useState(() => window.innerWidth >= COLLAPSE_BELOW_PX)
  const [messages, setMessages] = useState<TranscriptMessage[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    void getTranscript(boardId).then((stored) => {
      if (!cancelled) setMessages(stored)
    })
    return () => {
      cancelled = true
    }
  }, [boardId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, busy, open])

  const send = async (content: string, hidden = false) => {
    if (!config || !messages || busy) return

    const userMessage: TranscriptMessage = { id: crypto.randomUUID(), role: 'user', content, hidden }
    const history = [...messages, userMessage]
    setMessages(history)
    setDraft('')
    setError('')
    setBusy(true)

    const request: ChatMessage[] = [
      {
        role: 'system',
        content: buildSystemPrompt({ personality: settings.personality, mode: settings.mode, brief }),
      },
      ...history.map((message, index) => ({
        role: message.role,
        content:
          index === history.length - 1 ? `${message.content}\n\n${RULE_REMINDER}` : message.content,
      })),
    ]

    try {
      const reply = await chat(config, request, { maxTokens: MAX_REPLY_TOKENS })
      const next: TranscriptMessage[] = [
        ...history,
        { id: crypto.randomUUID(), role: 'assistant', content: reply },
      ]
      setMessages(next)
      await saveTranscript(boardId, next)
    } catch (cause) {
      // Drop the unanswered turn so the user can retry without duplicates.
      setMessages(messages)
      if (!hidden) setDraft(content)
      setError(cause instanceof Error ? cause.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (draft.trim()) void send(draft.trim())
    }
  }

  const visible = messages?.filter((message) => !message.hidden) ?? []
  const started = (messages?.length ?? 0) > 0

  if (!open) {
    return (
      <div className="bg-surface shadow-float absolute top-4 right-4 z-10 rounded-xl">
        <Button size="sm" variant="ghost" className="h-9" onPress={() => setOpen(true)}>
          <MessageCircle className="size-4" />
          Interviewer
          <ChevronDown className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <aside
      aria-label="Interviewer"
      className="bg-surface shadow-float absolute top-4 right-4 z-10 flex max-h-[min(34rem,calc(100%-7rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl"
    >
      <header className="border-separator flex items-center gap-2 border-b py-2 pr-2 pl-4">
        <MessageCircle className="text-accent size-4 shrink-0" />
        <h2 className="text-sm font-semibold">Interviewer</h2>
        <Chip size="sm" variant="soft" color="accent">
          {getPersonality(settings.personality).label}
        </Chip>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          className="ml-auto"
          aria-label="Collapse interviewer panel"
          onPress={() => setOpen(false)}
        >
          <ChevronUp className="size-4" />
        </Button>
      </header>

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {brief && (
          <div className="bg-default rounded-xl px-3 py-2.5">
            <p className="text-muted text-xs font-medium">You asked to practise</p>
            <p className="mt-1 text-sm whitespace-pre-wrap">{brief}</p>
          </div>
        )}

        {!config && (
          <div className="text-muted text-sm">
            <p>The interviewer needs an AI provider, API key and model before it can talk.</p>
            <Link
              to="/settings"
              className="text-accent mt-2 inline-block font-medium underline-offset-4 hover:underline"
            >
              Open settings
            </Link>
          </div>
        )}

        {config && messages && !started && !busy && (
          <div className="text-muted text-sm">
            <p>The interviewer will present the problem and then let you lead.</p>
            <Button
              className="mt-3"
              size="sm"
              variant="primary"
              onPress={() => void send(OPENING_CUE, true)}
            >
              Start interview
            </Button>
          </div>
        )}

        {visible.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'bg-accent text-accent-foreground max-w-[85%] self-end rounded-2xl rounded-br-md px-3 py-2 text-sm whitespace-pre-wrap'
                : 'bg-default max-w-[85%] self-start rounded-2xl rounded-bl-md px-3 py-2 text-sm whitespace-pre-wrap'
            }
          >
            {message.content}
          </div>
        ))}

        {busy && (
          <div className="text-muted flex items-center gap-2 self-start text-sm">
            <Spinner size="sm" />
            Thinking…
          </div>
        )}

        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
      </div>

      {config && started && (
        <div className="border-separator flex items-end gap-2 border-t p-2">
          <TextArea
            aria-label="Message the interviewer"
            className="max-h-32 min-h-9 flex-1 resize-none text-sm"
            placeholder="Ask or answer…"
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <Button
            isIconOnly
            variant="primary"
            aria-label="Send message"
            isDisabled={!draft.trim() || busy}
            onPress={() => void send(draft.trim())}
          >
            <SendHorizontal className="size-4" />
          </Button>
        </div>
      )}
    </aside>
  )
}
