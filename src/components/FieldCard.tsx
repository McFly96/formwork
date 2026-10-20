import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import FieldControl from './FieldControl'
import { FIELD_TYPES } from '../schema/fieldTypes'
import { describeCondition } from '../schema/describe'
import type { Field, FormSchema } from '../schema/types'
import type { Action } from '../state/builder'

interface Props {
  field: Field
  index: number
  schema: FormSchema
  selected: boolean
  dropBefore: boolean
  dispatch: (action: Action) => void
}

export default function FieldCard({ field, index, schema, selected, dropBefore, dispatch }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { kind: 'field' },
  })
  const last = schema.fields.length - 1
  const label = field.label.trim() || 'Untitled field'
  const isSection = field.type === 'section'

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`card${selected ? ' selected' : ''}${isDragging ? ' dragging' : ''}${isSection ? ' section' : ''}${dropBefore ? ' drop-before' : ''}`}
      onClick={() => dispatch({ type: 'select', id: field.id })}
    >
      <div className="card-head">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="handle"
          aria-label={`Move ${label}`}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <span className="card-type">{FIELD_TYPES[field.type].label}</span>
        <div className="card-actions">
          <button
            type="button"
            className="icon"
            aria-label={`Move ${label} up`}
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ type: 'move', from: index, to: index - 1 })
            }}
          >
            ↑
          </button>
          <button
            type="button"
            className="icon"
            aria-label={`Move ${label} down`}
            disabled={index === last}
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ type: 'move', from: index, to: index + 1 })
            }}
          >
            ↓
          </button>
          <button
            type="button"
            className="icon"
            aria-label={`Duplicate ${label}`}
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ type: 'duplicate', id: field.id })
            }}
          >
            ⧉
          </button>
          <button
            type="button"
            className="icon danger"
            aria-label={`Delete ${label}`}
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ type: 'remove', id: field.id })
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* The whole card selects the field; this button makes that reachable from the keyboard. */}
      <button type="button" className="card-body" aria-pressed={selected} aria-label={`Edit ${label}`}>
        {isSection ? (
          <span className="section-title">{label}</span>
        ) : (
          <span className="field-label" id={`label-${field.id}`}>
            {label}
            {field.required && <span className="required" aria-hidden="true"> *</span>}
          </span>
        )}
      </button>
      {field.help && <p className="help">{field.help}</p>}
      {!isSection && (
        <div className="card-preview" aria-hidden="true">
          <FieldControl field={field} value={undefined} inert />
        </div>
      )}
      {field.condition && <p className="rule">Shown if {describeCondition(field.condition, schema)}</p>}
    </li>
  )
}
