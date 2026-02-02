# ImageTrailCursor

Cursor-following image trail effect with 8 animation variants. Images appear at the cursor position as you move the mouse, each variant providing a distinct visual style.

## Source

- **Vue**: `vendor/inspira/ui/image-trail-cursor/`
- **Svelte**: `src/lib/inspira/image-trail-cursor/`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `images` | `string[]` | `[]` | Array of image URLs for the trail |
| `variant` | `VariantType` | `'type1'` | Animation variant (`type1` through `type8`) |
| `class` | `string` | `''` | Additional CSS classes for the container |

## Variants

| Variant | Description |
|---------|-------------|
| `type1` | Basic fade & scale trail |
| `type2` | Scale-up with brightness burst |
| `type3` | Float-up exit with random x drift |
| `type4` | Momentum-based drift with brightness/contrast |
| `type5` | Rotation + momentum fling |
| `type6` | Speed-reactive size, blur, grayscale |
| `type7` | Stacking trail with visible queue |
| `type8` | 3D perspective based on cursor position |

## Dependencies

- **GSAP** (`gsap`) — Required for animation timelines. First GSAP dependency in the project.

## Porting Notes

- Extracted a `BaseVariant` abstract class to eliminate ~800 lines of duplicated constructor/render/destroy boilerplate across the 8 variant classes.
- Added proper `destroy()` methods (missing in vendor): cancels RAF, removes event listeners, kills GSAP tweens, cleans up `ImageItem` resize listeners.
- Fixed `VariantType` to include `type8` (vendor TypeScript type stopped at `type7` but code had 8 variants).
- Properly typed `variantMap` as `Record<VariantType, ...>` instead of `{ [key: string]: any }`.
- The Svelte component resets inline styles before re-initializing on variant switch to prevent GSAP style residue.
