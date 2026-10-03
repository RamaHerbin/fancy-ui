import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "border-beam",
	slug: "border-beam",
	origin: "fancyui",
	title: "Card — comet border beam",
	summary: "A white-hot comet laps the card edge, trailing a feathered two-colour tail.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/border-beam",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["ambient"],
	styleTags: ["glow", "minimal"],
	useCaseTags: ["feedback", "marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "The head travels the real border box, so it hugs any radius, and the tail fades over a quarter of the perimeter while a faint spill lights the inside edge. The rail under it stays dim, which makes the beam the only moving thing on the card.",
		whenToUse:
			"Work in progress on one card — a deploy, a generation, a sync — or one feature tile that should catch the eye.",
		watch:
			"Pure CSS. Reduced motion parks the head at `anchor` with the tail laid out. It must be the last child of a positioned, overflow-hidden parent; set `--border-beam-radius` when the radius cannot be read.",
		clues: [
			"offset-path: border-box",
			"container-type: size",
			"tail as a trailing gradient",
			"anchor = % of the perimeter",
		],
	},
	curatedRank: 4,
	collections: ["glass-and-glow"],
	components: [{ slug: "border-beam", relation: "exact" }],
	demo: {
		module: "border-beam",
		knobs: [
			{ key: "colorFrom", type: "color", label: "From" },
			{ key: "colorTo", type: "color", label: "To" },
			{ key: "tail", type: "range", label: "Tail", min: 0.05, max: 0.8, step: 0.05 },
		],
		defaults: { colorFrom: "#8ec5ff", colorTo: "#c084fc", tail: 0.25 },
	},
	capture: { delay: 2600 },
};

export default entry;
