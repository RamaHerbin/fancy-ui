import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "status-morph",
	slug: "status-morph",
	origin: "fancyui",
	title: "Button — status morph",
	summary: "One icon path morphs from loading to success or error, in place.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/status-morph",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["press"],
	styleTags: ["minimal"],
	useCaseTags: ["forms", "feedback"],
	codeAvailability: "open-source",
	analysis: {
		why: "A single SVG path carries loading, success and error, so the eye never has to find a new icon — the spinner becomes the check. A timer brings it back to idle.",
		whenToUse: "Save, submit and copy buttons whose result arrives in under a few seconds.",
		watch:
			'The status is announced through a polite `role="status"`. Guard against a second press while a request is in flight. The morph lives under `no-preference`.',
		clues: ["single path morph", "stroke-dasharray", "reset timer", "tone current / semantic"],
	},
	curatedRank: 23,
	collections: ["micro-interactions"],
	components: [{ slug: "status-morph", relation: "exact" }],
	demo: {
		module: "status-morph",
		knobs: [
			{
				key: "resetAfter",
				type: "range",
				label: "Reset after",
				min: 500,
				max: 4000,
				step: 100,
			},
			{
				key: "tone",
				type: "select",
				label: "Tone",
				options: [
					{ value: "current", label: "current" },
					{ value: "semantic", label: "semantic" },
				],
			},
		],
		defaults: { resetAfter: 1800, tone: "current" },
	},
};

export default entry;
