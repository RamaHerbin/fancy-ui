# ImageGeneration

A fixed frame that holds its place while a model draws: an empty outline, then a pixel grid working over a drifting dot field, then the finished image easing out of a blur.

The four states share one aspect-ratio box, so the frame is the same size before the request goes out as it is after the image lands. Nothing below it moves.

## Usage

```svelte
<script lang="ts">
	import { ImageGeneration } from "fancy-ui-svelte";

	let status = $state<"idle" | "generating" | "done" | "error">("idle");
	let src = $state<string | null>(null);
	const prompt = "a lone barn under a sodium sunset, 35mm, grain";

	async function generate() {
		status = "generating";
		try {
			src = await requestImage(prompt);
			status = "done";
		} catch {
			status = "error";
		}
	}
</script>

<ImageGeneration {status} {src} alt={prompt} {prompt} onRetry={generate} />
```

```svelte
<!-- A wide frame, no caption -->
<ImageGeneration status="done" src={url} alt="A red barn at dusk" aspectRatio="16 / 9" />
```

```svelte
<!-- Failure with its own copy -->
<ImageGeneration
	status="error"
	alt="a rain-slicked alley at night"
	errorText="The model returned no image"
	onRetry={generate}
/>
```

## Props

| Prop          | Type                                          | Default               | Description                                                            |
| ------------- | --------------------------------------------- | --------------------- | ---------------------------------------------------------------------- |
| `status`      | `"idle" \| "generating" \| "done" \| "error"` | —                     | Which stage of the generation to render (required)                     |
| `src`         | `string \| null`                              | —                     | The generated image, shown once `status` is `"done"`                   |
| `alt`         | `string`                                      | —                     | Describes the image to assistive tech, typically the prompt (required) |
| `aspectRatio` | `string`                                      | `"1 / 1"`             | CSS aspect-ratio of the frame, holding the layout across every state   |
| `prompt`      | `string`                                      | —                     | Muted caption line under the frame                                     |
| `errorText`   | `string`                                      | `"Generation failed"` | The failure line shown in the error state                              |
| `onRetry`     | `() => void`                                  | —                     | Pressing retry calls this; the retry button only exists when it is set |
| `onLoad`      | `() => void`                                  | —                     | Called once the generated image has finished loading                   |
| `class`       | `string`                                      | —                     | Additional CSS classes                                                 |
| `ref`         | `HTMLDivElement \| null` (bindable)           | `null`                | Bound reference to the root element                                    |
| `sound`       | `boolean`                                     | `false`               | Plays the `press` cue on retry, once the user has enabled sound        |

## Sound

Set `sound` to play the `press` cue on retry, through the shared sound controller (see [`sound/README.md`](../sound/README.md)):

```svelte
<ImageGeneration status="error" alt="A red barn" onRetry={regenerate} sound />
```

It is opt-in and silent by default: nothing plays unless both `sound` is set on the component **and** the user has turned sound on globally (through `SoundToggle` or `sound.enable()`). `handleLoad`/`handleError` and a `status` transition to `"done"` are outcomes the component observes, not a gesture it resolves — nothing plays for either, and the nested `PixelLoader` stays silent too.

## Theming

The frame's chrome is neutral by construction: the background and border mix `currentColor` into transparency, so they sit the same distance from whatever surface the component lands on without a light/dark pair to keep balanced. Override either directly:

| Variable                 | Default                                              | Controls                            |
| ------------------------ | ---------------------------------------------------- | ----------------------------------- |
| `--ft-imagegen-bg`       | `color-mix(in oklab, currentColor 4%, transparent)`  | Frame background                    |
| `--ft-imagegen-border`   | `color-mix(in oklab, currentColor 12%, transparent)` | Frame outline                       |
| `--ft-imagegen-dot`      | `color-mix(in oklab, currentColor 20%, transparent)` | Colour of the generating dots       |
| `--ft-imagegen-dot-size` | `12px`                                               | Pitch of the dot grid               |
| `--ft-imagegen-drift`    | `14s`                                                | Time for the dots to cross one tile |
| `--ft-imagegen-blur`     | `24px`                                               | Blur the image starts at            |
| `--ft-imagegen-reveal`   | `700ms`                                              | Time it takes to sharpen            |
| `--ft-imagegen-error-fg` | `var(--ft-status-error, …)`                          | Glyph, error line, retry button     |

```svelte
<div style="--ft-imagegen-dot-size: 18px; --ft-imagegen-reveal: 1200ms">
	<ImageGeneration status="generating" alt={prompt} />
</div>
```

The loader inside the generating state is `PixelLoader`, so `--ft-pixel-color` retints it; unset, it inherits the surrounding text colour.

Left unset, `--ft-imagegen-error-fg` falls through to `--ft-status-error`, the failure colour shared with `ChatError`, `ToolCall`, `ToolTimeline`, `TerminalBlock` and `CodeDiff`. Set that one instead and every failure surface moves together. Its default is a `light-dark()` pair — `oklch(0.5 0.19 25)` on light, `oklch(0.7 0.18 25)` on dark — so declare `color-scheme` on your theme for the right half to be picked.

## Implementation notes

- **Sharp on the server.** The blur is opt-in, not opt-out. `mounted` is false for the whole server render, so the markup that leaves the server carries no blur class at all — a page that never hydrates, or hydrates with JavaScript disabled, shows a finished image rather than a permanently smeared one. `onMount` arms the reveal, which is early enough to still catch the load event: the browser queues that as a separate task at the earliest.
- **Nothing already on screen gets blurred.** An image that is `complete` when `onMount` runs has settled its fate before this code existed, and neither `load` nor `error` is coming to settle it later — so being complete at mount is decisive on its own. With a real `naturalWidth` it is a decoded image the reader can already see: it stays sharp and `onLoad` fires, since the load event the caller would have heard fired too early. With a `naturalWidth` of `0` — a fetch that already failed, or an SVG sized only by its `viewBox` — it is revealed just the same, but without `onLoad`, because nothing was seen arriving. Either way the reveal is armed afterwards, and no image is ever left blurred waiting for an event that has already been and gone.
- **The reveal re-arms on a new `src`.** What is tracked is which URL finished loading, not a boolean. A second generation swapping `src` on the same `<img>` re-arms the blur on its own, with no effect to reset a flag, and `onLoad` fires once per image — a repeated load event for the same URL, from a re-decode or a cache revalidation, is not a second arrival.
- **A broken image is revealed, not left blurred.** An `error` on the `<img>` clears the blur without claiming the image loaded, so a failed URL shows the browser's own broken-image mark instead of waiting forever for a load that is not coming.
- **Reduced motion.** Both halves of the reveal — the blurred starting point and the transition out of it — live inside `@media (prefers-reduced-motion: no-preference)`, as does the dot drift. With those rules gone there is nothing to override and nothing to keep in sync: the image is simply sharp when it arrives, and the dot field is a static texture.
- **No layout shift.** Every state renders inside the same `aspect-ratio` box, absolutely positioned, so idle, generating, done and error all occupy identical space. The frame clips with `overflow: hidden`, which is also what keeps the blur from bleeding past its edges; the `scale(1.05)` covers the transparent fringe a blur otherwise pulls in from outside the image.
- **The dot field drifts on the compositor.** The layer is inset by two tiles so it overhangs the frame, and the animation translates it exactly one tile — a `transform`, not a `background-position`, and seamless because the pattern repeats at that interval.
- **`alt` is required.** It is the only way the generated image says anything to a reader who cannot see it, and the prompt is almost always the right text.
- **No state, no timers.** Which stage the generation is in is the caller's fact to hold, because only the caller knows when the request comes back.
