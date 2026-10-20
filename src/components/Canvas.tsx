import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import FieldCard from './FieldCard'
import type { FormSchema } from '../schema/types'
import type { Action } from '../state/builder'

interface Props {
  schema: FormSchema
  selectedId: string | null
  /** Card a palette item is hovering, to draw the insertion line. */
  dropTargetId: string | null
  dispatch: (action: Action) => void
}

export const CANVAS_DROP_ID = 'canvas'

export default function Canvas({ schema, selectedId, dropTargetId, dispatch }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROP_ID })

  return (
    <section className="canvas" aria-label="Form editor">
      <div className="sheet">
        <textarea
          className="form-title"
          aria-label="Form title"
          rows={1}
          value={schema.title}
          placeholder="Untitled form"
          // A title is one line that wraps, not a paragraph.
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          onChange={(e) => dispatch({ type: 'set-meta', patch: { title: e.target.value.replace(/\n/g, ' ') } })}
        />
        <textarea
          className="form-description"
          aria-label="Form description"
          rows={2}
          value={schema.description}
          placeholder="A line or two about this form (optional)"
          onChange={(e) => dispatch({ type: 'set-meta', patch: { description: e.target.value } })}
        />

        <SortableContext items={schema.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <ol ref={setNodeRef} className={`fields${isOver ? ' over' : ''}`}>
            {schema.fields.map((field, index) => (
              <FieldCard
                key={field.id}
                field={field}
                index={index}
                schema={schema}
                selected={field.id === selectedId}
                dropBefore={dropTargetId === field.id}
                dispatch={dispatch}
              />
            ))}
            {!schema.fields.length && (
              <li className="empty">
                <p>
                  <strong>Nothing here yet.</strong>
                </p>
                <p>Pick a field on the left, drag one in, or start from a template.</p>
              </li>
            )}
          </ol>
        </SortableContext>
      </div>
    </section>
  )
}
