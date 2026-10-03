import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "switch-thumb",
	slug: "switch-thumb",
	origin: "fancyui",
	title: "Switch — thumb travel",
	summary: "Thumb travel and track tint are one transition, so the change reads as one event.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/switch",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["select"],
	styleTags: ["minimal"],
	useCaseTags: ["forms"],
	codeAvailability: "open-source",
	analysis: {
		why: "The thumb's travel and the track's colour run on the same timing, so on and off read as a single move rather than two changes.",
		whenToUse: "Settings that apply immediately, without a save button.",
		watch:
			'A native checkbox with `role="switch"`, so Space toggles it and the state is announced. Travel is gated by reduced motion.',
		clues: ["translateX on :checked", "colour transition", "size tokens", "role=switch"],
	},
	curatedRank: 27,
	collections: ["micro-interactions"],
	components: [{ slug: "switch", relation: "exact" }],
	demo: {
		module: "switch-thumb",
		knobs: [
			{
				key: "size",
				type: "select",
				label: "Size",
				options: [
					{ value: "sm", label: "sm" },
					{ value: "md", label: "md" },
					{ value: "lg", label: "lg" },
				],
			},
			{ key: "sound", type: "boolean", label: "Sound" },
		],
		defaults: { size: "lg", sound: false },
	},
};

export default entry;
