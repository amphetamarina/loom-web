# Developing webloom

Webloom v2 is a ground-up rewrite of the original React/Vite SPA:
**no React, no Vite, no build step.** Just static HTML + [HTMX](https://htmx.org)
served by Bun, with a Service Worker acting as a fake backend on top of
IndexedDB.

## Stack

- **Runtime**: Bun (pinned in [`mise.toml`](./mise.toml))
- **UI**: HTMX 2.x + `htmx-ext-sse` (from unpkg CDN)
- **Persistence**: IndexedDB (single object store, two keys: `trees` and `settings`)
- **Styling**: one vanilla stylesheet, [`public/brutalist.css`](./public/brutalist.css)
- **Server**: [`server.js`](./server.js) — `Bun.serve` shipping static files, no
  logic at all

There are no npm dependencies, no bundler, no transpiler. `bun run dev` simply
serves files; everything dynamic happens in the browser.

## Layout

```
webloom/
├── mise.toml              # bun = "latest"
├── package.json           # one script: bun run server.js
├── server.js              # static file server
├── index.html             # HTMX shell + SW registration + tiny bootstrap script
├── sw.js                  # the whole "backend" — routing, IDB, AI, SSE
└── public/
    ├── brutalist.css      # the one stylesheet
    └── zoneplate.png      # favicon
```

## How requests flow

1. Browser loads `index.html`, which registers `/sw.js`.
2. HTMX attributes (`hx-get`, `hx-post`, etc.) fire requests to `/api/*`.
3. The Service Worker's `fetch` listener intercepts anything starting with
   `/api/`. Everything else falls through to `Bun.serve` (which only ships
   static files).
4. The SW dispatches to a handler in `route()`, mutates state in memory,
   persists to IndexedDB, and returns an HTML fragment.
5. HTMX swaps that fragment into the DOM. `HX-Trigger` response headers fire
   custom events (`trees-changed`, `active-changed`, `settings-changed`) that
   other elements listen for via `hx-trigger="… from:body"` to refresh
   themselves.

## State

Everything is kept in `state` inside the SW, mirrored to IndexedDB:

- `state.trees`: `Record<treeId, Tree>` (same shape as the React-era types)
- `state.activeTreeId`
- `state.settings`: `{ generationSettings, modelConfigs, apiKeys, preferences }`

`state` is rebuilt from IDB on the first request after the SW boots
(see `loadState()` in [`sw.js`](./sw.js)).

## AI calls

The SW issues OpenAI-style requests with `stream: true` directly to the
configured endpoint. SSE deltas are parsed and re-emitted as HTMX-friendly
events on `/api/streams/:streamId`:

- `event: token` — a chunk of escaped HTML to append into the placeholder
  node's `<span class="text">`.
- `event: done` — the final `<li>` HTML, which `outerHTML`-swaps the streaming
  placeholder for the real saved node and closes the SSE connection.

See `streamAI()` and `sseGenerate()` in [`sw.js`](./sw.js).

## Migrating from v1 (React)

Trees from the React era were persisted in `localStorage` under `loom-trees`
and `loom-settings`. The bootstrap script in `index.html` reads those keys
and `postMessage`s them to the SW, which one-shot imports them into
IndexedDB the first time (guarded by a `__migrated_v1` flag). After import,
`localStorage` can be cleared safely.

## Running

```bash
mise install
bun run dev          # http://localhost:3000
PORT=3737 bun run dev
```

If you change the SW, force-reload (Ctrl+Shift+R) since browsers cache it
aggressively. In Chrome DevTools, the *Application → Service Workers* tab has
an "Update on reload" checkbox that helps during development.

## Release process

webloom is published to npm as a Bun-only CLI. `bunx webloom` (or
`bun x webloom`) downloads the tarball and runs `./server.js` directly via
the shebang `#!/usr/bin/env bun`.

Preview the tarball before releasing:

```bash
bun pm pack --dry-run
```

Contents are governed by the `"files"` field in `package.json`:
`server.js`, `sw.js`, `index.html`, `public/` (plus `README.md` and
`package.json`, included automatically).

To cut a release:

```bash
# bump version in package.json, then:
git commit -am "release: vX.Y.Z"
git tag vX.Y.Z
git push --follow-tags
npm publish              # requires `npm login` once
```

`mise.toml`, `DEVELOPMENT.md`, and `.git*` are intentionally excluded from
the tarball (not in `"files"`).

### IDB schema changes

If `sw.js` changes the IndexedDB shape, bump the `open()` version, write an
`onupgradeneeded` migration, and ship the SW change as a minor or major
version bump so users force-refresh.

## Adding a new endpoint

1. Pick a path under `/api/` and a method.
2. Add a regex match + handler block inside `route()` in [`sw.js`](./sw.js).
3. Return either:
   - `ok(htmlString, optionalHeaders)` — for fragment swaps.
   - `noContent("event-name")` — for fire-and-forget actions, with `HX-Trigger`
     in the header to nudge other parts of the page to refresh.
4. If the endpoint mutates state, call `persistTrees()` or `persistSettings()`
   afterwards.

## Templates

HTML is built with a tagged-template helper called `html\`…\`` in
[`sw.js`](./sw.js). Variables are **not** auto-escaped — call `escapeHtml()`
explicitly on anything user-provided. Arrays are joined.

This is intentionally minimal — if templates grow much past where they are
now, consider a real template engine. For ~10 small fragments, inline tagged
strings are easier to read.

## Styling

[`public/brutalist.css`](./public/brutalist.css) is the only stylesheet.
House rules:

- No rounded corners, no animations (except the streaming cursor blink), no
  gradients, no shadows other than the `2px 2px 0` dialog drop.
- Borders are pairs: `outset` style uses `border-top/left: var(--hi)` +
  `border-right/bottom: var(--shadow-dark)`; `inset` is the inverse.
- Fonts: Tahoma / MS Sans Serif for UI chrome; Lucida Console / Consolas for
  prose and editing surfaces.
- Colors come from the CSS custom properties at the top of the file — change
  them there, not inline.

## Contributing

The whole "backend" is one file ([`sw.js`](./sw.js)) and the whole UI is one
HTML file plus one CSS file. PRs welcome.
