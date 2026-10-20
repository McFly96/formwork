import type { Answers, Condition, Field, FormSchema, Value } from '../schema/types'

const isEmpty = (value: Value | undefined) =>
  value === undefined || (Array.isArray(value) ? value.length === 0 : value.trim() === '')

const normalise = (s: string) => s.trim().toLowerCase()

export function matches(condition: Condition, value: Value | undefined): boolean {
  switch (condition.operator) {
    case 'filled':
      return !isEmpty(value)
    case 'empty':
      return isEmpty(value)
    case 'includes':
      return Array.isArray(value) && value.includes(condition.value)
    case 'equals':
    case 'not-equals': {
      const equal = typeof value === 'string' && normalise(value) === normalise(condition.value)
      return condition.operator === 'equals' ? equal : !equal
    }
  }
}

/**
 * Ids of the fields currently shown. A field is hidden when its condition
 * fails, or when the field it depends on is itself hidden: hidden answers
 * count as empty, so a chain of conditions collapses as expected.
 */
export function visibleFieldIds(schema: FormSchema, answers: Answers): Set<string> {
  const byId = new Map(schema.fields.map((f) => [f.id, f]))
  const memo = new Map<string, boolean>()

  const visible = (field: Field, seen: Set<string>): boolean => {
    const cached = memo.get(field.id)
    if (cached !== undefined) return cached
    let result = true
    const condition = field.condition
    if (condition) {
      const source = byId.get(condition.fieldId)
      // A rule pointing at a deleted field, or a cycle, is ignored.
      if (source && !seen.has(source.id)) {
        const sourceVisible = visible(source, new Set(seen).add(field.id))
        result = matches(condition, sourceVisible ? answers[source.id] : undefined)
      }
    }
    memo.set(field.id, result)
    return result
  }

  return new Set(schema.fields.filter((f) => visible(f, new Set([f.id]))).map((f) => f.id))
}

/** Fields that `field` can depend on: the ones above it that produce an answer. */
export function conditionSources(schema: FormSchema, fieldId: string): Field[] {
  const index = schema.fields.findIndex((f) => f.id === fieldId)
  return schema.fields.slice(0, Math.max(0, index)).filter((f) => f.type !== 'section')
}
