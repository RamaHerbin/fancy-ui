# `NavigationMenu` — port notes

Six components ported from `src/lib/fancy-ui/navigation-menu/`. The register
below is PORTING.md's "port the bug and note it" discipline applied to the
mechanisms that could not be ported verbatim.

The compound is disclosure navigation, not an application menu: a real
`<nav><ul><li>` with `<button aria-expanded>` triggers and ordinary anchors
inside each panel. No `role="menu"`, no `role="menuitem"`, no
`aria-haspopup="menu"`, and no focus trap — Tab must walk out of an open panel
into the rest of the page. Two assertions in the suite pin that on both halves:
the closed trigger row, and the open panel after it has portalled to
`document.body`.

## Two contexts, two React contexts

`NAVIGATION_MENU_KEY` and `NAVIGATION_MENU_ITEM_KEY` are exported under their
source names, as `React.Context` objects rather than symbols (the `ToggleGroup`
precedent).

The root context is a plain object rebuilt on every render, and that rebuild is
what re-renders the pieces below — the React counterpart of the source
context's live getters. It is not memoised, for the reason `ToggleGroup`
records: every decision function closes over the root's own state and is fresh
per render anyway, so a memo keyed honestly on all of them would never hit.

The three members something depends on BY IDENTITY are stable regardless, and
that is load-bearing rather than tidy: `registerTrigger` and `setListRef` are
listed in a trigger's and the list's own effect dependencies, and
`requestFocus` in the panel's trigger path. A member whose identity changed per
render would unregister and re-register forever.

`consumeFocusRequest` is the deliberate exception: its identity moves with the
pending focus value, which is what makes the panel effect that lists it re-run
when a new request arrives. See the focus-handshake note below.

The item context IS memoised, on its two scalar inputs — `value` and the id
seed — since nothing in it closes over anything that moves.

`NavigationMenuItem` is the only place a compound piece would ever be rendered
without its provider, so both contexts are read through small
`useNavigationMenuContext` / `useNavigationMenuItemContext` helpers that throw a
named error instead of handing back `undefined`. They are internal: not
exported from `index.ts`, where the two context objects and their contract
types are, matching the source barrel line for line.

## Inherited divergences that apply here

| #    | What it means for this component                                                                                                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-1  | `createPortal` renders the panel into `document.body` instead of relocating a rendered node. Synthetic events still bubble through the React tree, which nothing here relies on — `useDismissable` listens natively on `document`, and the panel's own handlers sit on itself. |
| D-2  | `markSurfaceState` is not ported. `data-state` is an ordinary React attribute fed by `presence.surfaceState`; same two emitted values, `"open"` and `"closing"`.                                                                                                               |
| D-6  | `dismissable`'s `active` is the plain boolean `isOpen`. `exclude` keeps its getter form — the trigger element is genuinely dynamic and is resolved at event time.                                                                                                              |
| D-12 | `useElementRef` costs one extra render when the panel mounts. Not visible — it lands before paint.                                                                                                                                                                             |

The panel also follows `DialogSurface`'s two contract divergences in shape:
the `Portal` is hoisted ABOVE the `presence.mounted` gate (a portal mounting in
the same commit as the surface renders `null` on that pass, and the entrance
would be skipped outright), and `useAnchorPosition`'s return value replaces the
source's `resolvedSide` / `resolvedAlign` state pair plus its `onPlacement`
callback.

## Other port decisions

- **`value = $bindable("")` → controlled when passed, internal copy when not.**
  `onValueChange` fires with the same string either way. A live `valueRef`
  mirrors it — re-synced from the committed value in an insertion effect, and
  written EAGERLY by `setValue` itself — which is what reproduces a `$state`
  assignment being visible to the very next statement. Every decision function
  (`toggle`, `scheduleOpen`, `scheduleClose`, `collapseIfOpen`, `goTo`,
  `close`) branches on the ref, never on the render's value; `context.value`,
  `focusedValue` and each trigger's `isOpen` still read the rendered one. The
  case that makes the difference observable is two dismisses inside one tick,
  before React has re-rendered and before the dismiss layer's own `active` gate
  has gone false: without the ref the second would pass `setValue`'s equality
  guard and report `onValueChange("")` twice. One test pins exactly that.
- **`ref = $bindable` → `forwardRef`, per component.** `NavigationMenu`,
  `NavigationMenuList`, `NavigationMenuTrigger` and `NavigationMenuContent`
  each expose one because their source declares one. `NavigationMenuItem` and
  `NavigationMenuLink` expose none, because theirs does not.
- **`$props.id()` → `useFancyId()`** on the item, with `-trigger` / `-content`
  suffixed off the one seed. Never used as a `querySelector` argument
  (convention C-6).
- **`registeredOrder` is `useState`, and DOM order still wins.** The array
  exists only so something stateful changes when a trigger mounts or unmounts;
  every left-to-right decision (`move`, `moveToEdge`, the initial tab stop)
  re-queries `[data-ft-nav-trigger]` off the live list element.
- **`pendingFocusValue` is `useState`, and the subscription is spelled as an
  identity change.** Nothing renders from it, but the source keeps it as
  `$state` for a reason that survives the port: the panel effect reads it
  through `consumeFocusRequest()` and is therefore subscribed to it, so a later
  `requestFocus()` write re-runs that effect. React has no such implicit
  subscription, so `consumeFocusRequest` is rebuilt whenever the pending value
  moves and the panel effect lists it as a dependency. The case that needs it
  is Enter/Space/ArrowDown on a trigger whose panel is ALREADY open — a
  hover-opened panel keyed for focus: `open()` short-circuits on its equality
  guard, `focus()` re-marks the same roving position, and the panel's `isOpen`,
  node and item value all stay put, so the request is the only thing that
  changed. A `useRef` here reads as the cheaper choice and silently drops that
  focus move; one test pins it. The handshake cannot loop — consuming writes
  `null`, the re-run then finds nothing to consume and writes nothing.
- **`onfocusout` → React's `onBlur`,** which is `focusout` under React 17+ and
  therefore still bubbles from a link inside the panel.
- **`prefers-reduced-motion` is not this component's business for the panel.**
  `anchored()` collapses its own duration to 0, `runTransition` then never
  calls `element.animate()`, and the close stays synchronous. The trigger's own
  `<style>` block — the caret rotation, which IS gated on a media query — is
  ported as-is into `navigation-menu-trigger.css`.
- **Three `<style>` blocks became three colocated `.css` files,** each anchored
  on its component's root class since plain CSS is global where the compiler
  scoped: `.ft-navigation-menu-trigger .ft-navigation-menu-caret` and
  `.ft-navigation-menu-link.ft-navigation-menu-feature` both had their anchor
  written out, and they select exactly the elements the scoped rules did — a
  caret only ever renders inside a trigger, and `ft-navigation-menu-feature`
  only ever arrives through `NavigationMenuLink`'s own `className` prop. The
  third, `.ft-navigation-menu-content`'s `--ft-nav-accent` declaration, was
  already anchored on a root class and is copied unchanged, local fallback
  literal included. It stays on the PANEL rather than the `<nav>` because the
  portal severs the DOM ancestry a custom property would otherwise inherit
  through.

## Test transposition notes

- The `*.test.svelte` harness becomes a `Harness` component declared inline
  (internals contract §9.2), with a `bound` flag so one test can still exercise
  the genuinely uncontrolled path — neither `value` nor `onValueChange` passed.
- `pointerenter` / `pointerleave` are DERIVED events in React: the enter/leave
  plugin synthesises them from `pointerover` / `pointerout`. The suite
  dispatches the latter pair, which is the same user gesture expressed in the
  events React actually listens for; a raw `pointerenter` would reach no
  handler at all.
- `waitFor(() => expect(panel()).toBeNull())` becomes an explicit `settle()`
  that drains the exit leg without advancing a single millisecond of timer
  time. That is stricter than the source, not looser: every "with no delay"
  assertion still runs with the clock exactly where it was.
