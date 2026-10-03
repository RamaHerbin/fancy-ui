import type { ExternalReference } from "../types.js";

const entry: ExternalReference = {
	id: "floating-ui-placement",
	slug: "floating-ui-placement",
	origin: "external",
	title: "Popover — placement picker",
	summary: "Click a dot around the anchor and the floating label moves to that side and alignment.",
	kind: "interaction",
	creator: "Floating UI",
	product: "Floating UI",
	sourceUrl: "https://floating-ui.com/",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["select"],
	styleTags: ["minimal", "editorial"],
	useCaseTags: ["navigation", "forms"],
	sourceFramework: "react",
	implementationFrameworks: ["react", "vue"],
	codeAvailability: "open-source",
	analysis: {
		why: "Twelve dots ring a dashed reference box; each one is a placement, and clicking it moves the floating label there and prints the placement name inside it. The demo teaches a vocabulary (side plus start, centre or end) by letting you point at it. Neighbouring cards show the same anchor shifting and flipping as its container scrolls.",
		whenToUse:
			"Explaining or configuring anchored UI: tooltip settings, a docs page, a design tool's popover options.",
		watch:
			"Placement is a preference, not a guarantee: collision handling may flip it, and the label should say what was used. Dots need focus styles and names; colour alone does not mark the selected one.",
		clues: [
			"side + alignment = placement",
			"compute position from two rects",
			"flip and shift middleware",
			"autoUpdate on scroll and resize",
		],
	},
	curatedRank: 39,
	components: [
		{
			slug: "popover",
			relation: "related",
			note: "An anchored panel you open; the reference teaches placements rather than shipping one.",
		},
		{
			slug: "tooltip",
			relation: "related",
			note: "Anchored hint on hover or focus, with a fixed preferred side instead of a picker.",
		},
	],
	media: {
		type: "image",
		src: "/inspiration/external/floating-ui-placement.webp",
		width: 720,
		height: 450,
		alt: "A white demo window: a dashed Reference box ringed by twelve dots, the lower-right dot filled and a red right-end label beside the box.",
		credit: "Captured from the project's demo (MIT)",
		provenance: {
			license: "MIT",
			licenseUrl: "https://github.com/floating-ui/floating-ui/blob/master/LICENSE",
			capturedBy: "fancyui",
			capturedAt: "2026-10-03",
		},
	},
};

export default entry;
