import { Button, Modal } from '@heroui/react'
import type { Feedback } from './feedback'

interface FeedbackDialogProps {
  feedback: Feedback | null
  isOpen: boolean
  onClose: () => void
}

export function FeedbackDialog({ feedback, isOpen, onClose }: FeedbackDialogProps) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-xl">
          <Modal.Header>
            <Modal.Heading>Session feedback</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-5">
            {feedback && (
              <>
                <p className="text-sm">{feedback.summary}</p>

                <ul className="flex flex-col gap-3">
                  {feedback.scores.map((entry) => (
                    <li key={entry.criterion}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium">{entry.criterion}</span>
                        <span className="text-sm font-semibold tabular-nums">{entry.score} / 5</span>
                      </div>
                      <div className="bg-default mt-1.5 h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-accent h-full rounded-full"
                          style={{ width: `${(entry.score / 5) * 100}%` }}
                        />
                      </div>
                      <p className="text-muted mt-1.5 text-xs">{entry.comment}</p>
                    </li>
                  ))}
                </ul>

                {[
                  { title: 'What went well', items: feedback.strengths },
                  { title: 'What to do differently', items: feedback.improvements },
                ].map(
                  (group) =>
                    group.items.length > 0 && (
                      <div key={group.title}>
                        <h3 className="text-sm font-semibold">{group.title}</h3>
                        <ul className="text-muted mt-1.5 list-disc space-y-1 pl-5 text-sm">
                          {group.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ),
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onPress={onClose}>
              Close
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
