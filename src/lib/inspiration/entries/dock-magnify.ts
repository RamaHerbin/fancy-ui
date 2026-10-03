import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "dock-magnify",
	slug: "dock-magnify",
	origin: "fancyui",
	title: "Dock — distance magnify",
	summary: "Icons grow with their distance to the cursor, lit like a glass shelf.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/dock",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["physical", "glass"],
	useCaseTags: ["navigation"],
	codeAvailability: "open-source",
	analysis: {
		why: "Each icon's size is a function of its distance to the pointer, not a hover state, so neighbours swell with the target and the row breathes as the cursor travels. Width drives layout, so icons push each other instead of overlapping.",
		whenToUse: "A short row of app-level shortcuts on pointer devices.",
		watch:
			'Magnification is off under `hover: none` and reduced motion. The dock is a `role="toolbar"`. Width-driven layout reflows neighbours on every move, which costs more than a transform on long rows.',
		clues: ["distance → scale curve", "width-driven layout, not transform", "spring settle"],
	},
	curatedRank: 11,
	collections: ["micro-interactions"],
	components: [{ slug: "dock", relation: "exact" }],
	demo: {
		module: "dock-magnify",
		knobs: [
			{
				key: "magnification",
				type: "range",
				label: "Magnification",
				min: 30,
				max: 120,
				step: 5,
			},
			{ key: "distance", type: "range", label: "Reach", min: 60, max: 260, step: 10 },
		],
		defaults: { magnification: 60, distance: 140 },
	},
	capture: { hover: [0.5, 0.55] },
};

export default entry;
