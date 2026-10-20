import { useEffect, useRef } from 'react'
import { TEMPLATES } from '../schema/templates'
import type { FormSchema } from '../schema/types'
import { emptySchema } from '../state/builder'

interface Props {
  open: boolean
  onClose: () => void
  onPick: (schema: FormSchema) => void
}

export default function NewFormDialog({ open, onClose, onPick }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal?.()
    if (!open && dialog.open) dialog.close?.()
  }, [open])

  const pick = (schema: FormSchema) => {
    // Templates are shared objects: hand out a copy the builder can own.
    onPick(structuredClone(schema))
    onClose()
  }

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="new-form-title">
      <h2 id="new-form-title">Start a new form</h2>
      <p className="hint">The current form is replaced. You can still undo.</p>
      <ul className="templates">
        <li>
          <button type="button" onClick={() => pick(emptySchema())}>
            <strong>Blank form</strong>
            <span>Start from nothing.</span>
          </button>
        </li>
        {TEMPLATES.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => pick(t.schema)}>
              <strong>{t.name}</strong>
              <span>{t.blurb}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="ghost" onClick={onClose}>
        Cancel
      </button>
    </dialog>
  )
}
