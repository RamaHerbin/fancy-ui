import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "pixel-scene",
	slug: "pixel-scene",
	origin: "fancyui",
	title: "Landscape — pixel lens",
	summary: "A pixel-art landscape in sparse ink dots that turns full colour under a lens.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/pixel-scene",
	addedAt: "2026-10-25",
	verifiedAt: "2026-10-25",
	status: "published",
	interactionTags: ["hover", "press"],
	styleTags: ["retro", "editorial", "hdr"],
	useCaseTags: ["marketing", "media"],
	codeAvailability: "open-source",
	analysis: {
		why: "At rest the picture is only sparse ink dots and its lit cells, so it sits quietly behind copy. A round lens with a dithered rim follows the pointer and shows the landscape in full colour underneath, which turns looking into the interaction. Clouds, birds and lights keep moving, and a change of night plays as a dithered wave spreading from the sun or the moon.",
		whenToUse:
			"An editorial hero, a seasonal page or a section header that should invite a closer look without shouting.",
		watch:
			"A Canvas 2D picture; very large boxes use a coarser grid so a frame stays under about 72 000 cells. The HDR layer only starts on a display that reports HDR. The component never changes `night` itself, and a clickable div is not focusable, so keep a real button for keyboard users. Reduced motion makes the wave instant.",
		clues: [
			"one square dot per grid cell",
			"lens with a dithered rim",
			"day and night palettes",
			"wave from the sun on a night change",
		],
	},
	curatedRank: 9,
	collections: ["glass-and-glow"],
	components: [{ slug: "pixel-scene", relation: "exact" }],
	demo: {
		module: "pixel-scene",
		knobs: [
			{
				key: "scene",
				type: "select",
				label: "Scene",
				options: [
					{ value: "alpine", label: "alpine" },
					{ value: "meadow", label: "meadow" },
					{ value: "sea", label: "sea" },
					{ value: "mountains", label: "mountains" },
				],
			},
			{ key: "night", type: "boolean", label: "Night" },
			{ key: "lensRadius", type: "range", label: "Lens", min: 6, max: 40, step: 1 },
			{ key: "hdr", type: "boolean", label: "HDR" },
		],
		defaults: { scene: "alpine", night: true, lensRadius: 16, hdr: true },
		mount: "intent",
	},
	capture: { hover: [0.62, 0.58], delay: 1400 },
};

export default entry;
