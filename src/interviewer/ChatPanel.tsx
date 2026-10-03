import { Button, Spinner, TextArea, Tooltip } from '@heroui/react'
import { ChevronDown, ChevronUp, Lightbulb, Mic, ScanEye, SendHorizontal, Square, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { getTranscript, saveTranscript, type TranscriptMessage } from '../library/boards'
import type { BoardCapture } from '../canvas/Board'
import { LlmError, chat, type ChatMessage, type ContentPart } from '../llm/client'
import {
  llmConfigFrom,
  sessionDefaultsFrom,
  updateSettings,
  useSettings,
} from '../settings/settings'
import { browserRecognition } from '../voice/recognition'
import { kokoroSpeech, preloadKokoro } from '../voice/kokoro'
import { browserSpeech } from '../voice/speech'
import { avatarFor, getPersonality } from './personalities'
import { HINT_BUDGET } from './phases'
import { HINT_CUE, OPENING_CUE, REVIEW_CUE, RULE_REMINDER, buildSystemPrompt } from './prompts'
import { getInterviewType, type SessionOptions } from './session'
import { VoiceWave } from './VoiceWave'

/** Caps reply length so the interviewer cannot produce a full solution. */
const MAX_REPLY_TOKENS = 800
interface ChatPanelProps {
  boardId: string
  brief: string
  /** Absent on boards made before session options existed; settings are used then. */
  session?: SessionOptions
  captureBoard: () => Promise<BoardCapture> | undefined
  startedAt?: number
  ended: boolean
  hintsUsed: number
  onStart: () => number
  onHintUsed: () => void
}

/** Turns sent to the model: the opening exchange plus the most recent ones. */
const RECENT_TURNS = 24

/**
 * Keeps long sessions inside free-tier limits without extra requests: the
 * problem statement always stays, older middle turns are left out. The full
 * transcript is still saved and used for feedback.
 */
function recentHistory(history: TranscriptMessage[]): TranscriptMessage[] {
  if (history.length <= RECENT_TURNS + 2) return history
  return [...history.slice(0, 2), ...history.slice(-RECENT_TURNS)]
}

/** The one board image kept in the conversation, and the turn it belongs to. */
interface SentSnapshot {
  messageId: string
  version: number
  image: string
}

export function ChatPanel(props: ChatPanelProps) {
  const { boardId, brief, session: boardSession, captureBoard } = props
  const settings = useSettings()
  const config = llmConfigFrom(settings)
  const session = boardSession ?? sessionDefaultsFrom(settings)
  const personality = getPersonality(session.personality)
  const avatar = avatarFor(session.personality)
  const speech = settings.voiceEngine === 'kokoro' && kokoroSpeech.supported ? kokoroSpeech : browserSpeech

  const [open, setOpen] = useState(true)
  const [messages, setMessages] = useState<TranscriptMessage[] | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [recording, setRecording] = useState(false)
  const snapshot = useRef<SentSnapshot | null>(null)
  const heard = useRef('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    void getTranscript(boardId).then((stored) => {
      if (!cancelled) setMessages(stored)
    })
    return () => {
      cancelled = true
      kokoroSpeech.stop()
      browserRecognition.stop()
    }
  }, [boardId])

  // Loading the natural voice takes several seconds, so start as the board opens
  // rather than when the first reply arrives.
  const usesKokoro = speech === kokoroSpeech && settings.voiceEnabled
  useEffect(() => {
    if (usesKokoro) void preloadKokoro(() => undefined).catch(() => undefined)
  }, [usesKokoro])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, busy, open])

  const stopSpeaking = () => {
    kokoroSpeech.stop()
    setSpeaking(false)
  }

  const toggleVoice = () => {
    if (settings.voiceEnabled) stopSpeaking()
    updateSettings({ voiceEnabled: !settings.voiceEnabled })
  }

  const send = async (
    content: string,
    options: { hidden?: boolean; review?: boolean; hint?: boolean } = {},
  ) => {
    if (!config || !messages || busy) return
    // The timer starts with the first turn.
    const startedAt = props.startedAt ?? props.onStart()
    stopSpeaking()

    const userMessage: TranscriptMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      hidden: options.hidden,
    }
    const history = [...messages, userMessage]
    setMessages(history)
    setDraft('')
    setError('')
    setBusy(true)

    try {
      // Quota rule: a new image is sent only when the board changed since the
      // last one, or when the user explicitly asks for a review.
      const sent = recentHistory(history)
      // If the turn carrying the board image has scrolled out, send the board again.
      if (!sent.some((message) => message.id === snapshot.current?.messageId)) snapshot.current = null
      const board = await captureBoard()
      if (board?.image && (options.review || board.version !== snapshot.current?.version)) {
        snapshot.current = { messageId: userMessage.id, version: board.version, image: board.image }
      }
      const boardText = board?.texts.length
        ? `\n\nText typed on the board:\n${board.texts.map((text) => `- ${text}`).join('\n')}`
        : ''

      const buildRequest = (withImage: boolean): ChatMessage[] => [
        { role: 'system', content: buildSystemPrompt({ ...session, brief, startedAt }) },
        ...sent.map((message, index): ChatMessage => {
          const isLast = index === sent.length - 1
          const text = isLast ? `${message.content}${boardText}\n\n${RULE_REMINDER}` : message.content
          // Only the latest snapshot stays in the conversation; older images are dropped.
          if (withImage && message.id === snapshot.current?.messageId) {
            const parts: ContentPart[] = [
              { type: 'text', text },
              { type: 'image_url', image_url: { url: snapshot.current.image } },
            ]
            return { role: message.role, content: parts }
          }
          return { role: message.role, content: text }
        }),
      ]

      let reply: string
      try {
        reply = await chat(config, buildRequest(true), { maxTokens: MAX_REPLY_TOKENS })
      } catch (cause) {
        // A model that cannot read images rejects the request; fall back to text only.
        const rejected = cause instanceof LlmError && cause.status === 400 && snapshot.current
        if (!rejected) throw cause
        reply = await chat(config, buildRequest(false), { maxTokens: MAX_REPLY_TOKENS })
        snapshot.current = null
        setNotice('This model could not read the board image, so only typed text was sent.')
      }

      const next: TranscriptMessage[] = [
        ...history,
        { id: crypto.randomUUID(), role: 'assistant', content: reply },
      ]
      setMessages(next)
      if (settings.voiceEnabled) {
        speech.speak(reply, {
          ...personality.voice,
          onStart: () => setSpeaking(true),
          onEnd: () => setSpeaking(false),
        })
      }
      await saveTranscript(boardId, next)
      if (options.hint) props.onHintUsed()
    } catch (cause) {
      // Drop the unanswered turn so the user can retry without duplicates.
      setMessages(messages)
      if (!options.hidden) setDraft(content)
      setError(cause instanceof Error ? cause.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  // Tap to start talking, tap again to stop; what was heard is sent as the turn.
  const toggleRecording = () => {
    if (recording) {
      browserRecognition.stop()
      return
    }
    stopSpeaking()
    setError('')
    heard.current = ''
    setRecording(true)
    browserRecognition.start({
      onText: (text) => {
        heard.current = text
        setDraft(text)
      },
      onError: setError,
      onEnd: () => {
        setRecording(false)
        if (heard.current) void send(heard.current)
      },
    })
  }

  const visible = messages?.filter((message) => !message.hidden) ?? []
  const started = (messages?.length ?? 0) > 0

  // Ctrl+M starts and stops talking from anywhere, so the hands can stay on the board.
  const canTalk = Boolean(config) && started && !props.ended && browserRecognition.supported && !busy
  const toggleRef = useRef(toggleRecording)
  useEffect(() => {
    toggleRef.current = toggleRecording
  })
  useEffect(() => {
    if (!canTalk) return
    const onShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'm') {
        event.preventDefault()
        toggleRef.current()
      }
    }
    window.addEventListener('keydown', onShortcut, true)
    return () => window.removeEventListener('keydown', onShortcut, true)
  }, [canTalk])

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (draft.trim()) void send(draft.trim())
    }
  }

  const status = recording ? 'Hearing you' : speaking ? 'Speaking' : busy ? 'Thinking' : 'Listening'

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
              onPress={() => void send(OPENING_CUE, { hidden: true })}
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

        {notice && <p className="text-muted text-xs">{notice}</p>}

        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}
      </div>

      {config && started && props.ended && (
        <p className="border-separator text-muted border-t px-4 py-3 text-sm">
          This session has ended. The transcript is kept with the board.
        </p>
      )}

      {config && started && !props.ended && (
        <div className="border-separator border-t p-2">
          <div className="flex items-end gap-2">
            <TextArea
              aria-label={`Message ${personality.name}`}
              className="max-h-32 min-h-9 flex-1 resize-none text-sm"
              placeholder={recording ? 'Listening… Ctrl+M or stop when done' : 'Talk (Ctrl+M) or type…'}
              rows={1}
              value={draft}
              readOnly={recording}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
            />
            {browserRecognition.supported && (
              <Tooltip delay={400}>
                <Button
                  isIconOnly
                  variant={recording ? 'danger' : 'secondary'}
                  aria-label={recording ? 'Stop and send' : 'Talk'}
                  isDisabled={busy}
                  onPress={toggleRecording}
                >
                  {recording ? <Square className="size-3.5" /> : <Mic className="size-4" />}
                </Button>
                <Tooltip.Content>{recording ? 'Stop and send (Ctrl+M)' : 'Talk (Ctrl+M)'}</Tooltip.Content>
              </Tooltip>
            )}
            <Button
              isIconOnly
              variant="primary"
              aria-label="Send message"
              isDisabled={!draft.trim() || busy || recording}
              onPress={() => void send(draft.trim())}
            >
              <SendHorizontal className="size-4" />
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-1"
            isDisabled={busy || recording}
            onPress={() => void send(REVIEW_CUE, { review: true })}
          >
            <ScanEye className="size-4" />
            Review my board
          </Button>
          {session.mode === 'practice' && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-1"
              isDisabled={busy || recording || props.hintsUsed >= HINT_BUDGET}
              onPress={() => void send(HINT_CUE, { hint: true })}
            >
              <Lightbulb className="size-4" />
              Hint ({HINT_BUDGET - props.hintsUsed} left)
            </Button>
          )}
        </div>
      )}
    </aside>
  )
}
