# Dock

An icon dock on a lit glass shelf. Icons swell on a smooth cosine curve as the
pointer approaches, a soft pool of light follows the pointer across the shelf,
the shelf edge brightens where the pointer is, and a small dot marks the icon
under it.

## Components

- `Dock` - The shelf: tracks the pointer and publishes it to its icons
- `DockIcon` - Individual dock item with magnification, floor reflection and indicator dot
- `DockSeparator` - A hairline seam between icon groups

## Usage

```svelte
<script>
	import { Dock, DockIcon, DockSeparator } from "$lib/fancy-ui/dock";
</script>

<Dock ariaLabel="Applications">
	<DockIcon>
		<button type="button" aria-label="Home" class="size-full rounded-[30%]">…</button>
	</DockIcon>
	<DockSeparator />
	<DockIcon>
		<button type="button" aria-label="Settings" class="size-full rounded-[30%]">…</button>
	</DockIcon>
</Dock>
```

## The look

- **Shelf.** Translucent glass (`rgba(20,20,22,.7)` in dark, `white/75` in
  light) with a 1px hairline border, a 1px inner top highlight, a soft drop
  shadow and a second hairline frame 4px inside the edge — a frame within a
  frame. The surface colours are Tailwind classes, so a `class` such as
  `bg-…` or `border-…` still overrides them.
- **Spotlight** (`spotlight`, on by default). A blurred ~140px pool of accent
  light with a white-hot core rides the pointer inside the shelf, and a 1px
  ring masked to the shelf edge brightens only near the pointer. Both fade in
  when the pointer enters and out when it leaves. They are moved by
  `transform` from two CSS variables, `--dock-x` / `--dock-y`, which `Dock`
  writes from the pointer it already tracks — no extra listeners.
- **Floor reflection** (`reflection`, on by default). One pseudo-element per
  icon: a soft ellipse just under it — a contact shadow on the light shelf, a
  faint accent glow on the dark one. It is sized in percent, so it grows with
  the magnified icon.
- **Indicator dot.** The icon the pointer is over (within its own half-width)
  gets `data-dock-active`; CSS fades in a 4px dot below it (beside it on a
  vertical dock).
- **Magnification curve.** `size = 40 + magnification × ½(1 + cos(π·t))`,
  `t = clamp(|offset| / distance, 0, 1)`: flat on top, flat at the shoulders,
  so neighbours swell and settle rather than forming a tent. Width and height
  transition over 180ms on the shared ease-out curve.

## Props

### Dock

| Prop            | Type                            | Default        | Description                                               |
| --------------- | ------------------------------- | -------------- | --------------------------------------------------------- |
| `class`         | `string`                        | `''`           | Additional CSS classes                                    |
| `magnification` | `number`                        | `60`           | Maximum size increase in pixels                           |
| `distance`      | `number`                        | `140`          | Pointer distance over which the magnification falls off   |
| `direction`     | `'top' \| 'middle' \| 'bottom'` | `'middle'`     | Cross-axis alignment of the icons                         |
| `orientation`   | `'horizontal' \| 'vertical'`    | `'horizontal'` | Dock orientation (also emitted as `aria-orientation`)     |
| `spotlight`     | `boolean`                       | `true`         | Pointer-following pool of light and lit shelf edge        |
| `reflection`    | `boolean`                       | `true`         | Soft contact shadow / glow ellipse under each icon        |
| `ariaLabel`     | `string`                        | —              | Accessible name for the toolbar, rendered as `aria-label` |

### DockIcon

| Prop    | Type     | Default | Description            |
| ------- | -------- | ------- | ---------------------- |
| `class` | `string` | `''`    | Additional CSS classes |

### DockSeparator

| Prop    | Type     | Default | Description            |
| ------- | -------- | ------- | ---------------------- |
| `class` | `string` | `''`    | Additional CSS classes |

### Theming variables

Set on the `Dock` (or any ancestor) to recolour the light without new props.

| Variable                | Default                                      | Controls                             |
| ----------------------- | -------------------------------------------- | ------------------------------------ |
| `--dock-accent`         | `var(--primary)`                             | Spotlight, lit edge, dot, reflection |
| `--dock-spotlight-size` | `140px`                                      | Diameter of the spotlight pool       |
| `--dock-frame-color`    | `rgba(0,0,0,.05)` / `rgba(255,255,255,.045)` | The inner frame hairline             |

## Motion

- Icons grow as the pointer approaches, up to `magnification` pixels above
  their resting 40px, on the cosine curve above. The size is written as an
  inline `width`/`height` from JavaScript, not from CSS.
- **Viewport coordinates.** The pointer is recorded as `clientX`/`clientY`
  and compared with each icon's `getBoundingClientRect()`, which is also
  viewport-relative. Earlier versions used `pageX`/`pageY`, which added the
  scroll offset and magnified the wrong icons on a scrolled page; that is
  fixed.
- **Reduced motion.** Because the size is JavaScript-driven, no CSS media
  query could stop it — the driver itself is gated. `Dock` watches
  `(prefers-reduced-motion: reduce)` and every icon keeps its resting 40px.
  The pointer is still followed, so the indicator dot still marks the icon
  under it (it snaps instead of fading). The spotlight holds still, dim and
  centred in the shelf, and the lit edge is off.
- **Touch and coarse pointers.** `Dock` also watches `(any-hover: none)`: a
  device where nothing at all can hover gets no magnification, no spotlight,
  no indicator and no measuring at all. `any-hover`, not `hover`: the
  unprefixed feature describes only the PRIMARY pointer, so a hybrid
  laptop-tablet reports `(hover: none)` even with a mouse attached, and the
  dock would ignore that mouse entirely.
- **Touch on a device that can hover.** The capability query cannot answer
  that one, so tracking runs on pointer events and drops anything whose
  `pointerType` is `"touch"`, along with non-primary pointers. A finger on a
  hybrid moves nothing; the mouse beside it still magnifies.
- Pointer writes are coalesced into at most one `requestAnimationFrame` in
  flight, cancelled on unmount. Both media queries are started inside an
  `$effect` and torn down on unmount, so nothing touches `window` during SSR
  and no listener outlives the component.

## Accessibility

- The shelf is `role="toolbar"` with `aria-orientation` and an optional
  `aria-label` (`ariaLabel`). Give it a name when the icons carry none.
- `DockSeparator` is `role="separator"`, oriented across the dock.
- Every decorative layer (spotlight, lit edge, inner frame) sits in one
  `aria-hidden` element; the dot and reflection are pseudo-elements.
- Put a real `button` or link inside each `DockIcon`, with its own label.

## Implementation Notes

- Uses Svelte context (`setContext`/`getContext`) for the shared pointer position, the `magnify` flag and the `reflection` flag
- Pointer position stored in reactive objects (`{ current: number }`) for child reactivity
- Base icon size is 40px (`DOCK_BASE_SIZE`), magnification adds to this; the curve is the pure `dockIconSize(offset, magnification, distance)` exported from `DockIcon.svelte`'s module script
- `DockContext.magnify` is published by `Dock` and read by `DockIcon` before it sizes itself; it is false under reduced motion or on a coarse pointer. An icon skips `getBoundingClientRect()` whenever the pointer is outside the dock
