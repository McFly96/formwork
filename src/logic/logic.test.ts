import { describe, expect, it } from 'vitest'
import { visibleFieldIds } from './conditions'
import { submittedAnswers, validateField, validateForm } from './validate'
import { createField } from '../schema/fieldTypes'
import { TEMPLATES } from '../schema/templates'
import type { FormSchema } from '../schema/types'

const event = TEMPLATES[0].schema

describe('visibleFieldIds', () => {
  it('hides fields whose rule does not match', () => {
    const visible = visibleFieldIds(event, {})
    expect(visible.has('diet')).toBe(false)
    expect(visible.has('diet_other')).toBe(false)
  })

  it('follows chains of rules', () => {
    const visible = visibleFieldIds(event, { sessions: ['dinner'], diet: 'other' })
    expect(visible.has('diet')).toBe(true)
    expect(visible.has('diet_other')).toBe(true)
  })

  it('hides a dependent when the field it depends on gets hidden, even if its answer is still there', () => {
    // "Other" was picked, then dinner was unticked: the follow-up must go too.
    const visible = visibleFieldIds(event, { sessions: ['talks'], diet: 'other' })
    expect(visible.has('diet_other')).toBe(false)
  })

  it('survives a cycle', () => {
    const a = { ...createField('short-text'), id: 'a', condition: { fieldId: 'b', operator: 'filled' as const, value: '' } }
    const b = { ...createField('short-text'), id: 'b', condition: { fieldId: 'a', operator: 'filled' as const, value: '' } }
    const schema: FormSchema = { ...event, fields: [a, b] }
    expect(() => visibleFieldIds(schema, {})).not.toThrow()
  })

  it('compares text case-insensitively', () => {
    const job = TEMPLATES[1].schema
    expect(visibleFieldIds(job, { role: 'dev' }).has('portfolio')).toBe(false)
    expect(visibleFieldIds(job, { role: 'designer' }).has('portfolio')).toBe(true)
  })
})

describe('validation', () => {
  const field = (overrides: Partial<ReturnType<typeof createField>>) => ({ ...createField('short-text'), ...overrides })

  it.each([
    [field({ required: true }), '', 'This field is required.'],
    [field({ type: 'email' }), 'not-an-email', 'Enter a valid email address.'],
    [field({ type: 'number', validation: { min: 0, max: 50 } }), '51', 'Enter 50 or less.'],
    [field({ type: 'number' }), 'abc', 'Enter a number.'],
    [field({ validation: { minLength: 5 } }), 'abc', 'Use at least 5 characters.'],
    [field({ type: 'multiple-choice', validation: { max: 1 } }), ['a', 'b'], 'Pick at most 1.'],
    [field({}), '', null],
    [field({ type: 'email', required: true }), 'ada@example.com', null],
  ])('%#', (f, value, expected) => {
    expect(validateField(f, value)).toBe(expected)
  })

  it('skips hidden fields', () => {
    const errors = validateForm(event, { name: 'Ada', email: 'ada@example.com', sessions: ['talks'] })
    expect(errors).toEqual({})
  })

  it('validates a field once its rule shows it', () => {
    const errors = validateForm(event, { name: 'Ada', email: 'ada@example.com', sessions: ['dinner'], diet: 'other' })
    expect(errors).toEqual({ diet_other: 'This field is required.' })
  })

  it('submits only visible, non-empty answers', () => {
    expect(submittedAnswers(event, { name: 'Ada', sessions: ['talks'], diet: 'vegan', notes: '  ' })).toEqual({
      name: 'Ada',
      sessions: ['talks'],
    })
  })
})
