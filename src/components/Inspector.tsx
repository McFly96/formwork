import { useId } from 'react'
import { FIELD_TYPE_KEYS, FIELD_TYPES, newId, OPERATOR_LABELS, operatorNeedsValue, operatorsFor, optionsOf } from '../schema/fieldTypes'
import { conditionSources } from '../logic/conditions'
import type { ReactNode } from 'react'
import type { Condition, Field, FormSchema, Operator, Validation } from '../schema/types'
import type { Action } from '../state/builder'

interface Props {
  schema: FormSchema
  selectedId: string | null
  dispatch: (action: Action) => void
}

export default function Inspector({ schema, selectedId, dispatch }: Props) {
  const field = schema.fields.find((f) => f.id === selectedId)

  if (!field) {
    const rules = schema.fields.filter((f) => f.condition).length
    return (
      <aside className="inspector" aria-label="Properties">
        <h2>Form</h2>
        <p className="hint">Select a field in the form to edit it.</p>
        <dl className="stats">
          <div>
            <dt>Fields</dt>
            <dd>{schema.fields.filter((f) => f.type !== 'section').length}</dd>
          </div>
          <div>
            <dt>Required</dt>
            <dd>{schema.fields.filter((f) => f.required).length}</dd>
          </div>
          <div>
            <dt>With a rule</dt>
            <dd>{rules}</dd>
          </div>
        </dl>
      </aside>
    )
  }

  const info = FIELD_TYPES[field.type]
  const update = (patch: Partial<Omit<Field, 'id' | 'type'>>) => dispatch({ type: 'update', id: field.id, patch })

  return (
    <aside className="inspector" aria-label="Properties">
      <h2>{info.label}</h2>

      <Row label="Type">
        {(id) => (
          <select id={id} value={field.type} onChange={(e) => dispatch({ type: 'change-type', id: field.id, fieldType: e.target.value as Field['type'] })}>
            {FIELD_TYPE_KEYS.map((t) => (
              <option key={t} value={t}>
                {FIELD_TYPES[t].label}
              </option>
            ))}
          </select>
        )}
      </Row>

      <Row label={field.type === 'section' ? 'Title' : 'Question'}>
        {(id) => <input id={id} value={field.label} onChange={(e) => update({ label: e.target.value })} />}
      </Row>

      <Row label="Help text" note="Shown under the question.">
        {(id) => <textarea id={id} rows={2} value={field.help} onChange={(e) => update({ help: e.target.value })} />}
      </Row>

      {info.hasPlaceholder && (
        <Row label="Placeholder">
          {(id) => <input id={id} value={field.placeholder} onChange={(e) => update({ placeholder: e.target.value })} />}
        </Row>
      )}

      {field.type !== 'section' && (
        <label className="check">
          <input type="checkbox" checked={field.required} onChange={(e) => update({ required: e.target.checked })} />
          Required
        </label>
      )}

      {info.hasOptions && <OptionsEditor field={field} update={update} />}

      <ValidationEditor field={field} update={update} />

      <ConditionEditor field={field} schema={schema} update={update} />
    </aside>
  )
}

function Row({ label, note, children }: { label: string; note?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="row-field">
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {note && <span className="note">{note}</span>}
    </div>
  )
}

type Update = (patch: Partial<Omit<Field, 'id' | 'type'>>) => void

function OptionsEditor({ field, update }: { field: Field; update: Update }) {
  const options = field.options
  const set = (next: typeof options) => update({ options: next })
  const move = (from: number, to: number) => {
    const next = [...options]
    const [o] = next.splice(from, 1)
    next.splice(to, 0, o)
    set(next)
  }

  return (
    <fieldset className="group">
      <legend>Options</legend>
      <ol className="options">
        {options.map((option, i) => (
          <li key={option.id}>
            <input
              aria-label={`Option ${i + 1}`}
              value={option.label}
              onChange={(e) => set(options.map((o) => (o.id === option.id ? { ...o, label: e.target.value } : o)))}
              onKeyDown={(e) => {
                // Enter on the last option adds a new one, like a list in a text editor.
                if (e.key === 'Enter' && i === options.length - 1) {
                  e.preventDefault()
                  set([...options, { id: newId('o'), label: '' }])
                }
              }}
            />
            <button type="button" className="icon" aria-label={`Move option ${i + 1} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
              ↑
            </button>
            <button
              type="button"
              className="icon danger"
              aria-label={`Remove option ${i + 1}`}
              disabled={options.length <= 1}
              onClick={() => set(options.filter((o) => o.id !== option.id))}
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="link" onClick={() => set([...options, { id: newId('o'), label: `Option ${options.length + 1}` }])}>
        + Add option
      </button>
    </fieldset>
  )
}

const toNumber = (s: string) => (s.trim() === '' || !Number.isFinite(Number(s)) ? undefined : Number(s))

function ValidationEditor({ field, update }: { field: Field; update: Update }) {
  const v = field.validation
  const set = (patch: Validation) => update({ validation: { ...v, ...patch } })
  const pair = (
    title: string,
    a: { label: string; key: keyof Validation },
    b: { label: string; key: keyof Validation },
  ) => (
    <fieldset className="group">
      <legend>{title}</legend>
      <div className="pair">
        {[a, b].map(({ label, key }) => (
          <label key={key}>
            {label}
            <input type="number" min={0} inputMode="numeric" value={v[key] ?? ''} onChange={(e) => set({ [key]: toNumber(e.target.value) })} />
          </label>
        ))}
      </div>
    </fieldset>
  )

  switch (field.type) {
    case 'short-text':
    case 'long-text':
      return pair('Length', { label: 'Min characters', key: 'minLength' }, { label: 'Max characters', key: 'maxLength' })
    case 'number':
      return pair('Range', { label: 'Min', key: 'min' }, { label: 'Max', key: 'max' })
    case 'multiple-choice':
      return pair('Choices', { label: 'Pick at least', key: 'min' }, { label: 'Pick at most', key: 'max' })
    default:
      return null
  }
}

function ConditionEditor({ field, schema, update }: { field: Field; schema: FormSchema; update: Update }) {
  const sources = conditionSources(schema, field.id).filter((f) => operatorsFor(f.type).length)
  const condition = field.condition
  const source = condition ? schema.fields.find((f) => f.id === condition.fieldId) : undefined
  // A rule can point below the field after a reorder: keep it visible so it can be fixed.
  const sourceBelow = source && !sources.includes(source)

  const defaultFor = (sourceField: Field): Condition => {
    const operator = operatorsFor(sourceField.type)[0]
    return { fieldId: sourceField.id, operator, value: optionsOf(sourceField)[0]?.id ?? '' }
  }

  if (!sources.length && !condition) {
    return (
      <fieldset className="group">
        <legend>Rule</legend>
        <p className="note">Add a question above this one to show it only for some answers.</p>
      </fieldset>
    )
  }

  return (
    <fieldset className="group">
      <legend>Rule</legend>
      <label className="check">
        <input type="checkbox" checked={!!condition} onChange={(e) => update({ condition: e.target.checked ? defaultFor(sources[0]) : null })} />
        Show only when…
      </label>
      {condition && (
        <div className="rule-editor">
          <select
            aria-label="Depends on"
            value={condition.fieldId}
            onChange={(e) => {
              const next = schema.fields.find((f) => f.id === e.target.value)
              if (next) update({ condition: defaultFor(next) })
            }}
          >
            {sourceBelow && source && <option value={source.id}>{source.label || 'Untitled field'} (below!)</option>}
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label || 'Untitled field'}
              </option>
            ))}
          </select>
          {source && (
            <select
              aria-label="Operator"
              value={condition.operator}
              onChange={(e) => update({ condition: { ...condition, operator: e.target.value as Operator } })}
            >
              {operatorsFor(source.type).map((op) => (
                <option key={op} value={op}>
                  {OPERATOR_LABELS[op]}
                </option>
              ))}
            </select>
          )}
          {source && operatorNeedsValue(condition.operator) &&
            (optionsOf(source).length ? (
              <select aria-label="Value" value={condition.value} onChange={(e) => update({ condition: { ...condition, value: e.target.value } })}>
                {!optionsOf(source).some((o) => o.id === condition.value) && <option value={condition.value}>(deleted option)</option>}
                {optionsOf(source).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label || 'Untitled option'}
                  </option>
                ))}
              </select>
            ) : (
              <input aria-label="Value" value={condition.value} onChange={(e) => update({ condition: { ...condition, value: e.target.value } })} />
            ))}
          {sourceBelow && <p className="warning">This rule depends on a question that now comes after this one. Move it back up or pick another.</p>}
        </div>
      )}
    </fieldset>
  )
}
