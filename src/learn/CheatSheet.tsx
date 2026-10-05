import { Button, Modal } from '@heroui/react'
import { CHEAT_SHEET } from './content'

interface CheatSheetProps {
  isOpen: boolean
  onClose: () => void
}

/** The five steps on one screen. Offered on the board in practice mode only. */
export function CheatSheet({ isOpen, onClose }: CheatSheetProps) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-2xl">
          <Modal.Header>
            <Modal.Heading>Cheat sheet</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {CHEAT_SHEET.map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm font-semibold">{group.title}</h3>
                  <ul className="text-muted mt-1 list-disc space-y-0.5 pl-5 text-sm">
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onPress={onClose}>
              Back to the board
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
