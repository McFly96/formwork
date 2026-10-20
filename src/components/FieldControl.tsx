import { optionsOf } from '../schema/fieldTypes'
import type { Field, Value } from '../schema/types'

interface Props {
  field: Field
  value: Value | undefined
  onChange?: (value: Value) => void
  onBlur?: () => void
  /** Static rendering for the builder canvas: not focusable, not announced. */
  inert?: boolean
  invalid?: boolean
  describedBy?: string
}

/** The input for one field, without its label (the caller renders that). */
export default function FieldControl({ field, value, onChange, onBlur, inert = false, invalid = false, describedBy }: Props) {
  const id = `input-${field.id}`
  const common = {
    id,
    onBlur,
    disabled: inert,
    tabIndex: inert ? -1 : undefined,
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
    'aria-required': field.required || undefined,
  }
  const text = typeof value === 'string' ? value : ''
  const set = (v: Value) => onChange?.(v)

  switch (field.type) {
    case 'section':
      return null
    case 'long-text':
      return (
        <textarea
          {...common}
          className="control"
          rows={3}
          placeholder={field.placeholder}
          value={text}
          maxLength={field.validation.maxLength}
          onChange={(e) => set(e.target.value)}
        />
      )
    case 'single-choice':
    case 'yes-no':
      return (
        <div className={`choices${field.type === 'yes-no' ? ' inline' : ''}`} role="radiogroup" aria-labelledby={`label-${field.id}`} aria-describedby={describedBy}>
          {optionsOf(field).map((option) => (
            <label key={option.id} className="choice">
              <input
                type="radio"
                name={id}
                value={option.id}
                checked={text === option.id}
                disabled={inert}
                tabIndex={inert ? -1 : undefined}
                onChange={() => set(option.id)}
                onBlur={onBlur}
              />
              <span>{option.label || 'Untitled option'}</span>
            </label>
          ))}
        </div>
      )
    case 'multiple-choice': {
      const picked = Array.isArray(value) ? value : []
      return (
        <div className="choices" role="group" aria-labelledby={`label-${field.id}`} aria-describedby={describedBy}>
          {field.options.map((option) => (
            <label key={option.id} className="choice">
              <input
                type="checkbox"
                value={option.id}
                checked={picked.includes(option.id)}
                disabled={inert}
                tabIndex={inert ? -1 : undefined}
                onChange={(e) => set(e.target.checked ? [...picked, option.id] : picked.filter((p) => p !== option.id))}
                onBlur={onBlur}
              />
              <span>{option.label || 'Untitled option'}</span>
            </label>
          ))}
        </div>
      )
    }
    case 'dropdown':
      return (
        <select {...common} className="control" value={text} onChange={(e) => set(e.target.value)}>
          <option value="">Choose…</option>
          {field.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label || 'Untitled option'}
            </option>
          ))}
        </select>
      )
    default:
      return (
        <input
          {...common}
          className="control"
          type={field.type === 'short-text' ? 'text' : field.type}
          inputMode={field.type === 'number' ? 'decimal' : undefined}
          placeholder={field.placeholder}
          value={text}
          onChange={(e) => set(e.target.value)}
        />
      )
  }
}
