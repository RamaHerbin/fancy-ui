# HoverCard

A small anchored panel that opens when the pointer rests on a trigger (or the
trigger receives focus) and closes when it leaves — a richer, delayed-entry
sibling of a tooltip, for content like a profile preview.

## Accessibility decision: supplementary content only

HoverCard is **not** a substitute for Popover. Its content is meant to be
read, not interacted with:

- It opens on `pointerenter` **and** on focus (`focusin`), so it exists for
  keyboard users too — a hover-only surface would not.
- It closes on blur immediately (no delay: there is nothing inside worth
  tabbing into, so there is no "travel" to protect) — unless focus is moving
  into the card itself, which never happens for the text-only content this
  component is designed for, but is checked anyway as a fallback: a caller
  who ignores the guidance below and puts something focusable in the card
  still gets a card that survives the handoff instead of vanishing the
  instant Tab starts moving toward it.
- The `trigger` snippet receives the card's id (or `undefined` while closed)
  as its argument — put it on your own trigger element's `aria-describedby`
  yourself: `{#snippet trigger(describedBy)}<button aria-describedby={describedBy}>...</button>{/snippet}`.
  HoverCard cannot wire this up for you: the element it renders around your
  snippet is a plain, non-interactive wrapper with no accessible role, so an
  attribute set there is never picked up for whatever focusable element you
  render inside it — the id has to land on that element directly.

Because of that last point, **nothing inside the card should be interactive**
(no links, no buttons). `aria-describedby` only ever exposes an element's
_text content_ to assistive tech — an interactive child inside it would be
described, not reachable, which is worse than not being there. If you need a
trigger that reveals clickable content, reach for `Popover` instead, which is
built for that and opens on click rather than hover.

## The two delays

- `openDelay` (default 300ms) avoids opening on every pointer that merely
  passes over the trigger.
- `closeDelay` (default 150ms) is what lets the pointer travel from the
  trigger to the card without the card disappearing mid-trip: leaving the
  trigger starts the close timer, but entering the card cancels it. Leaving
  the card (without having gone back to the trigger) restarts the same timer.

Both delays are skipped for focus/blur, which are instantaneous — a keyboard
user does not "travel" between two elements the way a pointer does.

## Positioning

Anchored with `computePosition`/`anchorPosition` (`_internals/anchor-position.ts`):
flips to the opposite side when it would overflow the viewport, clamps so it
never renders off-screen. Rendered through a portal to `document.body` so it
escapes any ancestor `overflow: hidden` or stacking context.

## Dismissal

Not modal — no backdrop, no scroll lock, no focus trap. While open, Escape
closes it and an outside click closes it too (both via the shared
`dismissable` action, which only reacts on the top-most open layer).

## Props

See `HoverCardProps` in `HoverCard.svelte` for the full, documented list:
`open` (bindable) + `onOpenChange`, `side`, `align`, `offset`, `openDelay`,
`closeDelay`, `trigger`, `children`, `class`, `ref`.
