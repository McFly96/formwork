import type { Field, FieldType, Operator, Option } from './types'

interface FieldTypeInfo {
  label: string
  /** A single glyph for the palette; kept as text so it needs no icon set. */
  glyph: string
  hasOptions: boolean
  hasPlaceholder: boolean
  /** Which answers this field produces, to offer the right condition operators. */
  answer: 'text' | 'number' | 'choice' | 'choices' | 'none'
}

export const FIELD_TYPES: Record<FieldType, FieldTypeInfo> = {
  'short-text': { label: 'Short text', glyph: 'Aa', hasOptions: false, hasPlaceholder: true, answer: 'text' },
  'long-text': { label: 'Paragraph', glyph: '¶', hasOptions: false, hasPlaceholder: true, answer: 'text' },
  email: { label: 'Email', glyph: '@', hasOptions: false, hasPlaceholder: true, answer: 'text' },
  number: { label: 'Number', glyph: '#', hasOptions: false, hasPlaceholder: true, answer: 'number' },
  date: { label: 'Date', glyph: '▦', hasOptions: false, hasPlaceholder: false, answer: 'text' },
  'single-choice': { label: 'Single choice', glyph: '◉', hasOptions: true, hasPlaceholder: false, answer: 'choice' },
  'multiple-choice': { label: 'Checkboxes', glyph: '☑', hasOptions: true, hasPlaceholder: false, answer: 'choices' },
  dropdown: { label: 'Dropdown', glyph: '▾', hasOptions: true, hasPlaceholder: false, answer: 'choice' },
  'yes-no': { label: 'Yes / no', glyph: '◐', hasOptions: false, hasPlaceholder: false, answer: 'choice' },
  section: { label: 'Section', glyph: '§', hasOptions: false, hasPlaceholder: false, answer: 'none' },
}

export const FIELD_TYPE_KEYS = Object.keys(FIELD_TYPES) as FieldType[]

export const YES_NO_OPTIONS: Option[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
]

export const OPERATOR_LABELS: Record<Operator, string> = {
  equals: 'is',
  'not-equals': 'is not',
  includes: 'includes',
  filled: 'is filled in',
  empty: 'is empty',
}

/** Operators that make sense for a field used as a condition source. */
export function operatorsFor(type: FieldType): Operator[] {
  switch (FIELD_TYPES[type].answer) {
    case 'choices':
      return ['includes', 'filled', 'empty']
    case 'none':
      return []
    default:
      return ['equals', 'not-equals', 'filled', 'empty']
  }
}

export const operatorNeedsValue = (op: Operator) => op !== 'filled' && op !== 'empty'

/** Options a field offers to choose from (yes/no has fixed ones). */
export function optionsOf(field: Field): Option[] {
  return field.type === 'yes-no' ? YES_NO_OPTIONS : field.options
}

let counter = 0
export function newId(prefix: string): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`
}

export function createField(type: FieldType): Field {
  const info = FIELD_TYPES[type]
  return {
    id: newId('f'),
    type,
    label: type === 'section' ? 'New section' : `Untitled ${info.label.toLowerCase()}`,
    help: '',
    placeholder: '',
    required: false,
    options: info.hasOptions
      ? [
          { id: newId('o'), label: 'Option 1' },
          { id: newId('o'), label: 'Option 2' },
        ]
      : [],
    validation: {},
    condition: null,
  }
}
