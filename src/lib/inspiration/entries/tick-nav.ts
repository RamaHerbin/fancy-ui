import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "tick-nav",
	slug: "tick-nav",
	origin: "fancyui",
	title: "Nav — plucked ruler",
	summary:
		"A navigation list on a ruler of ticks: every line the pointer crosses plucks like a string.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/tick-nav",
	addedAt: "2026-10-25",
	verifiedAt: "2026-10-25",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["glow", "minimal", "hdr"],
	useCaseTags: ["navigation"],
	codeAvailability: "open-source",
	analysis: {
		why: "Each row is a one-pixel line, and every line the pointer crosses plucks: a short wave runs along it and leaves it flat. Crossings are found between pointer samples, so a fast sweep strums every line it passed, in order. Neighbouring lines and ticks stretch and take the accent on springs with a smooth falloff, and a preview card trails the pointer.",
		whenToUse:
			"A table of contents, a chapter list or a portfolio index where browsing the list should feel tactile.",
		watch:
			"Springs drive CSS variables from one rAF loop that sleeps once everything settles. Touch is ignored; keyboard focus lights the row and places the card beside it. Reduced motion snaps the springs and drops the pluck. The neon variant is made for dark surfaces, and its HDR light only starts on a display that reports HDR.",
		clues: [
			"crossings between pointer samples",
			"length + proximity springs",
			"CSS variables, no per-frame state",
			"28 px hit area on a 1 px row",
		],
	},
	curatedRank: 1,
	collections: ["micro-interactions", "glass-and-glow"],
	components: [{ slug: "tick-nav", relation: "exact" }],
	demo: {
		module: "tick-nav",
		knobs: [
			{
				key: "variant",
				type: "select",
				label: "Variant",
				options: [
					{ value: "neon", label: "neon" },
					{ value: "default", label: "default" },
				],
			},
			{ key: "reach", type: "range", label: "Reach", min: 1, max: 8, step: 1 },
			{ key: "minorTicks", type: "range", label: "Ticks", min: 0, max: 4, step: 1 },
			{ key: "hdr", type: "boolean", label: "HDR" },
		],
		defaults: { variant: "neon", reach: 4, minorTicks: 2, hdr: true },
	},
	capture: { hover: [0.38, 0.35], delay: 1200 },
};

export default entry;
