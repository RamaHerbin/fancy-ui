# NoiseReveal

A WebGL image reveal driven by a Perlin-noise dissolve mask, a radial gradient that contracts as the reveal progresses, and a subtle wave displacement on the mesh itself. Reveals either once on scroll-into-view or under full manual control via a `revealed` prop.

## Usage

```svelte
<script lang="ts">
	import { NoiseReveal } from "fancy-ui-svelte";
</script>

<!-- Reveals once when it scrolls into view -->
<NoiseReveal
	src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800"
	alt="Mountain peak above the clouds"
	class="h-[300px] max-w-md"
/>
```

```svelte
<!-- Manual control — can also be hidden again -->
<script lang="ts">
	import { NoiseReveal } from "fancy-ui-svelte";
	let revealed = $state(true);
</script>

<NoiseReveal src="/photo.jpg" trigger="manual" {revealed} />
<button onclick={() => (revealed = !revealed)}>{revealed ? "Hide" : "Reveal"}</button>
```

## Props

| Prop       | Type                 | Default  | Description                                                            |
| ---------- | -------------------- | -------- | ---------------------------------------------------------------------- |
| `src`      | `string`             | —        | Image URL (required)                                                   |
| `alt`      | `string`             | —        | Accessible label for the image                                         |
| `trigger`  | `"view" \| "manual"` | `"view"` | `"view"` reveals once on viewport entry; `"manual"` follows `revealed` |
| `revealed` | `boolean`            | `false`  | Manual reveal state — only used with `trigger="manual"`; can re-hide   |
| `duration` | `number`             | `1.5`    | Reveal animation duration in seconds                                   |
| `delay`    | `number`             | `0`      | Delay before reveal in seconds — only applies to `trigger="view"`      |
| `class`    | `string`             | `""`     | Additional CSS classes on the root                                     |

## Implementation notes

- The dissolve mask is computed entirely in the fragment shader: a domain-warped Perlin noise (`cnoise`, classic 3D Perlin noise) combined with a radial gradient anchored at the image center that contracts as `uProgress` goes from 0 to 1, clamped and inverted into an alpha value — there's no CPU-side mask texture.
- Progress is driven by a hand-rolled tween (`setTarget`, cubic ease-in-out) rather than a library, advanced each animation frame against `performance.now()`; under `prefers-reduced-motion: reduce` the tween is skipped entirely and the value jumps straight to its target.
- `trigger="view"` uses an `IntersectionObserver` (`threshold: 0.1`) that disconnects itself after the first intersection — the reveal only ever fires once per mount, `delay` is applied via `setTimeout` after that first intersection, not before.
- `trigger="manual"` re-runs `setTarget(revealed ? 1 : 0)` on every change to `revealed`, so unlike `"view"` it supports revealing and re-hiding repeatedly.
- The image texture loads asynchronously (`THREE.TextureLoader`); until it resolves, `uTexture` is `null` and the plane renders whatever the shader produces with no texture bound — there is no separate loading placeholder.
- The plane is a unit `PlaneGeometry` scaled at render time to exactly fill the camera frustum at `z = 0` for the current aspect ratio (`fitPlane`), and `CoverUV` in the fragment shader applies `object-fit: cover`-style UV cropping so images with a different aspect ratio than the container aren't stretched.
- Cleanup (on effect teardown) removes the `resize` listener, cancels the render loop, removes the canvas from `container`, and disposes the renderer, geometry, material, and any loaded texture.
- When `alt` is provided, the root gets `role="img"` and `aria-label={alt}` so the canvas-rendered image is announced to assistive tech.
