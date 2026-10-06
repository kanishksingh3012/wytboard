import { Button, Input, Label, TextArea, TextField } from '@heroui/react'
import { MessageSquarePlus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router'

/**
 * Where feedback is posted as JSON. Set VITE_FEEDBACK_URL in `.env` to a form
 * service endpoint (e.g. Formspree). The button is hidden until it is set,
 * because Wytboard has no server of its own to receive messages.
 */
const FEEDBACK_URL: string = import.meta.env.VITE_FEEDBACK_URL ?? ''

type State = 'idle' | 'sending' | 'sent' | 'error'

export function FeedbackButton() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [trap, setTrap] = useState('')
  const [state, setState] = useState<State>('idle')

  if (!FEEDBACK_URL) return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!message.trim() || state === 'sending') return
    // Bots fill every field; people never see this one.
    if (trap) return setState('sent')

    setState('sending')
    try {
      const response = await fetch(FEEDBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email.trim(), message: message.trim(), page: pathname }),
      })
      if (!response.ok) throw new Error(String(response.status))
      setState('sent')
      setMessage('')
    } catch {
      setState('error')
    }
  }

  const close = () => {
    setOpen(false)
    if (state !== 'sending') setState('idle')
  }

  // On a board the bottom-right corner already holds the canvas help button.
  const onBoard = pathname.startsWith('/board/')
  const corner = `fixed right-4 z-20 ${onBoard ? 'bottom-16' : 'bottom-4'}`

  if (!open) {
    return (
      <div className={`${corner} bg-surface shadow-float rounded-full`}>
        <Button variant="ghost" className="rounded-full" onPress={() => setOpen(true)}>
          <MessageSquarePlus className="size-4" />
          Feedback
        </Button>
      </div>
    )
  }

  return (
    <section
      aria-label="Send feedback"
      className={`${corner} bg-surface shadow-float w-[min(22rem,calc(100vw-2rem))] rounded-2xl p-4`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Send feedback</h2>
        <Button isIconOnly size="sm" variant="ghost" aria-label="Close feedback" onPress={close}>
          <X className="size-4" />
        </Button>
      </div>

      {state === 'sent' ? (
        <p role="status" className="mt-3 text-sm">
          Thank you. Your feedback has been sent.
        </p>
      ) : (
        <form className="mt-3 flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
          <TextField value={message} onChange={setMessage} isRequired>
            <Label>What should be better?</Label>
            <TextArea rows={4} placeholder="A bug, an idea, anything that got in your way" />
          </TextField>
          <TextField type="email" value={email} onChange={setEmail}>
            <Label>Your email (optional)</Label>
            <Input placeholder="Only if you would like a reply" />
          </TextField>
          <input
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
            value={trap}
            onChange={(event) => setTrap(event.target.value)}
          />
          {state === 'error' && (
            <p role="alert" className="text-danger text-sm">
              Could not send. Check your connection and try again.
            </p>
          )}
          <Button type="submit" variant="primary" isDisabled={!message.trim()} isPending={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Send'}
          </Button>
        </form>
      )}
    </section>
  )
}
