import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "reveal-stagger",
	slug: "reveal-stagger",
	origin: "fancyui",
	title: "Cards — staggered reveal",
	summary: "Cards land one after another as they scroll in, in reading order.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/reveal",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["scroll"],
	styleTags: ["minimal", "editorial"],
	useCaseTags: ["marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "A stagger ladder gives the grid a reading order: the last card lands as the eye reaches it. The origin can be first, centre or last.",
		whenToUse: "Feature grids and lists entering the viewport for the first time.",
		watch:
			"Everything shows at once under reduced motion. Keep the ladder short — long staggers delay reading. Hidden-until-visible content can be missed by tools that never scroll.",
		clues: ["IntersectionObserver", "stagger ladder", "from first / centre / last"],
	},
	curatedRank: 30,
	collections: ["micro-interactions"],
	components: [{ slug: "reveal", relation: "exact" }],
	demo: {
		module: "reveal-stagger",
		knobs: [
			{
				key: "preset",
				type: "select",
				label: "Preset",
				options: [
					{ value: "fade", label: "fade" },
					{ value: "fade-up", label: "fade-up" },
					{ value: "fade-down", label: "fade-down" },
					{ value: "fade-left", label: "fade-left" },
					{ value: "fade-right", label: "fade-right" },
					{ value: "scale", label: "scale" },
				],
			},
			{ key: "stagger", type: "range", label: "Stagger", min: 0, max: 200, step: 10 },
			{ key: "distance", type: "range", label: "Distance", min: 0, max: 60, step: 4 },
		],
		defaults: { preset: "fade-up", stagger: 60, distance: 16 },
	},
};

export default entry;
