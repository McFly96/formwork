import { useMemo, useRef, useState, type FormEvent } from 'react'
import FieldControl from './FieldControl'
import { optionsOf } from '../schema/fieldTypes'
import { visibleFieldIds } from '../logic/conditions'
import { submittedAnswers, validateField, validateForm } from '../logic/validate'
import type { Answers, FormSchema, Value } from '../schema/types'

interface Props {
  schema: FormSchema
}

export default function Preview({ schema }: Props) {
  const [answers, setAnswers] = useState<Answers>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState<Answers | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const visible = useMemo(() => visibleFieldIds(schema, answers), [schema, answers])
  const errorFor = (id: string) => {
    if (!touched.has(id)) return null
    const field = schema.fields.find((f) => f.id === id)
    return field ? validateField(field, answers[id]) : null
  }

  const set = (id: string, value: Value) => {
    setAnswers((a) => ({ ...a, [id]: value }))
    setSubmitted(null)
  }
  const touch = (id: string) => setTouched((t) => (t.has(id) ? t : new Set(t).add(id)))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const errors = validateForm(schema, answers)
    // Mark what the user could see: a question revealed later starts clean.
    setTouched((t) => new Set([...t, ...visible]))
    const first = Object.keys(errors)[0]
    if (first) {
      // Send the user to the first problem rather than leaving them to scroll.
      formRef.current?.querySelector<HTMLElement>(`#input-${CSS.escape(first)}, [aria-labelledby="label-${CSS.escape(first)}"] input`)?.focus()
      return
    }
    setSubmitted(submittedAnswers(schema, answers))
  }

  const reset = () => {
    setAnswers({})
    setTouched(new Set())
    setSubmitted(null)
  }

  return (
    <section className="canvas preview" aria-label="Form preview">
      <form ref={formRef} className="sheet" noValidate onSubmit={submit}>
        <h1 className="form-title">{schema.title || 'Untitled form'}</h1>
        {schema.description && <p className="form-description">{schema.description}</p>}

        {schema.fields
          .filter((f) => visible.has(f.id))
          .map((field) => {
            if (field.type === 'section') {
              return (
                <h2 key={field.id} className="section-title">
                  {field.label}
                </h2>
              )
            }
            const error = errorFor(field.id)
            const describedBy = [field.help && `help-${field.id}`, error && `error-${field.id}`].filter(Boolean).join(' ') || undefined
            const isGroup = optionsOf(field).length > 0 && field.type !== 'dropdown'
            return (
              <div key={field.id} className={`question${error ? ' has-error' : ''}`}>
                {isGroup ? (
                  <span className="field-label" id={`label-${field.id}`}>
                    {field.label}
                    {field.required && <span className="required"> *</span>}
                  </span>
                ) : (
                  <label className="field-label" id={`label-${field.id}`} htmlFor={`input-${field.id}`}>
                    {field.label}
                    {field.required && <span className="required"> *</span>}
                  </label>
                )}
                {field.help && (
                  <p className="help" id={`help-${field.id}`}>
                    {field.help}
                  </p>
                )}
                <FieldControl
                  field={field}
                  value={answers[field.id]}
                  onChange={(v) => set(field.id, v)}
                  onBlur={() => touch(field.id)}
                  invalid={!!error}
                  describedBy={describedBy}
                />
                {error && (
                  <p className="error" id={`error-${field.id}`}>
                    {error}
                  </p>
                )}
              </div>
            )
          })}

        {schema.fields.length > 0 ? (
          <div className="submit-row">
            <button type="submit" className="primary">
              Submit
            </button>
            <button type="button" className="ghost" onClick={reset}>
              Clear answers
            </button>
          </div>
        ) : (
          <p className="hint">This form has no fields yet. Switch back to Build to add some.</p>
        )}
      </form>

      {submitted && (
        <div className="result" role="status">
          <h2>What would be sent</h2>
          <p className="hint">Only the questions that were shown, keyed by field id.</p>
          <pre>{JSON.stringify(submitted, null, 2)}</pre>
        </div>
      )}
    </section>
  )
}
