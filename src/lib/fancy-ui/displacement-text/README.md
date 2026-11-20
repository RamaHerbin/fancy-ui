# DisplacementText

Large text rendered as a Three.js plane whose surface bulges toward the viewer near the cursor, via a vertex-shader displacement driven by raycasting against an invisible hit-plane. While the effect runs, the text is rasterized to a canvas texture; when it cannot or should not run, the real text is shown as DOM text instead.

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
| `maxDpr`     | `number` | `2`                   | Upper bound for the renderer's device pixel ratio                                    |
| `class`      | `string` | `""`                  | Additional CSS classes on the root                                                   |

## Reduced motion and fallbacks

- With `prefers-reduced-motion: reduce`, no scene is built: no render loop, no WebGL context, no pointer tracking. The component shows the real text as selectable DOM text, in the same font, bold weight and color as the canvas, sized and turned (45°, seen at the camera's tilt) like the resting frame.
- The preference is followed live. Turning it on while the effect runs stops the loop and releases the renderer, textures and listeners; turning it off builds the scene again. The component is not remounted either way.
- The same static text is used when WebGL2 is unavailable (a throwaway context is created and released before the renderer is built, and a renderer or scene build that still fails is caught, releasing whatever it had already created, its WebGL context included), and after the GPU drops the context: the loop stops, every resource is released, and the static text stays for the rest of the mount.
- The server render and the first client render show the static text; the canvas replaces it once the component has mounted and the checks above pass.

## Implementation notes

- All the props are live and none of them rebuilds the scene. `text`, `fontSize`, `font` and the colors re-rasterize the texture in place (only when the color on screen actually changes), `color` going from set to unset starts or stops the theme observer, and `maxDpr` re-applies the pixel ratio to the existing renderer. Nothing is read only once at mount.
- The renderer's pixel ratio is `min(devicePixelRatio, maxDpr)`, so high-density screens do not render four or nine times the pixels of the box.
- Displacement comes from a plane geometry (100×100 segments) whose vertex shader offsets `z` based on distance from a `uDisplacement` uniform, updated every `pointermove` by raycasting against a large (500×500), fully transparent hit-plane placed in the same scene — the visible text plane itself is not the raycast target.
- Text is rasterized via a 2048×2048 `<canvas>` with `ctx.fillText`, then uploaded as a `THREE.CanvasTexture`; the old texture is disposed on every swap.
- When `color` is not set, a `MutationObserver` watches `document.documentElement`'s `class` attribute (the app's dark-mode toggle) and regenerates the text texture — or recolors the static text — whenever the resolved color actually changes. No observer runs while `color` is set.
- Cleanup on unmount: removes the media-query, `pointermove`, `resize` and context-loss listeners, cancels the animation frame, disconnects the observers, removes the renderer's canvas from the DOM, and disposes the renderer, geometry, material, and texture.
- The container carries `role="img"` and `aria-label={text}` so the headline is exposed to assistive technology in both modes; the appended `<canvas>` itself stays decorative.

## Pointer motion is decorative

The pointer-driven motion here is decorative: it only enhances the effect, and all content and controls stay fully usable without it (keyboard, touch, or a pointer that never moves). This follows the escape clause in the shared interaction contract.
