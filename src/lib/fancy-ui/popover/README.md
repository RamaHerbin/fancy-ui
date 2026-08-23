# Popover

An anchored panel that opens next to a trigger and holds interactive
content — a set of quick settings, a small form, a menu with more than a
button click can carry. Non-modal: it does not lock scroll, and the rest of
the page stays reachable once it closes.

## Components

- `Popover` — the whole thing: renders the real trigger `<button>` and,
  once open, the portalled/positioned/focus-trapped panel
- `PopoverContent` — the panel itself, split out so `Popover`'s own file
  stays about state and the trigger; not something you reach for directly

## Usage

```svelte
<script>
	import { Popover } from "fancy-ui-svelte";
</script>

<Popover>
	{#snippet trigger()}
		⚙ Options
	{/snippet}

	<div class="flex flex-col gap-1.5">
		<span class="font-semibold">Dimensions</span>
		<div class="flex gap-2">
			<input placeholder="W 100%" />
			<input placeholder="H 25px" />
		</div>
	</div>
</Popover>
```

`open` is bindable, or drive it yourself with `onOpenChange` — a plain,
non-bound `open` plus that callback works too, the same three ways every
other bindable prop in this library does:

```svelte
<Popover bind:open={panelOpen}>...</Popover>

<Popover onOpenChange={(open) => console.log("popover is now", open)}>...</Popover>

<Popover open={panelOpen} onOpenChange={(v) => (panelOpen = v)}>...</Popover>
```

## Why `trigger` renders inside a real `<button>`, not as one

`trigger` is a `Snippet`, and Svelte has no way to hand a snippet's own root
element extra attributes from outside it — there's no prop to merge
`aria-expanded`/`aria-controls`/the click handler onto. So `Popover` owns a
real `<button>` itself and renders `trigger`'s content inside it. That means
`trigger` should be text and/or an icon, not another interactive control —
a `<button>` you put a `<Button>` inside of is two nested interactive
elements fighting over one click and one tab stop, and the outer one is the
one this component actually wires up.

## Accessibility

- The trigger carries `aria-expanded` (mirrors `open`) and `aria-controls`
  (the panel's real id — present in the DOM once the panel is, since the
  panel doesn't exist at all while closed; the same shape a native
  disclosure/combobox trigger already uses).
- On open, focus moves to the first focusable element inside the panel
  (`_internals/focus-trap.js`'s `focusTrap`, which also cycles Tab within
  the panel while it's open). On close, focus returns to the trigger.
- No `role` on the panel. A popover has no title to hang `aria-labelledby`
  off — `trigger` is caller content, not a documented heading — and
  `role="dialog"` with no accessible name is worse than no role. Reachability
  comes from the focus trap and from `dismissable`, not a landmark.
- Escape and an outside click close the panel by default; set
  `dismissible={false}` to require an explicit action (re-clicking the
  trigger, or a control inside the panel) instead. Both go through
  `_internals/dismissable.js`, which keeps a stack across nested overlays —
  a `Popover` opened from inside a `Dialog` only closes itself on the first
  Escape, not the dialog underneath it too.
- Not `aria-modal`, and nothing here locks scroll — the rest of the page
  stays scrollable and clickable (an outside click just closes the panel
  first) the whole time it's open.

## Props

### Popover

| Prop           | Type                                     | Default    | Description                                                 |
| -------------- | ---------------------------------------- | ---------- | ----------------------------------------------------------- |
| `open`         | `boolean`                                | `false`    | Whether the panel is open. Bindable                         |
| `onOpenChange` | `(open: boolean) => void`                | —          | Called whenever the panel opens or closes                   |
| `side`         | `"top" \| "bottom" \| "left" \| "right"` | `"bottom"` | Side of the trigger to place the panel on                   |
| `align`        | `"start" \| "center" \| "end"`           | `"center"` | Alignment along the trigger's cross axis                    |
| `offset`       | `number`                                 | `8`        | Gap in pixels between the trigger and the panel             |
| `dismissible`  | `boolean`                                | `true`     | Whether Escape and an outside click close the panel         |
| `trigger`      | `Snippet`                                | —          | The trigger's content, rendered inside the owned `<button>` |
| `children`     | `Snippet`                                | —          | The panel's content                                         |
| `class`        | `string`                                 | —          | Additional CSS classes, merged onto the panel               |
| `ref`          | `HTMLDivElement \| null`                 | `null`     | Bindable reference to the panel element                     |

## Theming

The trigger's focus ring has no semantic token, so it falls back to a
`light-dark()` accent pair local to the component — the same shape `Button`
and `RadioGroup` use:

```css
.my-app {
	--ft-accent: oklch(0.55 0.2 300);
}
```

The panel itself uses `bg-popover`/`text-popover-foreground`/`border-border`
— tokens a consumer's theme is already expected to define, unlike the
accent.

## Motion

The panel enters with a 150 ms opacity + scale rise on the shared arrival
curve (`DURATIONS.fast` and `JS_EASINGS.out` from the motion foundation),
growing from a `0.92` floor. The growth origin follows the side the panel was
actually placed on — flipped placements included — so it always appears to come
out of the trigger rather than out of its own centre. The resolved placement is
exposed as `data-side` / `data-align` for consumers that want to key their own
styling off it.

It leaves the same way in reverse: 150 ms again, on the departure curve
(`JS_EASINGS.in`), collapsing to a `0.96` floor — half the entrance's delta,
because leaving is a smaller gesture than arriving and a full-depth collapse
reads as the panel being sucked away rather than simply closing. Both
directions come from a single bidirectional `transition:`, so a popover
reopened mid-fade continues from wherever it had got to instead of snapping to
invisible and starting again.

The panel therefore outlives `open` by the length of that fade, and three
things deliberately do **not** wait for it:

- `open` still flips synchronously, so `bind:open` and `onOpenChange` are
  unchanged — a second Escape while the panel is fading is swallowed rather
  than firing the callback twice, and it reaches whatever dismissable layer is
  underneath instead.
- Focus returns to the trigger at the dismiss instant, not when the fade ends.
- The fading panel is `inert` for the whole exit, so it cannot be clicked or
  tabbed into on its way out.

While it is leaving, the panel carries `data-state="closing"` (it is
`data-state="open"` the rest of the time) — the hook for a consumer that wants
to key its own styling off the exit.

Both directions are JS transitions, not CSS animations, so there is no
`--ft-*` variable to override here; the timing comes from the shared token
ladder and moves with it.

- **Reduced motion** — no animation in either direction; the panel appears and
  disappears instantly, and the close is fully synchronous again. Its
  visibility never depended on the animation, so nothing is reachable only
  through motion.
- **Touch and coarse pointers** — unchanged; neither direction is
  pointer-gated.

## Implementation Notes

- `computePosition`/the `anchorPosition` action (`_internals/anchor-position.js`)
  own all the flip-and-clamp maths; `PopoverContent` only supplies the
  anchor element and the requested side/align/offset.
- The panel is a real second component (`PopoverContent`), coordinated with
  the root through a small `PopoverContext` (`types.ts`) rather than props,
  because it needs seven different pieces of the root's state at once
  (`contentId`, `side`, `align`, `offset`, `dismissible`, `triggerRef`,
  `close`) — the usual signal in this codebase for context over a prop list.
- `contentId` comes from `$props.id()`, not `_internals/id.js`'s `uid()` —
  the same reasoning as `FormField` and `RadioGroup`: it has to be correct
  from the first server-rendered paint, not only after hydration.
- `PopoverContent` is portalled to `document.body` (`_internals/portal.js`)
  so it escapes any ancestor `overflow: hidden` or stacking context the
  trigger happens to sit inside.
- **Portal-before-focus-trap ordering**: `PopoverContent`'s panel carries
  `use:portal` and `use:focusTrap` on the exact same element, with
  `use:portal` written first in source order — not on a wrapper `<div>`
  with `use:focusTrap` nested inside it. `use:` actions only run once
  their own node is fully built, but a _child's_ action can still fire
  before its _parent's_, so a focus-trap action living on a node nested
  inside a separate portal wrapper would try to focus into a subtree the
  wrapper's own portal action hasn't relocated into `document.body` yet —
  `.focus()` on a still-detached element is a silent no-op in every
  browser (jsdom included). Two actions on the identical element are
  guaranteed to run in declaration order regardless of how Svelte
  schedules effects across a parent/child pair, which is what actually
  avoids this — see the Dialog/Sheet/Drawer READMEs (and
  `_internals/focus-trap.ts`'s own header comment) for the same note
  everywhere else this pairing shows up.
