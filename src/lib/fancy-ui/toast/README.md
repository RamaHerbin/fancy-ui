# Toast

A notification system, not a single panel: a store (`toast()` /
`dismissToast()`), a viewport you mount once (`<Toaster />`), and the toast
itself (`<Toast />`, rendered by the viewport — you will not normally import
it directly).

```svelte
<!-- root layout, mounted once -->
<Toaster />
```

```ts
import { toast } from "$lib/fancy-ui/toast";

toast({ title: "Theme saved", description: "CSS copied to the clipboard.", variant: "success" });
```

`toast()` works from anywhere — an event handler, a submit callback, a promise
rejection — with no `<Toaster>` in scope at the call site. The store is a
module-level singleton for exactly that reason; every other reactive helper
in this library is a per-instance factory, this one deliberately isn't (see
the comment at the top of `store.svelte.ts`).

## Accessibility

- **The live regions exist from mount, not from the first toast.**
  `<Toaster>` renders two empty `aria-live` regions immediately and only ever
  changes their text content afterwards. A live region created at the moment
  of the announcement is not reliably picked up by screen readers — existing
  first is what makes the update land.
- **Two regions, one `polite` and one `assertive`, never one region with a
  toggled attribute.** `error` toasts announce through the assertive region;
  `success`, `info` and `loading` announce through the polite one. An
  assertive announcement interrupts whatever a screen reader is already
  saying, which is appropriate for "this failed" and hostile for "saved".
  Flipping a single region's `aria-live` value at runtime is not reliably
  picked up by screen readers either, which is why there are two.
- **Auto-dismiss is never the only way to learn what a toast said.** Every
  toast, regardless of variant, carries its own close button — the mockup
  this was built from only drew one on the success toast, but a toast a user
  didn't finish reading before it vanished is a toast that failed at its one
  job, so all four variants get one.
- **Every toast's countdown pauses on hover or focus — not only the ones
  with an action.** `Toast.svelte` wires this on every toast's root
  unconditionally; nothing in it reads `item.action`. The case that matters
  most is a toast carrying an action, since that's the one a user is most
  likely to be reaching into rather than just glancing at — but the
  protection itself doesn't check for one: a plain "Saved" toast with no
  action pauses on hover exactly the same way. Two independent conditions
  (pointer over the toast, or focus anywhere inside it) rather than one
  shared flag — letting go of one while still engaged with the other must
  not resume the clock — and resuming continues from where it left off, not
  from the start, once both let go.

## Duration

`duration` is milliseconds until auto-dismiss; `Infinity` means sticky.
Default is 5000ms, except for `variant: "loading"`, which defaults to
`Infinity` — a loading toast has no natural "done" time, and auto-dismissing
it on a fixed clock would misreport work that is still running as finished.
Resolve it yourself: dismiss the loading toast and raise a new one once the
operation settles.

## Timers survive a `<Toaster>` unmounting, remounting, or swapping

Each toast's auto-dismiss is tracked as an absolute deadline (`Date.now() +
duration`), not a countdown owned by whichever `<Toaster>` happens to be
mounted. `<Toaster>` stops its live timers on unmount and re-arms whatever it
inherits on mount — so a toast that was mid-countdown when one viewport went
away and a different one took over still dismisses at the same real-world
moment either way, rather than freezing forever with no timer left to fire
it. Pausing (hover/focus) shifts the deadline forward by however long the
pause lasted; unmounting does not, since there is no pointer left to have
frozen anything for a destroyed viewport.

## Stacking and limits

At most 4 toasts are visible at once. Pushing a 5th dismisses the oldest to
make room — toasts are a transient, glanceable channel, not a queue a user
is expected to work through in order, so silently dropping the stalest one
is preferable to either rejecting the newest or growing the stack unbounded.
The list is keyed by each toast's own id, not its position, since dismissal
frequently removes from the middle of the stack.

## What's not in scope

No promise-based `toast.promise(...)` helper and no update-in-place API for
turning a loading toast into a success/error one — call `dismissToast` on the
loading toast and raise a fresh one. No positioning per-toast; `<Toaster>`'s
`position` prop places the whole stack.

## Props

### `<Toaster />`

| Prop       | Type                     | Default          | Description                                                |
| ---------- | ------------------------ | ---------------- | ---------------------------------------------------------- |
| `position` | `ToasterPosition`        | `"bottom-right"` | Corner (or edge-center) the stack anchors to               |
| `class`    | `string`                 | —                | Additional classes for the viewport that stacks the toasts |
| `ref`      | `HTMLDivElement \| null` | `null`           | Bindable reference to the root node                        |

`ToasterPosition` is one of `"top-left"`, `"top-center"`, `"top-right"`,
`"bottom-left"`, `"bottom-center"`, `"bottom-right"`.

### `toast(options)`

| Option        | Type                                          | Default                             | Description                                                                                                |
| ------------- | --------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `title`       | `string`                                      | — (required)                        | Primary line                                                                                               |
| `description` | `string`                                      | —                                   | Secondary line, shown under the title                                                                      |
| `variant`     | `"success" \| "error" \| "info" \| "loading"` | `"info"`                            | Icon, accent color, and which live region it announces through — `error` is assertive, the rest are polite |
| `duration`    | `number`                                      | `5000` (`Infinity` for `"loading"`) | Milliseconds before auto-dismiss. `Infinity` means sticky                                                  |
| `action`      | `ToastAction`                                 | —                                   | A single optional action button                                                                            |

`ToastAction` is `{ label: string; onClick: () => void }`. `onClick` does not
dismiss the toast on its own — call `dismissToast` from inside it if the
action should also close the toast.

Returns the new toast's `id` (usable with `dismissToast`), or `""` if called
outside the browser.

### `dismissToast(id)`

Dismisses a toast immediately and clears its timer. Safe to call with an id
that no longer exists.

### `<Toast />`

Renders one `ToastItem` — `<Toaster>` renders these from the store for you;
you will not normally import this directly.

| Prop    | Type                     | Default | Description                      |
| ------- | ------------------------ | ------- | -------------------------------- |
| `item`  | `ToastItem`              | —       | The toast to render              |
| `class` | `string`                 | —       | Additional classes for the panel |
| `ref`   | `HTMLDivElement \| null` | `null`  | Bindable reference               |

`ToastItem` is what `toast()` produces internally (`ToastOptions` plus a
generated `id`, with `variant`/`duration` resolved to their defaults) — not
something you'd normally construct by hand.

## Theming

Three custom properties, all with `light-dark()` fallbacks so the component
works with no consumer setup at all:

- **`--ft-status-done`** and **`--ft-status-error`** color the success and
  error icons. Direct, shared vocabulary tokens — the same ones `FormField`'s
  valid checkmark and other status surfaces across this library read — so
  retinting either moves every status surface that uses them together, this
  one included.
- **`--ft-overlay-accent`** colors the info icon, the action button's text,
  and the loading spinner's active edge. Declared once, locally, on `.ft-toast`
  itself:

  ```css
  .ft-toast {
  	--ft-overlay-accent: var(
  		--ft-accent,
  		light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
  	);
  }
  ```

  — the same indirection `Button` (`--ft-btn-accent`) and `Popover`
  (`--ft-overlay-accent` itself, the same name, shared by every overlay in
  this wave) use: the brand accent has no semantic Tailwind token, so it
  falls back to a `light-dark()` pair local to the component rather than a
  literal repeated in every rule that needs it. Retint it the same way you
  would for `Popover` or `Button`:

  ```css
  .my-app {
  	--ft-accent: oklch(0.55 0.2 300);
  }
  ```

The panel itself uses `bg-popover`/`text-popover-foreground`/`border-border`
— tokens a consumer's theme is already expected to define, unlike the accent.
