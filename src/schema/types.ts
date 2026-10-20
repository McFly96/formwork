// The form schema: what the builder edits, the preview renders and the user exports.

export const SCHEMA_VERSION = 1

export type FieldType =
  | 'short-text'
  | 'long-text'
  | 'email'
  | 'number'
  | 'date'
  | 'single-choice'
  | 'multiple-choice'
  | 'dropdown'
  | 'yes-no'
  | 'section'

export interface Option {
  id: string
  label: string
}

export type Operator = 'equals' | 'not-equals' | 'includes' | 'filled' | 'empty'

/** "Show this field only if <fieldId> <operator> <value>". */
export interface Condition {
  fieldId: string
  operator: Operator
  value: string
}

export interface Validation {
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
}

export interface Field {
  id: string
  type: FieldType
  label: string
  help: string
  placeholder: string
  required: boolean
  options: Option[]
  validation: Validation
  condition: Condition | null
}

export interface FormSchema {
  version: typeof SCHEMA_VERSION
  title: string
  description: string
  fields: Field[]
}

/** Answers keyed by field id: text and choices are strings, multiple choice is a string array. */
export type Value = string | string[]
export type Answers = Record<string, Value>
