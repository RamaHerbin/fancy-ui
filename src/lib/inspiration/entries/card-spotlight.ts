import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "card-spotlight",
	slug: "card-spotlight",
	origin: "fancyui",
	title: "Card — cursor spotlight",
	summary: "The cursor becomes the light source, so the card reads as lit, not highlighted.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/card-spotlight",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["glow", "minimal"],
	useCaseTags: ["marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "A radial gradient is centred on the pointer inside the card, so the surface brightens where the light would fall rather than changing colour as a whole. On leave the light is parked far off-card and the card goes back to plain.",
		whenToUse:
			"Feature grids and pricing cards on pointer devices, where a hover state should feel physical.",
		watch:
			"It listens to `mousemove` only — no touch or pen — so on phones it is a plain card. There is nothing to see at rest. The root carries an unnamed Tailwind `group`, so `group-hover:` inside the card fires on card hover.",
		clues: ["radial-gradient at pointer", "CSS vars from mousemove", "opacity ramp on enter"],
	},
	curatedRank: 8,
	collections: ["glass-and-glow"],
	components: [{ slug: "card-spotlight", relation: "exact" }],
	demo: {
		module: "card-spotlight",
		knobs: [
			{ key: "gradientSize", type: "range", label: "Size", min: 80, max: 500, step: 10 },
			{ key: "gradientColor", type: "color", label: "Colour" },
			{ key: "gradientOpacity", type: "range", label: "Opacity", min: 0, max: 1, step: 0.05 },
		],
		defaults: { gradientSize: 200, gradientColor: "#4b4b63", gradientOpacity: 0.8 },
	},
	capture: { hover: [0.42, 0.4], delay: 1200 },
};

export default entry;
