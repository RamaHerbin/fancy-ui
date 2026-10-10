import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "pressable-scale",
	slug: "pressable-scale",
	origin: "fancyui",
	title: "Wrapper — press squash",
	summary: "Scale drops on pointerdown, so feedback lands before the action.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/pressable",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["press"],
	styleTags: ["physical"],
	useCaseTags: ["feedback", "commerce"],
	codeAvailability: "open-source",
	analysis: {
		why: "The squash starts on pointerdown, not click, so the control answers the moment it is touched; a haptic pattern can ride along on devices that support it.",
		whenToUse: "Cards, tiles and buttons on touch-first surfaces.",
		watch:
			"`navigator.vibrate` is ignored on iOS, so haptics can never be the only feedback. `pointercancel` releases the squash when a press turns into a scroll. Only the CSS transition is gated under reduced motion.",
		clues: ["pointerdown / pointerup pairing", "pointercancel", "navigator.vibrate pattern"],
	},
	curatedRank: 29,
	collections: ["micro-interactions"],
	components: [{ slug: "pressable", relation: "exact" }],
	demo: {
		module: "pressable-scale",
		knobs: [
			{ key: "scale", type: "range", label: "Scale", min: 0.8, max: 1, step: 0.01 },
			{
				key: "haptic",
				type: "select",
				label: "Haptic",
				options: [
					{ value: "none", label: "none" },
					{ value: "light", label: "light" },
					{ value: "medium", label: "medium" },
					{ value: "heavy", label: "heavy" },
					{ value: "success", label: "success" },
					{ value: "error", label: "error" },
				],
			},
		],
		defaults: { scale: 0.97, haptic: "light" },
	},
};

export default entry;
