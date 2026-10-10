import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "compare-drag",
	slug: "compare-drag",
	origin: "fancyui",
	title: "Compare — drag the seam",
	summary: "A before/after seam that is a blade of light, trailing a streak when you move it fast.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/compare",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["drag", "hover"],
	styleTags: ["glow", "minimal"],
	useCaseTags: ["media", "marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "Only the seam moves; both images stay anchored, so the comparison is about the difference, not the motion. The seam is drawn as light and leaves a velocity trail, which makes a quick drag feel weighted.",
		whenToUse: "Before/after comparisons: a retouch, a redesign, a filter.",
		watch:
			'The root is a real `role="slider"` with keyboard steps. The default size is a fixed 400×400 — override it with `class`. Autoplay is not gated by reduced motion and keeps running off-screen.',
		clues: ["clip-path inset", "pointer capture", "hover vs drag mode", "beam trail from velocity"],
	},
	curatedRank: 9,
	collections: ["glass-and-glow"],
	components: [{ slug: "compare", relation: "exact" }],
	demo: {
		module: "compare-drag",
		knobs: [
			{
				key: "slideMode",
				type: "select",
				label: "Mode",
				options: [
					{ value: "drag", label: "drag" },
					{ value: "hover", label: "hover" },
				],
			},
			{
				key: "initialSliderPercentage",
				type: "range",
				label: "Start",
				min: 0,
				max: 100,
				step: 5,
			},
		],
		defaults: { slideMode: "drag", initialSliderPercentage: 50 },
	},
	capture: { hover: [0.62, 0.5] },
};

export default entry;
