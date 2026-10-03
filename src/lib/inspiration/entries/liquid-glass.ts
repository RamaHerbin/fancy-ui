import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "liquid-glass",
	slug: "liquid-glass",
	origin: "fancyui",
	title: "Nav — liquid glass lens",
	summary: "A pill that refracts what passes under it, with a thin chromatic fringe at the edge.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/liquid-glass",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["scroll"],
	styleTags: ["glass", "iridescent"],
	useCaseTags: ["navigation", "marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "An SVG displacement map bends the backdrop and each colour channel is offset by a different amount, so the edges split into a thin chromatic fringe the way thick glass does. It only reads when something moves behind it — a page scrolling under a pill nav — and then the bend is what tells you there is a surface.",
		whenToUse: "A floating nav or toolbar over colourful, scrolling content.",
		watch:
			"`backdrop-filter: url(#…)` works in Chromium only; Safari gets a blur-and-saturate fallback and Firefox only a frost tint. Over a flat backdrop it is invisible. It sets `--frost` on its root, which inherits into children.",
		clues: [
			"feDisplacementMap per channel",
			"generated SVG displacement map",
			"backdrop-filter: url()",
			"ResizeObserver rebuilds the map",
		],
	},
	curatedRank: 3,
	collections: ["glass-and-glow"],
	components: [{ slug: "liquid-glass", relation: "exact" }],
	demo: {
		module: "liquid-glass",
		knobs: [
			{ key: "scale", type: "range", label: "Bend", min: -300, max: 0, step: 10 },
			{ key: "blur", type: "range", label: "Edge blur", min: 0, max: 30, step: 1 },
		],
		defaults: { scale: -180, blur: 11 },
	},
	capture: { delay: 2400 },
};

export default entry;
