import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "liquid-text",
	slug: "liquid-text",
	origin: "fancyui",
	title: "Text — liquid warp",
	summary: "Glyphs warp under the cursor with a chromatic split along the push.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/liquid-text",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["playful", "editorial"],
	useCaseTags: ["marketing", "media"],
	codeAvailability: "open-source",
	analysis: {
		why: "A fluid velocity field displaces the text's UVs and the colour channels separate along that vector, so the split shows which way the glyphs were pushed.",
		whenToUse: "A single display headline that is meant to be played with.",
		watch:
			"WebGL on a window-level pointer listener, with a static fallback under reduced motion and below a width. The canvas is decorative; keep the real text in the DOM for assistive tech.",
		clues: ["fluid velocity field", "UV displacement", "chromatic ratio", "static below a width"],
	},
	curatedRank: 33,
	components: [{ slug: "liquid-text", relation: "exact" }],
	demo: {
		module: "liquid-text",
		knobs: [
			{ key: "strength", type: "range", label: "Strength", min: 0, max: 1, step: 0.05 },
			{ key: "radius", type: "range", label: "Radius", min: 40, max: 400, step: 10 },
			{ key: "chromaticRatio", type: "range", label: "Chromatic", min: 0, max: 1, step: 0.05 },
		],
		defaults: { strength: 0.5, radius: 160, chromaticRatio: 0.2 },
		mount: "intent",
	},
	capture: { delay: 2200 },
};

export default entry;
