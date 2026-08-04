# BorderBeam

An animated light beam that travels around a container's border using a CSS `offset-path` motion path — no JS, no SVG. Place it inside a `position: relative; overflow: hidden` container; it renders as an absolutely-positioned overlay that traces the container's edge.

## Usage

```svelte
<script lang="ts">
	import { BorderBeam } from "fancy-ui-svelte";
</script>

<div class="relative overflow-hidden rounded-xl border p-6">
	<p>Content goes here</p>
	<BorderBeam />
</div>
```

Multiple beams can be layered in the same container (e.g. different `duration`/`delay`/colors per beam) for a multi-beam effect — see the `MultipleBeams` docs example.

## Props

| Prop          | Type     | Default     | Description                                   |
| ------------- | -------- | ----------- | --------------------------------------------- |
| `size`        | `number` | `200`       | Size of the beam in pixels                    |
| `duration`    | `number` | `15`        | Animation duration in seconds                 |
| `borderWidth` | `number` | `1.5`       | Border width in pixels                        |
| `anchor`      | `number` | `90`        | Anchor position along the offset path (0–100) |
| `colorFrom`   | `string` | `"#ffaa40"` | Gradient start color                          |
| `colorTo`     | `string` | `"#9c40ff"` | Gradient end color                            |
| `delay`       | `number` | `0`         | Animation delay in seconds                    |
| `class`       | `string` | —           | Additional CSS classes                        |

## Implementation notes

- Every prop is a CSS custom property (`--border-beam-*`) written into the root `<div>`'s inline `style` via a single `$derived` string — the component holds no other reactive state, and the animation itself runs entirely in a scoped `<style>` block (`@keyframes border-beam-animation`, driven by `offset-distance`).
- The border itself is drawn with a transparent border plus a two-layer `mask` (`linear-gradient(transparent,transparent), linear-gradient(white,white)`) and `mask-composite: intersect`, so only the ring where the border would be is visible — the beam element's `::after` pseudo-element is what actually moves, via `offset-path: rect(...)` sized from `--border-beam-size`.
- No `prefers-reduced-motion` handling — the beam animates continuously (`infinite linear`) regardless of user preference.
