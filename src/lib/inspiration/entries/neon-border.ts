import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "neon-border",
	slug: "neon-border",
	origin: "fancyui",
	title: "Frame — neon beams",
	summary: "Two hues chase each other around a neon tube that flickers on, then hums.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/neon-border",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["ambient"],
	styleTags: ["glow", "retro"],
	useCaseTags: ["marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "Two beams with white cores circle a faint tube in opposite colours, so the frame reads as moving light while nothing inside moves. A single ignition flicker on mount, then a slow hum, sells the neon without looping a strobe.",
		whenToUse: "A badge, a call to action or a small banner that should glow on a dark page.",
		watch:
			"The default box is 40px tall; size it with `class`. All motion lives under `no-preference`, so reduced motion gets static beams. An always-on glow competes with content — one per view.",
		clues: ["conic-gradient rotation", "mask to border", "half / full animation"],
	},
	curatedRank: 6,
	collections: ["glass-and-glow"],
	components: [{ slug: "neon-border", relation: "exact" }],
	demo: {
		module: "neon-border",
		knobs: [
			{ key: "color1", type: "color", label: "Colour 1" },
			{ key: "color2", type: "color", label: "Colour 2" },
			{
				key: "animationType",
				type: "select",
				label: "Beams",
				options: [
					{ value: "half", label: "half" },
					{ value: "full", label: "full" },
					{ value: "none", label: "none" },
				],
			},
		],
		defaults: { color1: "#0496ff", color2: "#ff0a54", animationType: "half" },
	},
};

export default entry;
