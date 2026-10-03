import { Button, Spinner, TextArea, Tooltip } from '@heroui/react'
import { ChevronDown, ChevronUp, SendHorizontal, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { getTranscript, saveTranscript, type TranscriptMessage } from '../library/boards'
import { chat, type ChatMessage } from '../llm/client'
import {
  llmConfigFrom,
  sessionDefaultsFrom,
  updateSettings,
  useSettings,
} from '../settings/settings'
import { browserSpeech } from '../voice/speech'
import { avatarFor, getPersonality } from './personalities'
import { OPENING_CUE, RULE_REMINDER, buildSystemPrompt } from './prompts'
import { getInterviewType, type SessionOptions } from './session'
import { VoiceWave } from './VoiceWave'

/** Caps reply length so the interviewer cannot produce a full solution. */
const MAX_REPLY_TOKENS = 800
/** Below this width the panel starts collapsed so it does not cover the canvas. */
const COLLAPSE_BELOW_PX = 900

interface ChatPanelProps {
  boardId: string
  brief: string
  /** Absent on boards made before session options existed; settings are used then. */
  session?: SessionOptions
}

export function ChatPanel({ boardId, brief, session: boardSession }: ChatPanelProps) {
  const settings = useSettings()
  const config = llmConfigFrom(settings)
  const session = boardSession ?? sessionDefaultsFrom(settings)
  const personality = getPersonality(session.personality)
  const avatar = avatarFor(session.personality)

  const [open, setOpen] = useState(() => window.innerWidth >= COLLAPSE_BELOW_PX)
  const [messages, setMessages] = useState<TranscriptMessage[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    void getTranscript(boardId).then((stored) => {
      if (!cancelled) setMessages(stored)
    })
    return () => {
      cancelled = true
      browserSpeech.stop()
    }
  }, [boardId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, busy, open])

  const stopSpeaking = () => {
    browserSpeech.stop()
    setSpeaking(false)
  }

  const toggleVoice = () => {
    if (settings.voiceEnabled) stopSpeaking()
    updateSettings({ voiceEnabled: !settings.voiceEnabled })
  }

  const send = async (content: string, hidden = false) => {
    if (!config || !messages || busy) return
    stopSpeaking()

    const userMessage: TranscriptMessage = { id: crypto.randomUUID(), role: 'user', content, hidden }
    const history = [...messages, userMessage]
    setMessages(history)
    setDraft('')
    setError('')
    setBusy(true)

    const request: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt({ ...session, brief }) },
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
      if (settings.voiceEnabled) {
        browserSpeech.speak(reply, {
          ...personality.voice,
          onStart: () => setSpeaking(true),
          onEnd: () => setSpeaking(false),
        })
      }
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
  const status = speaking ? 'Speaking' : busy ? 'Thinking' : 'Listening'

  if (!open) {
    return (
      <div className="bg-surface shadow-float absolute top-4 right-4 z-10 rounded-xl">
        <Button size="sm" variant="ghost" className="h-9 pl-1.5" onPress={() => setOpen(true)}>
          <img src={avatar} alt="" className="bg-default size-6 rounded-full" />
          {personality.name}
          <VoiceWave active={speaking} />
          <ChevronDown className="size-4" />
        </Button>
      </div>
    )
  }

  return (
    <aside
      aria-label="Interviewer"
      className="bg-surface shadow-float absolute top-4 right-4 z-10 flex max-h-[min(38rem,calc(100%-7rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl"
    >
      <header className="border-separator flex items-center gap-3 border-b py-3 pr-2 pl-4">
        <img
          src={avatar}
          alt=""
          className={`bg-default size-14 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-(--surface) transition-shadow ${speaking ? 'ring-accent' : 'ring-transparent'}`}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{personality.name}</h2>
          <p className="text-muted truncate text-xs">
            {personality.label} interviewer · {session.durationMin} min
          </p>
          <p className="text-muted mt-1 flex items-center gap-2 text-xs" aria-live="polite">
            <VoiceWave active={speaking} />
            {status}
          </p>
        </div>
        <div className="flex flex-col">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Collapse interviewer panel"
            onPress={() => setOpen(false)}
          >
            <ChevronUp className="size-4" />
          </Button>
          {browserSpeech.supported && (
            <Tooltip delay={400}>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                aria-label={settings.voiceEnabled ? 'Mute interviewer voice' : 'Unmute interviewer voice'}
                onPress={toggleVoice}
              >
                {settings.voiceEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </Button>
              <Tooltip.Content>
                {settings.voiceEnabled ? 'Mute voice' : 'Unmute voice'}
              </Tooltip.Content>
            </Tooltip>
          )}
        </div>
      </header>

      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        <div className="bg-default rounded-xl px-3 py-2.5">
          <p className="text-muted text-xs font-medium">
            {getInterviewType(session.interviewType).label}
          </p>
          <p className="mt-1 text-sm whitespace-pre-wrap">
            {brief || `${personality.name} will pick the problem.`}
          </p>
        </div>

        {!config && (
          <div className="text-muted text-sm">
            <p>{personality.name} needs an AI provider, API key and model before they can talk.</p>
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
            <p>{personality.name} will present the problem and then let you lead.</p>
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
            aria-label={`Message ${personality.name}`}
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
