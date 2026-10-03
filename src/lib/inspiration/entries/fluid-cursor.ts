import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "fluid-cursor",
	slug: "fluid-cursor",
	origin: "fancyui",
	title: "Canvas — fluid smoke trail",
	summary: "A WebGL smoke trail whose splats follow the pointer's velocity.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/fluid-cursor",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["playful", "glow"],
	useCaseTags: ["marketing", "media"],
	codeAvailability: "open-source",
	analysis: {
		why: "Velocity, not position, drives each splat, so a fast flick throws a long plume and a slow drag leaves a soft wisp. Dye and velocity dissipate at different rates, which is what makes the trail curl before it fades.",
		whenToUse: "A playful hero or a portfolio splash where the cursor is the toy.",
		watch:
			"A WebGL simulation on window-level mouse and touch listeners. It does not honour reduced motion on its own, and it is a singleton by default — one per page. Blank until the pointer moves.",
		clues: [
			"WebGL fluid sim",
			"splat force from pointer velocity",
			"dye dissipation",
			"pause when hidden",
		],
	},
	curatedRank: 22,
	collections: ["glass-and-glow"],
	components: [{ slug: "fluid-cursor", relation: "exact" }],
	demo: {
		module: "fluid-cursor",
		knobs: [
			{
				key: "splatRadius",
				type: "range",
				label: "Splat radius",
				min: 0.05,
				max: 0.6,
				step: 0.05,
			},
			{ key: "curl", type: "range", label: "Curl", min: 0, max: 30, step: 1 },
			{
				key: "colorIntensity",
				type: "range",
				label: "Intensity",
				min: 0.05,
				max: 0.6,
				step: 0.05,
			},
		],
		defaults: { splatRadius: 0.2, curl: 3, colorIntensity: 0.15 },
		mount: "intent",
	},
	capture: { sweep: true, delay: 1800 },
};

export default entry;
