# FrostedGlass

Frosted glass surface with an organic, wavy refraction of the content behind it. An alternative to [LiquidGlass](../liquid-glass/README.md): where LiquidGlass produces chromatic (rainbow-edge) refraction from gradient displacement maps, FrostedGlass distorts the backdrop with fractal turbulence noise for a softer, rippled-glass look — the effect used by glassy pill navbars.

## How it works

The effect stacks four layers inside a rounded container:

1. **Filter layer** — `backdrop-filter: blur(0)` pulls the backdrop into the element's own rendering, then a CSS `filter: url(#...)` pointing at an inline SVG filter distorts it: `feTurbulence` (fractal noise) → `feGaussianBlur` → `feDisplacementMap`.
2. **Overlay** — translucent tint (`tint` prop).
3. **Specular** — inset highlights simulating a lit glass rim (`highlight` prop).
4. **Content** — your slotted content.

An optional conic-gradient border (`border` prop) frames the container.

## Usage

```svelte
<script>
	import { FrostedGlass } from "fancy-ui-svelte";
</script>

<FrostedGlass radius={9999}>
	<nav class="flex w-full items-center justify-between px-7 py-4">
		<span class="font-semibold">Brand</span>
		<a href="/download">Download</a>
	</nav>
</FrostedGlass>
```

## Props

| Prop                 | Type      | Default                     | Description                                       |
| -------------------- | --------- | --------------------------- | ------------------------------------------------- |
| `radius`             | `number`  | `24`                        | Border radius in pixels                           |
| `baseFrequency`      | `number`  | `0.008`                     | Turbulence noise frequency (lower = wider waves)  |
| `numOctaves`         | `number`  | `2`                         | Turbulence octaves (detail of the noise)          |
| `seed`               | `number`  | `92`                        | Turbulence random seed                            |
| `noiseBlur`          | `number`  | `2`                         | Gaussian blur softening the noise before displace |
| `scale`              | `number`  | `70`                        | Displacement intensity                            |
| `tint`               | `string`  | `"hsla(0, 0%, 100%, 0.25)"` | Overlay tint color                                |
| `highlight`          | `string`  | `"hsla(0, 0%, 100%, 0.75)"` | Specular rim highlight color                      |
| `border`             | `boolean` | `true`                      | Show the conic-gradient glass border              |
| `fallbackBlur`       | `number`  | `20`                        | Backdrop blur (px) for the Safari fallback        |
| `fallbackSaturation` | `number`  | `180`                       | Backdrop saturation (%) for the Safari fallback   |
| `class`              | `string`  | `""`                        | CSS classes for the content layer                 |
| `containerClass`     | `string`  | `""`                        | CSS classes for the outer container               |

## Slots

| Slot       | Description                          |
| ---------- | ------------------------------------ |
| `children` | Content rendered on top of the glass |

## Notes

- The displacement only shows over content that scrolls or moves behind the glass; over a flat background the effect reads as a subtle frost.

## Browser support

Safari (WebKit) cannot combine an SVG `filter: url(#…)` with `backdrop-filter`, so the turbulence displacement silently disappears there. To keep the component usable, FrostedGlass automatically detects Safari (via an `@supports (-webkit-hyphens: none)` feature query) and falls back to a plain frosted `blur()` + `saturate()`, tunable via the `fallbackBlur` and `fallbackSaturation` props. Chromium and Firefox get the full turbulence refraction.
