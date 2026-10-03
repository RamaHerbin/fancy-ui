import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "magnetic-button",
	slug: "magnetic-button",
	origin: "fancyui",
	title: "Button — magnetic pull",
	summary: "The button leans toward the cursor before contact, then springs home.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/magnetic",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["physical", "playful"],
	useCaseTags: ["marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "Inside a radius, the button translates toward the pointer in proportion to distance, capped at a maximum travel, and a spring brings it home on leave. The click target comes to meet the cursor, so the press feels already accepted.",
		whenToUse: "One primary call to action per view, on pointer devices.",
		watch:
			"Off on touch (`hover: none`) and under reduced motion. While near, it listens to window `pointermove`, so keep it to a handful per page. A moving target is harder to hit for some motor abilities — keep the travel small.",
		clues: [
			"pointer distance → translate",
			"radius gate",
			"spring return",
			"off under reduced motion",
		],
	},
	curatedRank: 16,
	collections: ["micro-interactions"],
	components: [{ slug: "magnetic", relation: "exact" }],
	demo: {
		module: "magnetic-button",
		knobs: [
			{ key: "strength", type: "range", label: "Strength", min: 0, max: 1, step: 0.05 },
			{ key: "radius", type: "range", label: "Radius", min: 0, max: 200, step: 10 },
			{ key: "max", type: "range", label: "Max travel", min: 0, max: 60, step: 2 },
		],
		defaults: { strength: 0.35, radius: 40, max: 24 },
	},
	capture: { hover: [0.68, 0.62] },
};

export default entry;
