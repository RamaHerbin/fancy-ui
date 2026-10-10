import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "tabs-indicator",
	slug: "tabs-indicator",
	origin: "fancyui",
	title: "Tabs — sliding indicator",
	summary: "The indicator slides to the chosen tab instead of blinking.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/tabs",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["select"],
	styleTags: ["minimal"],
	useCaseTags: ["navigation"],
	codeAvailability: "open-source",
	analysis: {
		why: "A single shared indicator moves to the measured rect of the active trigger, so the eye follows the choice instead of re-scanning the row.",
		whenToUse: "Two to six peer views of the same object.",
		watch:
			"Full tablist / tab / tabpanel roles with roving focus. Manual activation suits panels that are expensive to render. The slide lives under `no-preference`.",
		clues: ["measured trigger rect", "transform on a shared indicator", "roving tabindex"],
	},
	curatedRank: 26,
	collections: ["micro-interactions"],
	components: [{ slug: "tabs", relation: "exact" }],
	demo: {
		module: "tabs-indicator",
		knobs: [
			{
				key: "variant",
				type: "select",
				label: "Variant",
				options: [
					{ value: "underline", label: "underline" },
					{ value: "segmented", label: "segmented" },
				],
			},
			{
				key: "activation",
				type: "select",
				label: "Activation",
				options: [
					{ value: "automatic", label: "automatic" },
					{ value: "manual", label: "manual" },
				],
			},
		],
		defaults: { variant: "underline", activation: "automatic" },
	},
};

export default entry;
