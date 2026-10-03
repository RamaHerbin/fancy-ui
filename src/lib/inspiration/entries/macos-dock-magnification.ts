import type { ExternalReference } from "../types.js";

// Draft: a proprietary OS surface; no licence to capture it.
const entry: ExternalReference = {
	id: "macos-dock-magnification",
	slug: "macos-dock-magnification",
	origin: "external",
	title: "macOS Dock — magnification",
	summary: "Neighbours grow with proximity, not on hover, so the target is never occluded.",
	kind: "interaction",
	creator: "Apple",
	product: "macOS",
	sourceUrl: "https://www.apple.com/macos/",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "draft",
	interactionTags: ["hover"],
	styleTags: ["physical", "glass"],
	useCaseTags: ["navigation"],
	codeAvailability: "none",
	analysis: {
		why: "Icon size follows the cursor's distance along the row, so the icons around the target swell with it and the row widens rather than overlapping. Leaving the dock lets every icon settle back together.",
		whenToUse: "A short row of launch targets on a pointer device.",
		watch:
			"Magnification is a pointer-only affordance; the row must stay usable at rest size for touch and keyboard.",
		clues: ["distance-to-cursor scale", "width-driven layout", "settle on leave"],
	},
	components: [
		{
			slug: "dock",
			relation: "related",
			note: "Same distance-driven magnify, on a lit glass shelf instead of the OS chrome.",
		},
	],
};

export default entry;
