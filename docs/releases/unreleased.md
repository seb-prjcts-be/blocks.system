# blocks.system, not released yet

These changes live on `main` and are not part of `v0.6.1`. A page that pins
`v0.6.1` does not have them. When the next version is tagged, this file becomes
its release note and is removed here.

## Added

- `blocks.hydrate(target?, options?)`: turns `[data-content-block]` elements
  that are already in the HTML into a field, with a grid and spans per width
  mode, content-fitted heights and the visitor's order, docked and pinned
  blocks in `localStorage`.
- `blocks.resolveAddress(url?, options?)`: brings the block named by `?block=`
  or `#id` back from the dock, scrolls to it and marks it.
- `blocks.bindSearch(input, options?)`: live filtering on a search input, best
  match first.
- `blocks.list({ query })` ignores accents and ranks its matches: the title
  first, then the rest of the definition.
- Labels `reset`, `resetTitle`, `searchCount`, `searchHits` and `searchNone`.
- `restoreLayout()` accepts items without `span` and `place`; those blocks keep
  their current span.
- `blocks.block(id)`, `blocks.blocks()` and `blocks.blockOf(element)` return
  the live blocks. `get()` and `list()` keep returning catalog definitions.
- `block.title` reads and changes the titlebar text and keeps the buttons.
  `block.layout` reads the current `{ span, place }`.
- `exportLayout()` also returns `grid`: `{ columns, rows }` with the
  `setGrid()` minimum, or `null` in free layout.
- `blocks.checkLayout(layout, options?)` tells whether `restoreLayout()` would
  accept a snapshot, without changing anything.
- `blocks.batch(fn)` publishes everything `fn` changes as one `blocks:change`
  of type `batch`.
- `blocks.destroy()` removes the blocks, releases the field and undoes
  `hydrate()` and `bindSearch()`.
- `blocks:change` has two new types: `add` and `title`.
- Every thrown error carries a stable `error.code`. The option `onIssue`
  receives what is refused or skipped without an error.
- The module exports `version`.
- `docs/api.json` describes the public API as data, and `llms.txt` is a short
  entry for agents.
- The titlebar buttons are SVG icons on one grid, with a `title` tooltip and a
  `data-icon` attribute. See [`../MENU-ICONS.md`](../MENU-ICONS.md).

## Changed

- The default label of the dock button no longer says "left". The rail sits
  above or below the grid, so the label is now `close to the dock`, and
  `naar de dock sluiten` in Dutch. It is the button's `aria-label` and tooltip.

## Fixed

- `block.remove()` takes the element out of the field before it forgets the
  block. A listener that reads `exportLayout()` while the element leaves (a
  `blur` on a focused button, for instance) no longer throws.

## Migration

1. Nothing is required.
2. A `blocks:change` listener that treats every type it does not know as a
   state change now also sees `add`, `title` and `batch`. Check the type you
   mean.
3. A test that compares the whole result of `exportLayout()` must expect the
   new `grid` key.
4. If a test or selector matches the old label text (`left dock` or
   `links sluiten`), match the new text, or set your own `labels.dock`.
