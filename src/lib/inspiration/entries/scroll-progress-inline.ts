import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "scroll-progress-inline",
	slug: "scroll-progress-inline",
	origin: "fancyui",
	title: "Reading bar — box progress",
	summary: "A reading bar that tracks one scrolling box, not the page.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/scroll-progress",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["scroll"],
	styleTags: ["minimal"],
	useCaseTags: ["navigation"],
	codeAvailability: "open-source",
	analysis: {
		why: "The bar tracks an element's own scroll, so it means how far into this — an article, a changelog, a panel — rather than how far down the page.",
		whenToUse: "Long content inside a scrolling container.",
		watch:
			'Exposed as `role="progressbar"` with `aria-valuenow`. Nested scroll containers each need their own bar.',
		clues: ["target element", "scaleX from scrollTop / scrollHeight", "position inline"],
	},
	curatedRank: 35,
	collections: ["micro-interactions"],
	components: [{ slug: "scroll-progress", relation: "exact" }],
	demo: { module: "scroll-progress-inline" },
};

export default entry;
