import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "hover-button-roll",
	slug: "hover-button-roll",
	origin: "fancyui",
	title: "Button — label roll",
	summary: "Two labels swap on a vertical roll while a dot grows into the fill.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/interactive-hover-button",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["playful", "minimal"],
	useCaseTags: ["marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "One hover runs three coordinated moves: the label rolls up and blurs out, the second label rolls in, and a dot grows into the background fill. A single transition-delay ladder keeps them in step.",
		whenToUse: "A secondary call to action that should feel crafted on pointer devices.",
		watch:
			"On touch the second label is never seen, so the first must carry the meaning. The roll lives under `no-preference`.",
		clues: ["overflow clip", "translateY 70%", "blur on exit", "one transition-delay ladder"],
	},
	curatedRank: 19,
	collections: ["micro-interactions"],
	components: [{ slug: "interactive-hover-button", relation: "exact" }],
	demo: {
		module: "hover-button-roll",
		knobs: [{ key: "text", type: "text", label: "Label" }],
		defaults: { text: "Hover me" },
	},
	capture: { hover: [0.5, 0.5] },
};

export default entry;
