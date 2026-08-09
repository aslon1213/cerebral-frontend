# UI components

Plain React and Tailwind v4 against the design tokens in `app/globals.css`,
which transcribe the Linear design system (dark only). There is no component
library and no CSS beyond those tokens — every colour, size and radius here
refers to a token by role rather than repeating a hex.

> An earlier version of this app was built from Shopify's Polaris web
> components, loaded from a CDN. That is gone: the tokens now own the surface,
> typography and colour scheme, and nothing is fetched at build or run time.

## What is here

| File | Role |
| --- | --- |
| `ui.tsx` | Presentational primitives — buttons, cards, fields, page shell. No hooks, so it stays server-rendered |
| `form-ui.tsx` | The parts that genuinely need the client: `SubmitButton`, `FilterForm`, `StatusSelect` |
| `list.tsx` | The issue-list primitives: `List`, `ListRow`, `RowTitle`, `Pagination` |
| `badges.tsx` | Task vocabulary — priority and status glyphs |
| `run-badges.tsx` | Run vocabulary — execution status, interventions, change types, commit ids |
| `icons.tsx` | 16px icons. The first set is exported Figma path data; the second is drawn to the same grid, and says so |
| `json-view.tsx` | Renders agent-supplied JSON readably without assuming a schema |
| `transcript.tsx` | The event transcript, including cursor paging and live tailing |
| `intervention-card.tsx` | One thing an agent is blocked on, answerable in place |
| `*-form.tsx` | One form per resource, each over a Server Action via `useActionState` |

Display strings for the API's enums live in `lib/vocabulary.ts`, not here, so
Server Actions can reach them without importing a component module.

## Conventions worth knowing

**Server by default.** Only components that need state, effects or event
handlers carry `"use client"`. `ui.tsx` deliberately uses no hooks so that
importing a button never drags a page across the boundary.

**Forms are Server Actions.** Every mutation is a `<form action={...}>` over a
function in `app/actions/`, with `useActionState` for field errors. Field-level
errors from the API arrive keyed by field name and drop straight into `Field`;
whole-form complaints render as a `Banner`.

**A Server Action re-renders its own route.** That is why a card cannot report
its own success when the action removes it from the list it lives in — resolving
an intervention is the case that bites. Those actions redirect with enough in
the URL for the *next* render to say what happened. See
`lib/intervention-outcome.ts`.

**`<details>` over React state** for disclosures: it works before hydration, it
is a real disclosure to a screen reader without ARIA, and `open` can be set from
the server.

**Colour is never the only signal.** Priority, task status, run status and change
type all differ in shape before they differ in hue — a blocked run is a filled
disc with pause bars, not merely an orange ring.

**Lists clip their own overflow.** `List` sets `overflow-hidden` for its rounded
corners, so a popover anchored inside a row is cut off. Anything that needs room
to explain itself belongs outside the list — see `DeleteAgent`, which lives in
the agent's edit panel for exactly this reason.
