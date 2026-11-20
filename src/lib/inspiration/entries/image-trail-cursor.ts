import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "image-trail-cursor",
	slug: "image-trail-cursor",
	origin: "fancyui",
	title: "Cursor — image trail",
	summary: "Photos spawn along the pointer's path and play out one of eighteen exits.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/image-trail-cursor",
	addedAt: "2026-10-25",
	verifiedAt: "2026-10-25",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["playful", "editorial"],
	useCaseTags: ["media", "marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "A new image drops at the pointer each time it has travelled a set distance, so the trail's density follows how far you move, not how long. Each variant gives the frames a different life: fading, drifting on momentum, tilting in 3D, falling under gravity or assembling from slats and cells. Stacked frames keep the latest on top, so the trail reads as a path.",
		whenToUse:
			"A portfolio, a photographer's index or a campaign page where the work itself should follow the visitor around.",
		watch:
			"GSAP timelines on mouse movement inside the container; touch gets a shorter step. Under reduced motion no variant is built and no image ever spawns. Images are decorative, so keep the real content elsewhere on the page, and give fall and gravity a container height.",
		clues: [
			"spawn on travelled distance",
			"recycled pool of frames",
			"GSAP timeline per variant",
			"fragment reveals",
		],
	},
	curatedRank: 10,
	collections: ["micro-interactions"],
	components: [{ slug: "image-trail-cursor", relation: "exact" }],
	demo: {
		module: "image-trail-cursor",
		knobs: [
			{
				key: "variant",
				type: "select",
				label: "Variant",
				options: [
					{ value: "type1", label: "fade & scale" },
					{ value: "type4", label: "momentum" },
					{ value: "type5", label: "rotation" },
					{ value: "type7", label: "stacking" },
					{ value: "type8", label: "3D perspective" },
					{ value: "scale", label: "scale pop" },
					{ value: "gravity", label: "gravity" },
					{ value: "flame", label: "flame" },
					{ value: "venetian", label: "venetian" },
					{ value: "hexagon", label: "hexagon" },
					{ value: "zoom-split", label: "zoom split" },
				],
			},
		],
		defaults: { variant: "type7" },
	},
	capture: { sweep: true, delay: 1200 },
};

export default entry;
