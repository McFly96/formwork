import { useCallback, useEffect, useReducer, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import Toolbar, { type Mode } from './components/Toolbar'
import Palette from './components/Palette'
import Canvas, { CANVAS_DROP_ID } from './components/Canvas'
import Inspector from './components/Inspector'
import Preview from './components/Preview'
import NewFormDialog from './components/NewFormDialog'
import { FIELD_TYPES } from './schema/fieldTypes'
import { TEMPLATES } from './schema/templates'
import type { FieldType, FormSchema } from './schema/types'
import { builderReducer, initialState } from './state/builder'
import { applyTheme, initialTheme, type Theme } from './theme'
import { decodeShare, encodeShare, loadDraft, parseSchema, saveDraft, toJson } from './io/schemaIO'

const SHARE_PREFIX = '#form='

function startingSchema(): FormSchema {
  return loadDraft() ?? structuredClone(TEMPLATES[0].schema)
}

export default function App() {
  const [state, dispatch] = useReducer(builderReducer, undefined, () => initialState(startingSchema()))
  const schema = state.present
  const [mode, setMode] = useState<Mode>('build')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [dragType, setDragType] = useState<FieldType | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(initialTheme)

  const changeTheme = (next: Theme) => {
    applyTheme(next)
    setTheme(next)
  }

  const notify = useCallback((message: string) => setToast(message), [])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  // A shared link wins over the local draft.
  useEffect(() => {
    if (!window.location.hash.startsWith(SHARE_PREFIX)) return
    const token = window.location.hash.slice(SHARE_PREFIX.length)
    history.replaceState(null, '', window.location.pathname + window.location.search)
    decodeShare(token)
      .then((shared) => {
        dispatch({ type: 'load', schema: shared })
        setMode('preview')
        notify('Opened a shared form. Undo to get your draft back.')
      })
      .catch((err: unknown) => notify(err instanceof Error ? err.message : 'Could not open the shared form.'))
  }, [notify])

  useEffect(() => saveDraft(schema), [schema])

  // Undo / redo shortcuts, also while typing: field edits live in our history, not the input's.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mode !== 'build' || !(e.metaKey || e.ctrlKey)) return
      const key = e.key.toLowerCase()
      if (key === 'z' || key === 'y') {
        e.preventDefault()
        dispatch({ type: key === 'y' || e.shiftKey ? 'redo' : 'undo' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const labelOf = (id: string | number) => {
    const field = schema.fields.find((f) => f.id === id)
    return field ? `"${field.label || 'Untitled field'}"` : 'the field'
  }
  const positionOf = (id: string | number) => schema.fields.findIndex((f) => f.id === id) + 1
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${labelOf(active.id)}, position ${positionOf(active.id)} of ${schema.fields.length}.`,
    onDragOver: ({ active, over }) => (over ? `${labelOf(active.id)} is over position ${positionOf(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${labelOf(active.id)} dropped at position ${positionOf(over.id)}.` : `${labelOf(active.id)} dropped.`),
    onDragCancel: ({ active }) => `Moving ${labelOf(active.id)} cancelled.`,
  }

  const onDragStart = ({ active }: DragStartEvent) => {
    if (active.data.current?.kind === 'palette') setDragType(active.data.current.fieldType as FieldType)
  }
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (active.data.current?.kind !== 'palette') return
    setDropTargetId(over && over.id !== CANVAS_DROP_ID ? String(over.id) : null)
  }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragType(null)
    setDropTargetId(null)
    if (!over) return
    const overIndex = schema.fields.findIndex((f) => f.id === over.id)
    if (active.data.current?.kind === 'palette') {
      dispatch({
        type: 'add',
        fieldType: active.data.current.fieldType as FieldType,
        index: overIndex < 0 ? schema.fields.length : overIndex,
      })
      return
    }
    const from = schema.fields.findIndex((f) => f.id === active.id)
    if (from >= 0 && overIndex >= 0) dispatch({ type: 'move', from, to: overIndex })
  }

  const importFile = (file: File) => {
    file
      .text()
      .then((text) => {
        dispatch({ type: 'load', schema: parseSchema(text) })
        notify(`Imported "${file.name}".`)
      })
      .catch((err: unknown) => notify(err instanceof Error ? err.message : 'Could not read the file.'))
  }

  const exportJson = () => {
    const blob = new Blob([toJson(schema)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug(schema.title) || 'form'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const share = () => {
    encodeShare(schema)
      .then(async (token) => {
        const url = `${window.location.origin}${window.location.pathname}${SHARE_PREFIX}${token}`
        await navigator.clipboard.writeText(url)
        notify('Link copied. Whoever opens it gets a copy of this form.')
      })
      .catch(() => notify('Could not copy the link to the clipboard.'))
  }

  return (
    <div className={`app mode-${mode}`}>
      <Toolbar
        mode={mode}
        onModeChange={setMode}
        canUndo={state.past.length > 0}
        canRedo={state.future.length > 0}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
        onNew={() => setDialogOpen(true)}
        onImport={importFile}
        onExport={exportJson}
        onShare={share}
        theme={theme}
        onThemeChange={changeTheme}
      />

      {mode === 'build' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          accessibility={{ announcements }}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setDragType(null)
            setDropTargetId(null)
          }}
        >
          <div className="workspace">
            <Palette onAdd={(fieldType) => dispatch({ type: 'add', fieldType })} />
            <Canvas schema={schema} selectedId={state.selectedId} dropTargetId={dropTargetId} dispatch={dispatch} />
            <Inspector schema={schema} selectedId={state.selectedId} dispatch={dispatch} />
          </div>
          <DragOverlay dropAnimation={null}>
            {dragType && (
              <div className="palette-item overlay">
                <span className="glyph" aria-hidden="true">
                  {FIELD_TYPES[dragType].glyph}
                </span>
                {FIELD_TYPES[dragType].label}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="workspace single">
          <Preview schema={schema} />
        </div>
      )}

      <NewFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onPick={(s) => dispatch({ type: 'load', schema: s })} />

      <div className="toast-region" role="status" aria-live="polite">
        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  )
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
