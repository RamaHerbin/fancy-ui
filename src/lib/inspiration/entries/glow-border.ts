import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "glow-border",
	slug: "glow-border",
	origin: "fancyui",
	title: "Card — liquid-metal edge",
	summary: "A polished metal ring that keeps flowing around a card, in chromatic, silver or gold.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/glow-border",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["ambient"],
	styleTags: ["glow", "iridescent"],
	useCaseTags: ["marketing", "commerce"],
	codeAvailability: "open-source",
	analysis: {
		why: "Two conic fields drift at different rates under a glint that laps the border, so the edge looks like polished metal catching light rather than a lit stroke. Neutral body and shadow are woven into the tint, which keeps even the chromatic preset from reading as a rainbow.",
		whenToUse:
			"One surface that should feel premium: the featured pricing tier, a selected plan, a hero card.",
		watch:
			"Pure CSS (registered custom properties), no listeners. Reduced motion stops the fields and parks the glint. It is an overlay with no children: the parent must be positioned and rounded.",
		clues: [
			"@property angles per field",
			"two conic fields + a glint lap",
			"mask to the border ring",
			"presets: chromatic / silver / gold",
		],
	},
	curatedRank: 2,
	collections: ["glass-and-glow"],
	components: [{ slug: "glow-border", relation: "exact" }],
	demo: {
		module: "glow-border",
		knobs: [
			{
				key: "preset",
				type: "select",
				label: "Preset",
				options: [
					{ value: "chromatic", label: "chromatic" },
					{ value: "silver", label: "silver" },
					{ value: "gold", label: "gold" },
				],
			},
			{ key: "strength", type: "range", label: "Strength", min: 0, max: 1, step: 0.05 },
		],
		defaults: { preset: "chromatic", strength: 0.8 },
	},
};

export default entry;
