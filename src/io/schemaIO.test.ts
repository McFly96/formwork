import { describe, expect, it } from 'vitest'
import { decodeShare, encodeShare, parseSchema, toJson } from './schemaIO'
import { TEMPLATES } from '../schema/templates'

const job = TEMPLATES[1].schema

describe('parseSchema', () => {
  it('round-trips an exported form', () => {
    expect(parseSchema(toJson(job))).toEqual({
      ...job,
      // Missing validation keys come back as explicit undefined.
      fields: job.fields.map((f) => ({ ...f, validation: { minLength: undefined, maxLength: undefined, min: undefined, max: undefined, ...f.validation } })),
    })
  })

  it('fills in defaults and drops what it does not know', () => {
    const schema = parseSchema(JSON.stringify({ fields: [{ type: 'email', colour: 'red' }] }))
    expect(schema.title).toBe('Untitled form')
    expect(schema.fields[0]).toMatchObject({ type: 'email', label: '', required: false, options: [], condition: null })
    expect(schema.fields[0]).not.toHaveProperty('colour')
  })

  it('drops rules pointing at missing fields', () => {
    const schema = parseSchema(
      JSON.stringify({ fields: [{ id: 'a', type: 'short-text', condition: { fieldId: 'ghost', operator: 'filled' } }] }),
    )
    expect(schema.fields[0].condition).toBeNull()
  })

  it.each([
    ['{', 'This is not valid JSON.'],
    ['{"title":"x"}', 'This JSON is not a Formwork form: "fields" is missing.'],
    ['{"fields":[{"type":"slider"}]}', 'Field 1 has an unknown type: "slider".'],
    ['{"fields":[{"id":"a","type":"date"},{"id":"a","type":"date"}]}', 'Two fields share the id "a".'],
    ['{"version":2,"fields":[]}', 'This form was saved with schema version 2, which this version cannot read.'],
  ])('rejects %s', (text, message) => {
    expect(() => parseSchema(text)).toThrow(message)
  })
})

describe('share links', () => {
  it('encode and decode to the same form, URL-safe', async () => {
    const token = await encodeShare(job)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect((await decodeShare(token)).fields.map((f) => f.id)).toEqual(job.fields.map((f) => f.id))
  })

  it('reports a damaged link', async () => {
    await expect(decodeShare('not-a-real-token')).rejects.toThrow('This link is damaged or incomplete.')
  })
})
