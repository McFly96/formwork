import { useRef } from 'react'
import type { Theme } from '../theme'

export type Mode = 'build' | 'preview'

interface Props {
  mode: Mode
  onModeChange: (mode: Mode) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onNew: () => void
  onImport: (file: File) => void
  onExport: () => void
  onShare: () => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl+'

export default function Toolbar(props: Props) {
  const { mode, onModeChange, canUndo, canRedo, onUndo, onRedo, onNew, onImport, onExport, onShare, theme, onThemeChange } = props
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <header className="toolbar">
      <span className="brand">
        <span className="brand-mark" aria-hidden="true" />
        Formwork
      </span>

      <div className="tabs" role="tablist" aria-label="Mode">
        {(['build', 'preview'] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => onModeChange(m)}>
            {m === 'build' ? 'Build' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <button type="button" className="icon" onClick={onUndo} disabled={!canUndo || mode !== 'build'} aria-label="Undo" title={`Undo (${mod}Z)`}>
          ↶
        </button>
        <button type="button" className="icon" onClick={onRedo} disabled={!canRedo || mode !== 'build'} aria-label="Redo" title={`Redo (${mod}⇧Z)`}>
          ↷
        </button>
      </div>

      <div className="toolbar-group end">
        <button type="button" className="ghost" onClick={onNew}>
          New…
        </button>
        <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onImport(file)
            e.target.value = ''
          }}
        />
        <button type="button" className="ghost" onClick={onExport}>
          Export JSON
        </button>
        <button
          type="button"
          className="icon theme-toggle"
          onClick={() => onThemeChange(nextTheme)}
          aria-label={`Switch to ${nextTheme} theme`}
          title={`Switch to ${nextTheme} theme`}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <button type="button" className="primary" onClick={onShare}>
          Share link
        </button>
      </div>
    </header>
  )
}
