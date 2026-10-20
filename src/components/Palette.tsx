import type { PointerEventHandler } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { FIELD_TYPE_KEYS, FIELD_TYPES } from '../schema/fieldTypes'
import type { FieldType } from '../schema/types'

interface Props {
  onAdd: (type: FieldType) => void
}

export default function Palette({ onAdd }: Props) {
  return (
    <nav className="palette" aria-label="Add a field">
      <h2>Add a field</h2>
      <p className="hint">Click to add after the selected field, or drag into the form.</p>
      <ul>
        {FIELD_TYPE_KEYS.map((type) => (
          <PaletteItem key={type} type={type} onAdd={onAdd} />
        ))}
      </ul>
    </nav>
  )
}

function PaletteItem({ type, onAdd }: { type: FieldType; onAdd: (type: FieldType) => void }) {
  const { setNodeRef, listeners, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { kind: 'palette', fieldType: type },
  })
  const info = FIELD_TYPES[type]
  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        className={`palette-item${isDragging ? ' dragging' : ''}`}
        onClick={() => onAdd(type)}
        // Pointer only: from the keyboard, Enter adds the field instead of starting a drag.
        onPointerDown={listeners?.onPointerDown as PointerEventHandler | undefined}
      >
        <span className="glyph" aria-hidden="true">
          {info.glyph}
        </span>
        {info.label}
      </button>
    </li>
  )
}
