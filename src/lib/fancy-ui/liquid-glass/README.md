# LiquidGlass

A glass-like visual effect using SVG filters for chromatic displacement, creating a liquid glass refraction look. Uses `backdrop-filter` with an inline SVG displacement map.

## Props

| Prop             | Type          | Default        | Description                          |
| ---------------- | ------------- | -------------- | ------------------------------------ |
| `radius`         | `number`      | `16`           | Border radius in px                  |
| `border`         | `number`      | `0.07`         | Border thickness factor              |
| `lightness`      | `number`      | `50`           | HSL lightness of fill                |
| `displace`       | `number`      | —              | Gaussian blur std deviation          |
| `blend`          | `string`      | `"difference"` | SVG blend mode                       |
| `xChannel`       | `"R"\|"G"\|"B"` | `"R"`          | X displacement channel               |
| `yChannel`       | `"R"\|"G"\|"B"` | `"B"`          | Y displacement channel               |
| `alpha`          | `number`      | `0.93`         | Fill opacity                         |
| `blur`           | `number`      | `11`           | Inner blur                           |
| `rOffset`        | `number`      | `0`            | Red channel offset                   |
| `gOffset`        | `number`      | `10`           | Green channel offset                 |
| `bOffset`        | `number`      | `20`           | Blue channel offset                  |
| `scale`          | `number`      | `-180`         | Displacement scale                   |
| `frost`          | `number`      | `0.05`         | Frosted overlay opacity              |
| `fallbackBlur`   | `number`      | `20`           | Backdrop blur in pixels for the Safari fallback |
| `fallbackSaturation` | `number`  | `180`          | Backdrop saturation percentage for the Safari fallback |
| `class`          | `string`      | `""`           | CSS classes for inner container      |
| `containerClass` | `string`      | `""`           | CSS classes for outer container      |

## Usage

```svelte
<LiquidGlass containerClass="w-64 h-40">
  <div class="p-4 text-white">Glass content</div>
</LiquidGlass>
```

**Note**: This component uses `position: relative` and `backdrop-filter` with SVG filters. Place it over content to see the refraction effect.

## Browser support

Safari (WebKit) cannot resolve an SVG `url(#…)` filter reference inside `backdrop-filter`, so the chromatic displacement silently disappears there. To keep the component usable, LiquidGlass automatically detects Safari (via a WebKit-only `@supports` feature query) and falls back to a plain frosted `blur()` + `saturate()` (both `-webkit-` prefixed and unprefixed), tunable via the `fallbackBlur` and `fallbackSaturation` props. Chromium and Firefox get the full chromatic refraction.
