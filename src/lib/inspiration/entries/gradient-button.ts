import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "gradient-button",
	slug: "gradient-button",
	origin: "fancyui",
	title: "Button — lapping gradient beam",
	summary: "A multi-hue beam laps a dark button and lights its face from the edge.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/gradient-button",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["ambient"],
	styleTags: ["glow", "iridescent"],
	useCaseTags: ["marketing", "ai"],
	codeAvailability: "open-source",
	analysis: {
		why: "A conic beam runs around the border and a blurred copy spills inward, so the face looks lit by its own edge rather than outlined. The colours are an array, so the beam can carry a brand ramp instead of a single hue.",
		whenToUse: "One generate, upgrade or launch action on a dark surface.",
		watch:
			"Always a dark button — there is no light-theme branch. Reduced motion stops the beam at a fixed angle. Its `--gb-*` variables inherit into the label.",
		clues: [
			"@property --gb-angle",
			"conic beam masked to the border",
			"blurred inner glow",
			"colors[] → gradient stops",
		],
	},
	curatedRank: 5,
	collections: ["glass-and-glow"],
	components: [{ slug: "gradient-button", relation: "exact" }],
	demo: {
		module: "gradient-button",
		knobs: [
			{ key: "duration", type: "range", label: "Lap (ms)", min: 1000, max: 6000, step: 250 },
			{ key: "blur", type: "range", label: "Glow", min: 0, max: 12, step: 1 },
		],
		defaults: { duration: 3000, blur: 4 },
	},
	capture: { hover: [0.52, 0.5], delay: 1400 },
};

export default entry;
