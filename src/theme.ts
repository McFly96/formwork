export type Theme = 'light' | 'dark'

// Same key as the inline script in index.html, which applies it before the first paint.
const KEY = 'formwork:theme'

export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Storage blocked: fall back to the system.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Not remembered, still applied.
  }
}
