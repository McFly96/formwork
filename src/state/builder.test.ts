import { describe, expect, it } from 'vitest'
import { builderReducer, initialState, type Action, type BuilderState } from './builder'
import { TEMPLATES } from '../schema/templates'

const run = (state: BuilderState, ...actions: Action[]) => actions.reduce(builderReducer, state)
const labels = (state: BuilderState) => state.present.fields.map((f) => f.label)
const event = () => initialState(structuredClone(TEMPLATES[0].schema))

describe('builderReducer', () => {
  it('adds a field after the selected one and selects it', () => {
    const state = run(event(), { type: 'select', id: 'email' }, { type: 'add', fieldType: 'yes-no' })
    expect(state.present.fields[2].type).toBe('yes-no')
    expect(state.selectedId).toBe(state.present.fields[2].id)
  })

  it('moves, then undoes and redoes', () => {
    const moved = run(event(), { type: 'move', from: 0, to: 2 })
    expect(labels(moved).slice(0, 3)).toEqual(['Email', 'Which sessions will you attend?', 'Full name'])
    const undone = run(moved, { type: 'undo' })
    expect(labels(undone)[0]).toBe('Full name')
    expect(labels(run(undone, { type: 'redo' }))[2]).toBe('Full name')
  })

  it('merges consecutive edits of the same property into one undo step', () => {
    const typed = run(
      event(),
      { type: 'update', id: 'name', patch: { label: 'N' } },
      { type: 'update', id: 'name', patch: { label: 'Na' } },
      { type: 'update', id: 'name', patch: { label: 'Name' } },
      { type: 'update', id: 'name', patch: { required: false } },
    )
    expect(typed.past).toHaveLength(2)
    expect(labels(run(typed, { type: 'undo', }, { type: 'undo' }))[0]).toBe('Full name')
  })

  it('does not merge edits separated by a selection change', () => {
    const state = run(
      event(),
      { type: 'update', id: 'name', patch: { label: 'A' } },
      { type: 'select', id: 'email' },
      { type: 'select', id: 'name' },
      { type: 'update', id: 'name', patch: { label: 'B' } },
    )
    expect(state.past).toHaveLength(2)
  })

  it('clears rules that pointed at a deleted field', () => {
    const state = run(event(), { type: 'remove', id: 'diet' })
    expect(state.present.fields.find((f) => f.id === 'diet_other')?.condition).toBeNull()
    expect(state.selectedId).toBe('diet_other')
  })

  it('drops dependent rules whose operator no longer fits after a type change', () => {
    // "sessions includes dinner" makes no sense once sessions is a text field.
    const state = run(event(), { type: 'change-type', id: 'sessions', fieldType: 'short-text' })
    expect(state.present.fields.find((f) => f.id === 'diet')?.condition).toBeNull()
    expect(state.present.fields.find((f) => f.id === 'sessions')?.options).toEqual([])
  })

  it('duplicates a field with its own options', () => {
    const state = run(event(), { type: 'duplicate', id: 'sessions' })
    const [original, copy] = state.present.fields.filter((f) => f.type === 'multiple-choice')
    expect(copy.label).toBe('Which sessions will you attend? (copy)')
    expect(copy.id).not.toBe(original.id)
    expect(copy.options).not.toBe(original.options)
  })

  it('ignores moves out of range', () => {
    const state = event()
    expect(run(state, { type: 'move', from: 0, to: 99 })).toBe(state)
  })
})
