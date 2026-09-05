# `Dialog` — port notes

`Dialog` + `DialogSurface`, ported from `src/lib/fancy-ui/dialog/`. The port
register below is what PORTING.md's "port the bug and note it" discipline asks
for, applied to the mechanisms that could not be ported verbatim.

`DialogSurface` is not exported from `index.ts` — an implementation detail on
this side too, shared with the `AlertDialog` port when that lands.

## Divergences from the internals contract

Two, both in `DialogSurface.tsx`, both marked in the source with a
`CONTRACT divergence` comment. Each was verified by running this folder's suite
against the contract's literal shape first.

### C-1 — `useScrollLock(presence.mounted)`, not a bare `useScrollLock()`

The contract's worked example (§5.8) writes a bare `useScrollLock()` and its
comment reasons "mounted for the whole exit ⇒ this releases when the fade
ends". That holds only for a component whose own mounting scope IS the
surface's. This one's is not: `Dialog` renders `DialogSurface`
unconditionally — exactly as the source does, with the `{#if open}` living
_inside_ the surface — so `DialogSurface` is mounted for as long as a `Dialog`
is anywhere in the tree, open or closed.

With the bare call, the lock is acquired when the page's first `Dialog` mounts
and released only when it unmounts. Verified: _locks the page scroll while open
and releases it on close_ fails on the release, timing out with
`document.body.style.position` still `"fixed"`.

`presence.mounted` is the mounting scope expressed as a boolean, and §3.8's
actual prohibition — never `useScrollLock(open)` — is untouched: `mounted`
stays true for the whole exit, so the release still lands in the commit that
unmounts the subtree, which is where the source action's outro-delayed
`destroy()` put it.

### C-2 — the `Portal` is hoisted above the presence gate

The worked example ends with `if (!presence.mounted) return null;` and puts
`<Portal>` inside the returned tree, so the portal mounts in the same commit as
the surface. `usePortalTarget` resolves its container in a layout effect, so a
freshly-mounted `Portal` renders `null` on that pass. The registered nodes
therefore do not exist yet when `usePresence`'s own layout effect (a parent's,
so it runs after the portal's) looks for legs to start — the group settles with
nothing attached, `state` jumps straight to `"open"`, and the entrance is
skipped outright.

Verified: with the literal shape, _plays an entrance leg when it opens from
closed_ fails — `FakeAnimation.instances` records no animation on either the
panel or the scrim. Every other assertion in this file passes either way, which
is exactly why the regression test exists.

Keeping `<Portal>` mounted and gating its CHILDREN on `presence.mounted`
resolves the container once, at `DialogSurface`'s own mount, so every later
open attaches its nodes in the very commit `usePresence` is waiting for. A
`Portal` with no children renders nothing, so a closed dialog still costs no
DOM.

## Inherited divergences that apply here

| #    | What it means for this component                                                                                                                                                                                                                                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1  | `createPortal` renders into `document.body` instead of relocating a rendered node. The panel and scrim are absent from server HTML; inert in practice, since `open` starts false. Synthetic events still bubble through the React tree, which nothing here relies on — `useDismissable` listens natively on `document`. |
| D-2  | `markSurfaceState` is not ported. `data-state` is an ordinary React attribute fed by `presence.surfaceState`; same two emitted values.                                                                                                                                                                                  |
| D-3  | The focus trap's `onActivate(returnFocusNow, rearm)` is the hook's return value. The source's two module-level `let`s, two handler functions and `onActivate` closure collapse to `const trap = useFocusTrap(...)` plus the two `usePresence` callbacks.                                                                |
| D-6  | `dismissable`'s `active` is the plain boolean `open`. `exclude` and `fallbackFocus` keep their getter form — they are genuinely dynamic and are resolved at event time.                                                                                                                                                 |
| D-10 | No portal-before-focus-trap ordering ceremony. `createPortal` commits children into the container before any effect runs, so the node the trap focuses is always connected; the silent-no-op `.focus()` hazard the source's comment block warns about cannot recur.                                                     |
| D-12 | `useElementRef` costs one extra render at mount. Not visible — it lands before paint.                                                                                                                                                                                                                                   |

## Other port decisions

- **`open = $bindable(false)` → an internal copy re-synced during render.**
  The caller's value wins on every render it changes; between those the
  component's own copy is free to move, which is what makes all three call
  shapes work off one implementation (a controlled caller, a caller passing
  only `onOpenChange`, and a caller passing neither and letting the `trigger`
  run the whole thing). Re-synced in the render path rather than an effect: an
  effect would paint one frame of the stale value first.
- **`triggerRef` is a `useRef`, not state.** The source uses `$state` because
  that is how `bind:this` is spelled; nothing renders off it here, and both
  consumers (`exclude`, `fallbackFocus`) resolve it at event time.
- **`ref` → `forwardRef`.** `DialogSurfaceProps` therefore has no `ref` field;
  the panel element arrives through the component's ref channel. `Dialog`
  forwards straight through to the panel.
- **`prefers-reduced-motion` is not this component's business.** `anchored()`
  collapses its own duration to 0, `runTransition` then never calls
  `element.animate()`, and the close stays synchronous. The source's `<style>`
  block says the same thing and is ported with its comment intact.
