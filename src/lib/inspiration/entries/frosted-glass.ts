import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "frosted-glass",
	slug: "frosted-glass",
	origin: "fancyui",
	title: "Pane — frosted refraction",
	summary: "Noise bends the backdrop like textured glass, with a specular rim on the edge.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/frosted-glass",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["scroll"],
	styleTags: ["glass"],
	useCaseTags: ["navigation"],
	codeAvailability: "open-source",
	analysis: {
		why: "Turbulence noise distorts the backdrop unevenly instead of blurring it, so colour under the pane breaks into organic ripples like frosted glass. A specular highlight and a cool rim give the pane an edge.",
		whenToUse: "A floating label, toolbar or toast over colourful content.",
		watch:
			"Light-tinted only: the white tint has no dark branch. Safari drops the filter for a blur fallback. The settle fade is not gated by reduced motion.",
		clues: [
			"feTurbulence → displacement",
			"seeded noise",
			"specular rim + conic border",
			"Safari blur fallback",
		],
	},
	curatedRank: 17,
	collections: ["glass-and-glow"],
	components: [{ slug: "frosted-glass", relation: "exact" }],
	demo: {
		module: "frosted-glass",
		knobs: [{ key: "scale", type: "range", label: "Distortion", min: 0, max: 150, step: 5 }],
		defaults: { scale: 70 },
	},
	capture: { delay: 2000 },
};

export default entry;
