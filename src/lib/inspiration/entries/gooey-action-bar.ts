import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "gooey-action-bar",
	slug: "gooey-action-bar",
	origin: "fancyui",
	title: "Action bar — gooey merge (prototype)",
	summary: "A highlight that fuses with its neighbours like liquid as it travels along the bar.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl:
		"https://github.com/RamaHerbin/fancy-ui/blob/develop/src/lib/inspiration/demos/gooey-action-bar.svelte",
	addedAt: "2026-10-21",
	verifiedAt: "2026-10-21",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["playful", "physical"],
	useCaseTags: ["navigation", "feedback"],
	codeAvailability: "open-source",
	analysis: {
		why: "Two sibling layers: a decorative one is blurred and alpha-thresholded so touching shapes fuse into one liquid body, and a sharp one on top holds the real buttons, labels and focus rings. Neighbours lean toward the hovered action with a 40 ms stagger per step.",
		whenToUse:
			"A short toolbar of three to six actions where a playful, physical feel is part of the brand. This is a prototype: its cost is being measured before it becomes a component.",
		watch:
			"The filter re-rasterizes the decorative layer on every frame it moves, so keep the layer small and never put text under it. Reduced motion and touch pointers snap instead of travelling.",
		clues: [
			"blur then alpha threshold",
			"decorative layer apart from the buttons",
			"staggered lean",
			"snap under reduced motion",
		],
	},
	curatedRank: 42,
	components: [
		{
			slug: "button",
			relation: "related",
			note: "The sharp layer is plain buttons; only the decorative blobs behind them are gooey.",
		},
	],
	demo: {
		module: "gooey-action-bar",
		knobs: [
			{ key: "blur", type: "range", label: "Blur", min: 4, max: 12, step: 1 },
			{ key: "lean", type: "range", label: "Lean", min: 0, max: 20, step: 1 },
		],
		defaults: { blur: 8, lean: 10 },
	},
	capture: { hover: [0.4, 0.42] },
};

export default entry;
