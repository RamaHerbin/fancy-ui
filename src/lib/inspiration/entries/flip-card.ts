import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "flip-card",
	slug: "flip-card",
	origin: "fancyui",
	title: "Card — physical flip",
	summary: "A card that turns like an object: a highlight crosses the face mid-flip.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/flip-card",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["physical"],
	useCaseTags: ["marketing", "commerce"],
	codeAvailability: "open-source",
	analysis: {
		why: "A glare layer is keyed to the rotation angle, so a highlight sweeps the face as it turns — that is what sells the thickness. The side the pointer enters from sets the direction of the turn.",
		whenToUse:
			"Two-sided content where the back is a bonus: specs behind a product, an answer behind a question.",
		watch:
			'Hover mode hides the back from touch and keyboard users; use `trigger="click"` (an `aria-pressed` button) when the back carries content. The hidden face is inert. Reduced motion drops the turn.',
		clues: [
			"preserve-3d",
			"backface-visibility",
			"glare layer keyed to the angle",
			"enter side sets direction",
		],
	},
	curatedRank: 10,
	collections: ["micro-interactions"],
	components: [{ slug: "flip-card", relation: "exact" }],
	demo: {
		module: "flip-card",
		knobs: [
			{
				key: "rotate",
				type: "select",
				label: "Axis",
				options: [
					{ value: "y", label: "y" },
					{ value: "x", label: "x" },
				],
			},
			{
				key: "trigger",
				type: "select",
				label: "Trigger",
				options: [
					{ value: "hover", label: "hover" },
					{ value: "click", label: "click" },
				],
			},
			{ key: "glare", type: "boolean", label: "Glare" },
			{ key: "duration", type: "range", label: "Duration", min: 300, max: 1500, step: 50 },
		],
		defaults: { rotate: "y", trigger: "hover", glare: true, duration: 700 },
	},
	capture: { hover: [0.5, 0.5], delay: 1200 },
};

export default entry;
