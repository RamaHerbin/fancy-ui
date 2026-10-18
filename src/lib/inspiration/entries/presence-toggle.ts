import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "presence-toggle",
	slug: "presence-toggle",
	origin: "fancyui",
	title: "Panel — enter and exit",
	summary: "A panel that enters and leaves on its own clock — exit shorter than enter.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/presence",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["press"],
	styleTags: ["minimal"],
	useCaseTags: ["feedback", "navigation"],
	codeAvailability: "open-source",
	analysis: {
		why: "Enter and exit have their own durations and presets, and the exit is shorter, so the panel leaves like it means it. The element stays mounted until its exit finishes.",
		whenToUse: "Popovers, banners and inline panels that appear on demand.",
		watch:
			"Exiting content is inert, so it cannot take focus while it leaves. Reduced motion collapses the durations.",
		clues: ["enter / exit durations", "preset transforms", "inert during exit"],
	},
	curatedRank: 28,
	collections: ["micro-interactions"],
	components: [{ slug: "presence", relation: "exact" }],
	demo: {
		module: "presence-toggle",
		knobs: [
			{
				key: "preset",
				type: "select",
				label: "Preset",
				options: [
					{ value: "fade", label: "fade" },
					{ value: "fade-up", label: "fade-up" },
					{ value: "fade-down", label: "fade-down" },
					{ value: "fade-left", label: "fade-left" },
					{ value: "fade-right", label: "fade-right" },
					{ value: "scale", label: "scale" },
					{ value: "blur", label: "blur" },
					{ value: "zoom", label: "zoom" },
				],
			},
			{ key: "duration", type: "range", label: "Enter", min: 100, max: 800, step: 25 },
			{ key: "exitDuration", type: "range", label: "Exit", min: 50, max: 600, step: 25 },
		],
		defaults: { preset: "fade-up", duration: 300, exitDuration: 200 },
	},
};

export default entry;
