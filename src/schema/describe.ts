import { OPERATOR_LABELS, operatorNeedsValue, optionsOf } from './fieldTypes'
import type { Condition, FormSchema } from './types'

/** Plain-English summary of a rule, e.g. `Role is not "Developer"`. */
export function describeCondition(condition: Condition, schema: FormSchema): string {
  const source = schema.fields.find((f) => f.id === condition.fieldId)
  if (!source) return 'a field that no longer exists'
  const name = source.label.trim() || 'Untitled field'
  const op = OPERATOR_LABELS[condition.operator]
  if (!operatorNeedsValue(condition.operator)) return `${name} ${op}`
  const options = optionsOf(source)
  const value = options.length
    ? (options.find((o) => o.id === condition.value)?.label ?? 'a deleted option')
    : condition.value
  return `${name} ${op} "${value}"`
}
