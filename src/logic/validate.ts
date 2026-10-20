import type { Answers, Field, FormSchema, Value } from '../schema/types'
import { visibleFieldIds } from './conditions'

// Deliberately loose: the browser and the server have the final word on emails.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateField(field: Field, value: Value | undefined): string | null {
  if (field.type === 'section') return null
  const empty = value === undefined || (Array.isArray(value) ? value.length === 0 : value.trim() === '')
  if (empty) return field.required ? 'This field is required.' : null

  const { minLength, maxLength, min, max } = field.validation
  if (typeof value === 'string') {
    const text = value.trim()
    if (field.type === 'email' && !EMAIL.test(text)) return 'Enter a valid email address.'
    if (field.type === 'number') {
      const n = Number(text)
      if (!Number.isFinite(n)) return 'Enter a number.'
      if (min !== undefined && n < min) return `Enter ${min} or more.`
      if (max !== undefined && n > max) return `Enter ${max} or less.`
    }
    if (minLength !== undefined && text.length < minLength) return `Use at least ${minLength} characters.`
    if (maxLength !== undefined && text.length > maxLength) return `Use at most ${maxLength} characters.`
  } else {
    if (min !== undefined && value.length < min) return `Pick at least ${min}.`
    if (max !== undefined && value.length > max) return `Pick at most ${max}.`
  }
  return null
}

/** Errors by field id. Hidden fields are never validated. */
export function validateForm(schema: FormSchema, answers: Answers): Record<string, string> {
  const visible = visibleFieldIds(schema, answers)
  const errors: Record<string, string> = {}
  for (const field of schema.fields) {
    if (!visible.has(field.id)) continue
    const error = validateField(field, answers[field.id])
    if (error) errors[field.id] = error
  }
  return errors
}

/** The answers worth submitting: only visible fields, without empty values. */
export function submittedAnswers(schema: FormSchema, answers: Answers): Answers {
  const visible = visibleFieldIds(schema, answers)
  return Object.fromEntries(
    schema.fields
      .filter((f) => visible.has(f.id) && f.type !== 'section')
      .map((f) => [f.id, answers[f.id]] as const)
      .filter(([, v]) => v !== undefined && (Array.isArray(v) ? v.length > 0 : v.trim() !== '')),
  ) as Answers
}
