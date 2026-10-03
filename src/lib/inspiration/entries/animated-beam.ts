import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "animated-beam",
	slug: "animated-beam",
	origin: "fancyui",
	title: "Diagram — fibre-optic beam",
	summary: "Light packets travel a glass fibre between two nodes and bloom on arrival.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/animated-beam",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["ambient"],
	styleTags: ["glow"],
	useCaseTags: ["ai", "data", "marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "Packets with a white-hot head and a dispersing chromatic tail run along a curved fibre, then bloom where they land, so the diagram shows direction and flow rather than a static connection.",
		whenToUse: "Integration diagrams, data pipelines, agent wiring on a product page.",
		watch:
			"The container and both node refs must exist, so nothing draws during SSR or before mount. Reduced motion swaps in a still gradient path. A ResizeObserver recomputes the curve.",
		clues: [
			"SVG path between measured rects",
			"curvature offsets the control point",
			"dash-driven packets",
			"duration derived from a seed",
		],
	},
	curatedRank: 13,
	collections: ["glass-and-glow"],
	components: [{ slug: "animated-beam", relation: "exact" }],
	demo: {
		module: "animated-beam",
		knobs: [
			{ key: "pulses", type: "range", label: "Packets", min: 1, max: 6, step: 1 },
			{ key: "curvature", type: "range", label: "Curve", min: -120, max: 120, step: 10 },
		],
		defaults: { pulses: 2, curvature: -60 },
	},
	capture: { delay: 2400 },
};

export default entry;
