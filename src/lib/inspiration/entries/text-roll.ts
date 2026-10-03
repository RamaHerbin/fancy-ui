import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "text-roll",
	slug: "text-roll",
	origin: "fancyui",
	title: "Price — digit roll",
	summary: "Only the digits that change roll; the rest of the price stays put.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/text-roll",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["type"],
	styleTags: ["minimal", "editorial"],
	useCaseTags: ["commerce", "data"],
	codeAvailability: "open-source",
	analysis: {
		why: "Graphemes that stay the same keep their node; only the diff rolls, up or down depending on the direction of the change. A price that goes from 19 to 29 moves one digit, so the reader sees exactly what changed.",
		whenToUse: "Prices, counters and stats that update while the visitor watches.",
		watch:
			"Assistive tech hears the final value through a live region, not every intermediate digit. Reduced motion swaps synchronously. Use tabular numerals or widths jump.",
		clues: ["keyed per grapheme", "inline-grid clip", "direction auto", "tabular-nums"],
	},
	curatedRank: 25,
	collections: ["micro-interactions"],
	components: [{ slug: "text-roll", relation: "exact" }],
	demo: {
		module: "text-roll",
		knobs: [
			{ key: "duration", type: "range", label: "Duration", min: 100, max: 1200, step: 50 },
			{ key: "stagger", type: "range", label: "Stagger", min: 0, max: 60, step: 5 },
			{
				key: "direction",
				type: "select",
				label: "Direction",
				options: [
					{ value: "auto", label: "auto" },
					{ value: "up", label: "up" },
					{ value: "down", label: "down" },
				],
			},
		],
		defaults: { duration: 300, stagger: 15, direction: "auto" },
	},
};

export default entry;
