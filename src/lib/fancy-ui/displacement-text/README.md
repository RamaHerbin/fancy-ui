# DisplacementText

Large text rendered as a Three.js plane whose surface bulges toward the viewer near the cursor, via a vertex-shader displacement driven by raycasting against an invisible hit-plane. The text itself is rasterized to a canvas texture, not drawn with real DOM glyphs.

## Usage

```svelte
<script lang="ts">
	import { DisplacementText } from "fancy-ui-svelte";
</script>

<DisplacementText text="Hover Me" fontSize={220} class="h-[400px] w-full" />
```

```svelte
<!-- Fixed color instead of following light/dark mode -->
<DisplacementText text="Fancy" color="#ff4d4d" font="Georgia, serif" />
```

## Props

| Prop         | Type     | Default               | Description                                                                          |
| ------------ | -------- | --------------------- | ------------------------------------------------------------------------------------ |
| `text`       | `string` | `"Hover Me"`          | Text to display                                                                      |
| `fontSize`   | `number` | `200`                 | Font size in pixels, used when rasterizing the text texture                          |
| `font`       | `string` | `"Inter, sans-serif"` | Font family                                                                          |
| `color`      | `string` | —                     | Fixed text color; overrides `lightColor`/`darkColor` and disables dark-mode tracking |
| `lightColor` | `string` | `"#000000"`           | Text color in light mode                                                             |
| `darkColor`  | `string` | `"#ffffff"`           | Text color in dark mode                                                              |
| `class`      | `string` | `""`                  | Additional CSS classes on the root                                                   |

## Implementation notes

- The whole Three.js scene (renderer, camera, geometry, material) is created and torn down inside a single `$effect` that depends on `text`, `fontSize`, `font`, `color`, `lightColor`, and `darkColor` — any of those changing disposes the old scene and builds a new one from scratch rather than updating it incrementally. This is simple but not cheap; avoid binding these props to something that changes every frame.
- Displacement comes from a plane geometry (100×100 segments) whose vertex shader offsets `z` based on distance from a `uDisplacement` uniform, updated every `pointermove` by raycasting against a large (500×500), fully transparent hit-plane placed in the same scene — the visible text plane itself is not the raycast target.
- Text is rasterized once per texture rebuild via a 2048×2048 `<canvas>` with `ctx.fillText`, then uploaded as a `THREE.CanvasTexture`.
- When `color` is not set, a `MutationObserver` watches `document.documentElement`'s `class` attribute (the app's dark-mode toggle) and regenerates the text texture — disposing the old one — whenever the resolved color actually changes. This observer is not created at all when `color` is set.
- Cleanup on effect teardown: removes the `pointermove` and `resize` listeners, cancels the animation frame, disconnects the `MutationObserver`, removes the renderer's canvas from the DOM, and disposes the renderer, geometry, material, and texture.
- No `prefers-reduced-motion` handling — the render loop and pointer tracking run regardless of user preference.
