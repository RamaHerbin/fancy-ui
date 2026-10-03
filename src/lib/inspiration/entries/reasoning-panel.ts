import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "reasoning-panel",
	slug: "reasoning-panel",
	origin: "fancyui",
	title: "Reasoning — stream, then fold",
	summary: "The trace streams with a live timer, then folds itself into a one-line summary.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/reasoning-panel",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["ambient"],
	styleTags: ["minimal"],
	useCaseTags: ["ai"],
	codeAvailability: "open-source",
	analysis: {
		why: "While the model thinks, its trace streams into a scrolling panel with a shimmering header and a live timer. When it finishes, the panel folds itself into a one-line summary — the reasoning is visible while it matters and out of the way after.",
		whenToUse: "Reasoning or tool traces that some readers want and most skim past.",
		watch:
			"The header is a real button with `aria-expanded`. Once the reader opens or closes it, it stays where they left it. Motion lives under `no-preference`.",
		clues: [
			"auto-open while streaming",
			"auto-collapse 600ms after the end",
			"autoscroll follows the stream",
			"timer from `since`",
		],
	},
	curatedRank: 20,
	collections: ["ai-interfaces"],
	components: [{ slug: "reasoning-panel", relation: "exact" }],
	demo: {
		module: "reasoning-panel",
		knobs: [{ key: "label", type: "text", label: "Header" }],
		defaults: { label: "Reasoning" },
	},
	capture: { delay: 1500 },
};

export default entry;
