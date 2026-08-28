# Dock

An icon dock component whose items magnify smoothly as the cursor approaches.

## Components

- `Dock` - Main container that tracks mouse position
- `DockIcon` - Individual dock item with magnification effect
- `DockSeparator` - Visual separator between icon groups

## Usage

```svelte
<script>
	import { Dock, DockIcon, DockSeparator } from "$lib/fancy-ui/dock";
</script>

<Dock>
	<DockIcon>
		<img src="/icon1.svg" class="size-full" alt="Icon" />
	</DockIcon>
	<DockSeparator />
	<DockIcon>
		<img src="/icon2.svg" class="size-full" alt="Icon" />
	</DockIcon>
</Dock>
```

## Props

### Dock

| Prop            | Type                            | Default        | Description                             |
| --------------- | ------------------------------- | -------------- | --------------------------------------- |
| `class`         | `string`                        | `''`           | Additional CSS classes                  |
| `magnification` | `number`                        | `60`           | Maximum size increase in pixels         |
| `distance`      | `number`                        | `140`          | Mouse distance for magnification effect |
| `direction`     | `'top' \| 'middle' \| 'bottom'` | `'middle'`     | Vertical alignment of icons             |
| `orientation`   | `'horizontal' \| 'vertical'`    | `'horizontal'` | Dock orientation                        |

### DockIcon

| Prop    | Type     | Default | Description            |
| ------- | -------- | ------- | ---------------------- |
| `class` | `string` | `''`    | Additional CSS classes |

### DockSeparator

| Prop    | Type     | Default | Description            |
| ------- | -------- | ------- | ---------------------- |
| `class` | `string` | `''`    | Additional CSS classes |

## Motion

- Icons grow as the pointer approaches, up to `magnification` pixels above
  their resting 40px, falling off with distance. The size is written as an
  inline `width`/`height` from JavaScript, not from CSS.
- **Reduced motion.** Because the size is JavaScript-driven, no CSS media
  query could stop it — the driver itself is gated. `Dock` watches
  `(prefers-reduced-motion: reduce)` and skips both the pointer tracking and
  the per-icon measuring, so every icon keeps its resting 40px. Nothing else
  about the dock changes.
- **Touch and coarse pointers.** `Dock` also watches `(any-hover: none)` and
  applies the same gate: a device where nothing at all can hover would
  otherwise magnify around wherever the last tap happened to land. Skipping
  the measurement there also removes a `getBoundingClientRect()` per icon per
  frame on exactly the devices that can least afford it. `any-hover`, not
  `hover`: the unprefixed feature describes only the PRIMARY pointer, so a
  hybrid laptop-tablet reports `(hover: none)` even with a mouse attached,
  and the dock would ignore that mouse entirely.
- **Touch on a device that can hover.** The capability query cannot answer
  that one, so tracking runs on pointer events and drops anything whose
  `pointerType` is `"touch"`, along with non-primary pointers. A finger on a
  hybrid moves nothing; the mouse beside it still magnifies.
- Both media queries are started inside an `$effect` and torn down on
  unmount, so nothing touches `window` during SSR and no listener outlives
  the component.

## Implementation Notes

- Uses Svelte context (`setContext`/`getContext`) for the shared pointer position and the `magnify` flag
- Mouse position stored in reactive objects (`{ current: number }`) for child reactivity
- Base icon size is 40px, magnification adds to this
- `DockContext.magnify` is published by `Dock` and read by `DockIcon` before it measures anything; it is false under reduced motion or on a coarse pointer
