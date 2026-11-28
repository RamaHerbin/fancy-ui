# OpticalDisc

A disc that turns in space, drawn by a single WebGL fragment shader. One side carries a printed label; the other is a mirror with a diffraction grating, so every highlight opens into wedges of colour that slide across the surface as the disc turns. Drag it sideways to spin it by hand.

The canvas is transparent: the disc sits on whatever is behind it, and the clear hub lets it show through.

## Usage

```svelte
<script lang="ts">
	import { OpticalDisc } from "fancy-ui-svelte";
</script>

<OpticalDisc alt="A spinning disc" class="max-w-xs" />
```

```svelte
<!-- Your own artwork, held still and facing the viewer until it is dragged -->
<OpticalDisc label="/cover.png" alt="Album cover on a disc" spin={0} angle={0} />
```

The root is a square (`aspect-square w-full`). Size it with a width or `max-w-*` class.

## Props

| Prop          | Type      | Default     | Description                                                                    |
| ------------- | --------- | ----------- | ------------------------------------------------------------------------------ |
| `label`       | `string`  | —           | Image printed on the label side. Omit for the built-in blank label             |
| `alt`         | `string`  | —           | Accessible name. Without it the disc is decorative (`aria-hidden`)             |
| `spin`        | `number`  | `9`         | Seconds per full turn. `0` keeps it still; negative turns the other way        |
| `angle`       | `number`  | `-24`       | Starting angle in degrees. `0` faces the label to the viewer, `180` the mirror |
| `tilt`        | `number`  | `14`        | Lean of the spin axis toward the viewer, in degrees                            |
| `iridescence` | `number`  | `1`         | Strength of the diffraction colours. `0` leaves a plain mirror                 |
| `pitch`       | `number`  | `1600`      | Track pitch in nanometres. Smaller spreads the colours wider                   |
| `labelColor`  | `string`  | `"#f2f1ee"` | Label paper colour, `#rgb` or `#rrggbb`                                        |
| `tint`        | `string`  | `"#6f9ef0"` | Tint of the clear hub, `#rgb` or `#rrggbb`                                     |
| `interactive` | `boolean` | `true`      | Drag to turn the disc                                                          |
| `class`       | `string`  | `""`        | Additional CSS classes on the root                                             |

Every prop except `angle` is live: changing it repaints without rebuilding the engine. `angle` is read once, when the disc mounts.

## The label image

`label` is drawn on the square that encloses the disc, upright when `angle` is `0`; the hub and everything outside the circle are cut away, and transparent pixels let the paper colour through. The image is fetched with `crossOrigin="anonymous"`: a file from another origin needs CORS headers, otherwise the built-in label stays.

## Reduced motion

With `prefers-reduced-motion: reduce` the disc does not spin on its own and does not coast after a drag; it rests at `angle`. Dragging still turns it, since that motion is the reader's own. The preference is read live.

## Implementation notes

- No geometry: each pixel casts a ray at a slab of radius 1 and reads the face, the rim, the clear hub or nothing. The silhouette is analytic, and four rotated-grid taps per pixel are the antialiasing.
- The grating is the physical one, reduced to what shows. Tracks are concentric, so the surface is periodic along the radius; for a light direction `L` and a view direction `V` the path difference between neighbouring tracks is `pitch × dot(L + V, radial)`. The shader sums the first five orders of that difference through a wavelength-to-colour curve, for three fixed lights, and fades each fan away from the plane across the tracks. `pitch` is therefore a real quantity: 1600 nm is a disc of the first generation, 740 nm the denser one that followed, which is why the latter throws wider colours.
- The mirror reflects a small procedural room (dark floor, bright overhead band, one soft window) instead of an environment map, so there is nothing to download.
- The loop sleeps whenever the next frame would be identical: still disc, no drag, coast and lean settled. It also stops off screen and in a hidden tab. A prop change or a resize repaints once.
- Device pixel ratio is capped at 2.
- Without WebGL, on the server and before the first frame, a flat CSS disc in the label colour is shown instead.
- A lost WebGL context stops the loop; the disc is not rebuilt when the context comes back.
