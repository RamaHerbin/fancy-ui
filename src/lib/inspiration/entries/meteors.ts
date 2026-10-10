import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "meteors",
	slug: "meteors",
	origin: "fancyui",
	title: "Backdrop — meteor shower",
	summary: "A seeded meteor shower with depth, already under way on first paint.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/meteors",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["ambient"],
	styleTags: ["glow", "playful"],
	useCaseTags: ["marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "Each meteor's delay, scale and speed come from a seeded generator, so the same seed draws the same shower on the server and in the browser. Farther meteors are smaller and slower, which gives a flat backdrop parallax depth; negative delays mean the shower is mid-flight on first paint.",
		whenToUse: "A hero or an empty state that needs atmosphere without imagery.",
		watch:
			"It renders bare spans: the parent must be `relative overflow-hidden`. Reduced motion freezes the meteors part-way along their paths. Check text contrast over the brightest streaks.",
		clues: ["seeded PRNG", "per-meteor delay / scale", "angle", "depth → speed"],
	},
	curatedRank: 7,
	collections: ["glass-and-glow"],
	components: [{ slug: "meteors", relation: "exact" }],
	demo: {
		module: "meteors",
		knobs: [
			{ key: "count", type: "range", label: "Count", min: 5, max: 40, step: 1 },
			{ key: "angle", type: "range", label: "Angle", min: 180, max: 270, step: 5 },
			{ key: "speed", type: "range", label: "Speed", min: 0.5, max: 2, step: 0.1 },
		],
		defaults: { count: 20, angle: 215, speed: 1 },
	},
};

export default entry;
