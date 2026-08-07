# MatrixRain

A Canvas2D "digital rain" background: columns of falling glyphs with a bright leading character and a dimmer trailing one, faded by repeatedly painting a low-opacity black rectangle over the previous frame instead of clearing it.

## Usage

```svelte
<script lang="ts">
	import { MatrixRain } from "fancy-ui-svelte";
</script>

<div class="relative h-[400px] w-full">
	<MatrixRain />
</div>
```

```svelte
<!-- Custom color, denser and faster -->
<MatrixRain color="#39ff14" density={1.5} speed={1.8} />
```

The canvas fills its parent (`h-full w-full`) and paints its own black background, so size it via a wrapping element.

## Props

| Prop          | Type     | Default     | Description                                                             |
| ------------- | -------- | ----------- | ----------------------------------------------------------------------- |
| `color`       | `string` | `"#00ff41"` | Glyph color (the classic Matrix green)                                  |
| `speed`       | `number` | `1.0`       | Fall speed multiplier (`< 1` slower, `> 1` faster)                      |
| `density`     | `number` | `1.0`       | Column density multiplier (higher = more, narrower columns)             |
| `glyphSize`   | `number` | `16`        | Font size of each glyph in pixels                                       |
| `fadeOpacity` | `number` | `0.05`      | Opacity of the black overlay painted each frame — controls trail length |
| `class`       | `string` | —           | Additional CSS classes on the canvas                                    |

## Implementation notes

- Glyphs are drawn from a fixed katakana + Latin + digit + symbol string (`GLYPHS`); each visible position gets a freshly randomized glyph every frame it's redrawn, so no character "stays" in place — the trail effect comes entirely from `fadeOpacity`, not glyph persistence.
- Column count is `floor(width / (glyphSize * density))`, and both `glyphSize` and `density` are floored to a safe minimum (`glyphSize >= 1`, `density >= 0.1`) so extreme prop values can't divide by zero or blow up the column count.
- `speed >= 1` advances every column by `speed` rows per frame; `speed < 1` instead skips frames (`frameCount % round(1/speed) === 0`), which is why speed below 1 steps down in discrete slow-motion increments rather than scaling smoothly.
- The canvas is sized in device pixels via `window.devicePixelRatio` and a matching `ctx.setTransform`, so glyphs stay crisp on HiDPI screens; a `ResizeObserver` on the canvas re-runs the resize/init logic (which also resets column positions) whenever its box size changes.
- The render loop is a single `requestAnimationFrame` chain started in a `$effect` and torn down (canceled, observer disconnected) in its cleanup — there's no visibility-based pausing, so it keeps painting while off-screen or the tab is backgrounded.
- No `prefers-reduced-motion` handling — the rain animates continuously regardless of user preference.
