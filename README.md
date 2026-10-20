# Formwork

A visual form builder that runs entirely in the browser. Drag fields into a
form, set validation and "show this only if…" rules, try it in a live preview,
then export it as JSON or share it as a link.

- **Stack:** React 19 + TypeScript, Vite, dnd-kit, Vitest + Testing Library
- **No backend:** drafts live in `localStorage`, share links carry the whole form in the URL

## Features

| | |
| --- | --- |
| **10 field types** | Short text, paragraph, email, number, date, single choice, checkboxes, dropdown, yes/no, section heading |
| **Drag & drop** | Drag from the palette to a precise spot, reorder by dragging the handle. Fully usable from the keyboard (Space to pick up, arrows to move, Space to drop) with screen reader announcements; ↑/↓ buttons as a second way |
| **Inspector** | Question, help text, placeholder, required, options (Enter on the last one adds the next), length / range / number of choices |
| **Conditional logic** | "Show only when *Role is not Developer*". Rules chain: if a question gets hidden, the ones depending on it hide too, and hidden answers are neither validated nor submitted |
| **Undo / redo** | ⌘Z / ⌘⇧Z (Ctrl on Windows). Typing in one box is a single step, not one per letter |
| **Preview** | The real form: validation on blur and on submit, focus goes to the first error, and a panel shows exactly what would be sent |
| **Import / export** | JSON download and upload. Imported files are checked and cleaned, with errors written for people ("Field 3 has an unknown type") |
| **Share link** | The form, deflated and base64url-encoded in the URL hash. Nothing is uploaded anywhere |
| **Templates** | Event registration and job application, both using chained rules |

## Getting started

Requires Node.js ≥ 20.19.

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check and build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit and component tests |
| `npm run typecheck` / `npm run lint` | TypeScript / oxlint |

CI runs lint, type-check, tests and build on every push; `pages.yml` deploys to
GitHub Pages (enable it under **Settings → Pages → Source: GitHub Actions**).

## How it is built

```
src/
├── schema/
│   ├── types.ts          # FormSchema, Field, Condition: the exported format
│   ├── fieldTypes.ts     # Per-type metadata, operators, field factory
│   ├── templates.ts      # Starting points
│   └── describe.ts       # Rule → plain English
├── state/builder.ts      # Reducer: edits + undo/redo history with merged typing
├── logic/
│   ├── conditions.ts     # Which fields are visible for a set of answers
│   └── validate.ts       # Field and form validation, submitted answers
├── io/schemaIO.ts        # JSON parse/clean, share-link encoding, autosave
└── components/           # Toolbar, Palette, Canvas, FieldCard, Inspector, Preview, …
```

Choices worth explaining:

- **One reducer, plain data.** The form is a JSON-serialisable object, so
  undo/redo is a stack of snapshots, autosave is `JSON.stringify`, and the
  preview reads exactly what gets exported.
- **Rules evaluate as a graph, not a list.** A field is visible only if its
  rule matches *and* the field it depends on is visible. Cycles (possible after
  a reorder or a hand-edited import) are detected and ignored instead of hanging.
- **Keeping rules consistent.** Deleting a field clears the rules that pointed
  at it; changing a field's type drops dependent rules whose operator no longer
  fits; a rule that ends up pointing below its field is flagged in the inspector.
- **Accessibility first.** Every action has a button, drag & drop works from the
  keyboard, preview errors are linked with `aria-describedby`, groups of choices
  are labelled, and the canvas previews are hidden from assistive tech.

## Roadmap

- [ ] Export a ready-to-use React component, not only JSON
- [ ] Multi-page forms with a progress bar
- [ ] More rule shapes: "all of" / "any of" several conditions
- [ ] File upload and signature fields
- [ ] End-to-end tests (Playwright) for drag & drop
