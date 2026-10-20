import { createField, FIELD_TYPES, newId, operatorsFor } from '../schema/fieldTypes'
import { SCHEMA_VERSION, type Field, type FieldType, type FormSchema } from '../schema/types'

const HISTORY_LIMIT = 100

export interface BuilderState {
  past: FormSchema[]
  present: FormSchema
  future: FormSchema[]
  selectedId: string | null
  /** Consecutive edits with the same key are merged into one undo step (typing a label). */
  mergeKey: string | null
}

export type Action =
  | { type: 'add'; fieldType: FieldType; index?: number }
  | { type: 'remove'; id: string }
  | { type: 'duplicate'; id: string }
  | { type: 'move'; from: number; to: number }
  | { type: 'update'; id: string; patch: Partial<Omit<Field, 'id' | 'type'>> }
  | { type: 'change-type'; id: string; fieldType: FieldType }
  | { type: 'set-meta'; patch: Partial<Pick<FormSchema, 'title' | 'description'>> }
  | { type: 'load'; schema: FormSchema }
  | { type: 'select'; id: string | null }
  | { type: 'undo' }
  | { type: 'redo' }

export function emptySchema(): FormSchema {
  return { version: SCHEMA_VERSION, title: 'Untitled form', description: '', fields: [] }
}

export function initialState(schema: FormSchema = emptySchema()): BuilderState {
  return { past: [], present: schema, future: [], selectedId: schema.fields[0]?.id ?? null, mergeKey: null }
}

export function builderReducer(state: BuilderState, action: Action): BuilderState {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id, mergeKey: null }

    case 'undo': {
      if (!state.past.length) return state
      const present = state.past[state.past.length - 1]
      return {
        past: state.past.slice(0, -1),
        present,
        future: [state.present, ...state.future],
        selectedId: keepSelection(present, state.selectedId),
        mergeKey: null,
      }
    }

    case 'redo': {
      if (!state.future.length) return state
      const [present, ...future] = state.future
      return {
        past: [...state.past, state.present],
        present,
        future,
        selectedId: keepSelection(present, state.selectedId),
        mergeKey: null,
      }
    }

    case 'load':
      return { ...commit(state, action.schema, null), selectedId: action.schema.fields[0]?.id ?? null }
  }

  const { fields } = state.present
  const withFields = (next: Field[]): FormSchema => ({ ...state.present, fields: next })

  switch (action.type) {
    case 'add': {
      const field = createField(action.fieldType)
      const index = action.index ?? insertionIndex(state)
      const next = [...fields.slice(0, index), field, ...fields.slice(index)]
      return { ...commit(state, withFields(next), null), selectedId: field.id }
    }

    case 'remove': {
      const index = fields.findIndex((f) => f.id === action.id)
      if (index < 0) return state
      // Rules that pointed at the removed field would never match again.
      const next = fields
        .filter((f) => f.id !== action.id)
        .map((f) => (f.condition?.fieldId === action.id ? { ...f, condition: null } : f))
      const neighbour = next[Math.min(index, next.length - 1)]?.id ?? null
      return { ...commit(state, withFields(next), null), selectedId: neighbour }
    }

    case 'duplicate': {
      const index = fields.findIndex((f) => f.id === action.id)
      if (index < 0) return state
      const source = fields[index]
      const copy: Field = {
        ...source,
        id: newId('f'),
        label: `${source.label} (copy)`,
        options: source.options.map((o) => ({ ...o })),
        validation: { ...source.validation },
      }
      const next = [...fields.slice(0, index + 1), copy, ...fields.slice(index + 1)]
      return { ...commit(state, withFields(next), null), selectedId: copy.id }
    }

    case 'move': {
      const { from, to } = action
      if (from === to || from < 0 || to < 0 || from >= fields.length || to >= fields.length) return state
      const next = [...fields]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return commit(state, withFields(next), null)
    }

    case 'update': {
      if (!fields.some((f) => f.id === action.id)) return state
      const next = fields.map((f) => (f.id === action.id ? { ...f, ...action.patch } : f))
      const key = `field:${action.id}:${Object.keys(action.patch).sort().join(',')}`
      return commit(state, withFields(next), key)
    }

    case 'change-type': {
      const target = fields.find((f) => f.id === action.id)
      if (!target || target.type === action.fieldType) return state
      const info = FIELD_TYPES[action.fieldType]
      const fresh = createField(action.fieldType)
      const allowed = operatorsFor(action.fieldType)
      const next = fields.map((f) => {
        if (f.id === action.id) {
          return {
            ...f,
            type: action.fieldType,
            options: info.hasOptions ? (f.options.length ? f.options : fresh.options) : [],
            placeholder: info.hasPlaceholder ? f.placeholder : '',
            validation: {},
            required: action.fieldType === 'section' ? false : f.required,
          }
        }
        // Dependent rules whose operator no longer applies are dropped.
        if (f.condition?.fieldId === action.id && !allowed.includes(f.condition.operator)) return { ...f, condition: null }
        return f
      })
      return commit(state, withFields(next), null)
    }

    case 'set-meta': {
      const key = `meta:${Object.keys(action.patch).sort().join(',')}`
      return commit(state, { ...state.present, ...action.patch }, key)
    }
  }
}

function commit(state: BuilderState, present: FormSchema, mergeKey: string | null): BuilderState {
  const merge = mergeKey !== null && mergeKey === state.mergeKey
  const past = merge ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT)
  return { ...state, past, present, future: [], mergeKey }
}

/** New fields go right after the selected one, or at the end. */
function insertionIndex(state: BuilderState): number {
  const index = state.present.fields.findIndex((f) => f.id === state.selectedId)
  return index < 0 ? state.present.fields.length : index + 1
}

function keepSelection(schema: FormSchema, id: string | null): string | null {
  return id && schema.fields.some((f) => f.id === id) ? id : (schema.fields[0]?.id ?? null)
}
