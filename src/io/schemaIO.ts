import { FIELD_TYPE_KEYS } from '../schema/fieldTypes'
import { SCHEMA_VERSION, type Condition, type Field, type FormSchema, type Operator } from '../schema/types'

const OPERATORS: Operator[] = ['equals', 'not-equals', 'includes', 'filled', 'empty']

export function toJson(schema: FormSchema): string {
  return JSON.stringify(schema, null, 2)
}

/**
 * Reads a schema from untrusted JSON (a file, a pasted text, a link). Unknown
 * keys are dropped and missing ones get defaults; anything that cannot be a
 * form throws with a message meant for the user.
 */
export function parseSchema(text: string): FormSchema {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This is not valid JSON.')
  }
  if (!isObject(data) || !Array.isArray(data.fields)) throw new Error('This JSON is not a Formwork form: "fields" is missing.')
  if (data.version !== undefined && data.version !== SCHEMA_VERSION) {
    throw new Error(`This form was saved with schema version ${String(data.version)}, which this version cannot read.`)
  }

  const ids = new Set<string>()
  const fields = data.fields.map((raw, i): Field => {
    if (!isObject(raw)) throw new Error(`Field ${i + 1} is not an object.`)
    const type = FIELD_TYPE_KEYS.find((t) => t === raw.type)
    if (!type) throw new Error(`Field ${i + 1} has an unknown type: ${JSON.stringify(raw.type)}.`)
    const id = str(raw.id) || `f_imported_${i}`
    if (ids.has(id)) throw new Error(`Two fields share the id "${id}".`)
    ids.add(id)
    const validation = isObject(raw.validation) ? raw.validation : {}
    return {
      id,
      type,
      label: str(raw.label),
      help: str(raw.help),
      placeholder: str(raw.placeholder),
      required: raw.required === true,
      options: Array.isArray(raw.options)
        ? raw.options.filter(isObject).map((o, j) => ({ id: str(o.id) || `o_${i}_${j}`, label: str(o.label) }))
        : [],
      validation: {
        minLength: num(validation.minLength),
        maxLength: num(validation.maxLength),
        min: num(validation.min),
        max: num(validation.max),
      },
      condition: parseCondition(raw.condition),
    }
  })

  // Drop rules that point nowhere.
  for (const field of fields) {
    if (field.condition && !ids.has(field.condition.fieldId)) field.condition = null
  }

  return { version: SCHEMA_VERSION, title: str(data.title) || 'Untitled form', description: str(data.description), fields }
}

function parseCondition(raw: unknown): Condition | null {
  if (!isObject(raw)) return null
  const operator = OPERATORS.find((op) => op === raw.operator)
  const fieldId = str(raw.fieldId)
  return operator && fieldId ? { fieldId, operator, value: str(raw.value) } : null
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

// --- Share links: the schema, deflated and base64url-encoded, in the URL hash.

export async function encodeShare(schema: FormSchema): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(schema))
  const compressed = await transform(bytes, new CompressionStream('deflate-raw'))
  return toBase64Url(compressed)
}

export async function decodeShare(token: string): Promise<FormSchema> {
  let bytes: Uint8Array
  try {
    bytes = await transform(fromBase64Url(token), new DecompressionStream('deflate-raw'))
  } catch {
    throw new Error('This link is damaged or incomplete.')
  }
  return parseSchema(new TextDecoder().decode(bytes))
}

async function transform(input: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const output = new Response(input as BodyInit).body!.pipeThrough(stream)
  return new Uint8Array(await new Response(output).arrayBuffer())
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(token: string): Uint8Array {
  const base64 = token.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

// --- Autosave

const STORAGE_KEY = 'formwork:draft'

export function loadDraft(): FormSchema | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    return text ? parseSchema(text) : null
  } catch {
    return null
  }
}

export function saveDraft(schema: FormSchema): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schema))
  } catch {
    // Storage full or blocked: the draft just is not kept.
  }
}
