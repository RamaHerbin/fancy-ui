# `AlertDialog` — port notes

Ported from `src/lib/fancy-ui/alert-dialog/`. Renders through the `dialog`
folder's own `DialogSurface` — imported, never duplicated — so every divergence
recorded in `../dialog/README.md` (the hoisted `Portal`, `useScrollLock(mounted)`,
D-1/D-2/D-3/D-6/D-10/D-12) applies verbatim here. This file records only what is
specific to this component.

## Port decisions

- **`open = $bindable(false)` → an internal copy re-synced during render**, the
  same shape `Dialog` uses. The caller's value wins on every render it changes;
  between those the component's own copy is free to move, which is what lets the
  `trigger` open the surface for a caller who passes only `onOpenChange` (or
  neither).
- **`ref` → `forwardRef`.** `AlertDialogProps` therefore has no `ref` field; the
  panel element arrives through the component's ref channel, forwarded straight
  through `DialogSurface`.
- **`trigger: Snippet` → `trigger: ReactNode`**, and `class` → `className`, per
  PORTING.md's API contract. Both are the only renamed members of the source
  interface.
- **`triggerRef` is a `useRef`, not state.** The source uses `$state` because
  that is how `bind:this` is spelled; nothing renders off it here and both
  consumers (`exclude`, `fallbackFocus`) resolve it at event time.
- **`onCancel` fires before the no-op guard, exactly as the source orders it.**
  `handleCancel` calls `onCancel?.()` unconditionally and then `setOpen(false)`.
  What keeps a repeated Escape during the fade from reading as a second
  cancellation is the dismiss layer's `active` gate (`active: open`, so the
  layer stops answering the instant `open` flips), with `setOpen`'s own equality
  guard behind it. Ported in that order rather than "guard first" so the
  observable behaviour matches the source's on every path, including a caller
  who calls `handleCancel`-equivalent paths back to back.
- **The dismiss rules stay fixed.** `escape={true}` and `outsideClick={false}`
  are literals, not props — there is no way for a caller to turn outside-click
  dismissal back on, which is the whole argument the source README makes.
- **No `.css` file.** The source has no `<style>` block; the panel's motion and
  its `prefers-reduced-motion` collapse both live in `dialog-surface.css` and
  `anchored()`, which this component renders through unchanged.
