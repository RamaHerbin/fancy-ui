/**
 * Per-slug capture tweaks for demos that need a nudge to look like themselves.
 * Shared by scripts/build-component-thumbs.mjs and the preview-health sweep.
 *   delay  -- ms to wait after mount (entrance animations, streaming text)
 *   hover  -- [x, y] as fractions of the stage; the pointer rests there
 *   sweep  -- drag the pointer across the stage right before the capture
 *   stage  -- which [data-thumb-stage] to capture (0 = hero, 1+ = examples),
 *             for bare effects whose hero preview has nothing to decorate
 *   skip   -- leave the slug to the fallback tile (manifest entry `false`)
 */
export const THUMB_HINTS = {
	"image-trail-cursor": { sweep: true },
	"smooth-cursor": { hover: [0.5, 0.5] },
	"direction-aware-hover": { hover: [0.5, 0.5] },
	"card-spotlight": { hover: [0.4, 0.4] },
	"glare-card": { hover: [0.35, 0.35] },
	// Pointer-driven demos that are empty until the pointer moves over them.
	"displacement-text": { hover: [0.5, 0.5] },
	// Captured with a sweep, the fluid simulation draws nothing headless (no GPU):
	// the frame is just the card, so keep the fallback tile instead.
	"fluid-cursor": { skip: true },
	// Tried hero and example stages with a hover: the rings never rise above the
	// blank-frame threshold in a still capture.
	ripple: { skip: true },
	"flickering-grid": { stage: 1 },
	"bg-falling-stars": { stage: 1 },
	"border-beam": { stage: 1 },
	"glowing-effect": { stage: 1, hover: [0.4, 0.45] },
	marquee: { stage: 1 },
	"text-generate-effect": { delay: 3000 },
	"number-ticker": { delay: 2500 },
};
