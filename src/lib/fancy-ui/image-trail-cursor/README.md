# ImageTrailCursor

Cursor-following image trail effect with 9 animation variants. Images appear at the cursor position as you move the mouse, each variant providing a distinct visual style.

## Props

| Prop      | Type          | Default   | Description                                                 |
| --------- | ------------- | --------- | ----------------------------------------------------------- |
| `images`  | `string[]`    | `[]`      | Array of image URLs for the trail                           |
| `variant` | `VariantType` | `'type1'` | Animation variant (`type1` through `type8`, or `pixelated`) |
| `class`   | `string`      | `''`      | Additional CSS classes for the container                    |

## Variants

| Variant     | Description                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `type1`     | Basic fade & scale trail                                                                                                 |
| `type2`     | Scale-up with brightness burst                                                                                           |
| `type3`     | Float-up exit with random x drift                                                                                        |
| `type4`     | Momentum-based drift with brightness/contrast                                                                            |
| `type5`     | Rotation + momentum fling                                                                                                |
| `type6`     | Speed-reactive size, blur, grayscale                                                                                     |
| `type7`     | Stacking trail with visible queue                                                                                        |
| `type8`     | 3D perspective based on cursor position                                                                                  |
| `pixelated` | Hard pop-in/pop-out (no easing tails), `image-rendering: pixelated`, 2px `#191308` border — for hard-edge art directions |

## Dependencies

- **GSAP** (`gsap`) — Required for animation timelines. First GSAP dependency in the project.

## Implementation Notes

- Extracted a `BaseVariant` abstract class to eliminate ~800 lines of duplicated constructor/render/destroy boilerplate across the variant classes.
- Added proper `destroy()` methods (missing in vendor): cancels RAF, removes event listeners, kills GSAP tweens, cleans up `ImageItem` resize listeners.
- Fixed `VariantType` to include `type8` (vendor TypeScript type stopped at `type7` but code had 8 variants).
- Properly typed `variantMap` as `Record<VariantType, ...>` instead of `{ [key: string]: any }`.
- The Svelte component resets inline styles before re-initializing on variant switch to prevent GSAP style residue — this also clears `pixelated`'s inline border/`image-rendering` when switching away from it.
- `pixelated` uses `gsap.timeline().set(...)` calls (duration 0) instead of `.to()`/`.fromTo()` tweens, so there is no easing curve on either the pop-in or the pop-out; the two `.set()` calls are positioned `HOLD` seconds apart on the timeline to create the hold before the hard snap-out. The border and `image-rendering: pixelated` are applied once, directly on `img.DOM.el`, in the variant's constructor — they are static styling, not animated properties.
