import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "slider-drag",
	slug: "slider-drag",
	origin: "fancyui",
	title: "Slider — live readout",
	summary: "The fill and the readout move as one while you drag.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/slider",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["drag"],
	styleTags: ["minimal"],
	useCaseTags: ["forms"],
	codeAvailability: "open-source",
	analysis: {
		why: "The fill is a CSS variable written from the same value as the number, so the bar and the readout can never disagree, even mid-drag.",
		whenToUse: "Any numeric setting where the exact value matters.",
		watch:
			"A native range input underneath, so keyboard and screen readers work out of the box. The tick sound is opt-in and silent until the visitor enables sound.",
		clues: ["native range", "CSS var fill", "tabular value", "sound tick"],
	},
	curatedRank: 31,
	collections: ["micro-interactions"],
	components: [{ slug: "slider", relation: "exact" }],
	demo: {
		module: "slider-drag",
		knobs: [
			{
				key: "step",
				type: "select",
				label: "Step",
				options: [
					{ value: "1", label: "1" },
					{ value: "5", label: "5" },
					{ value: "10", label: "10" },
				],
			},
			{ key: "showValue", type: "boolean", label: "Show value" },
			{ key: "sound", type: "boolean", label: "Sound" },
		],
		defaults: { step: "5", showValue: true, sound: false },
	},
};

export default entry;
