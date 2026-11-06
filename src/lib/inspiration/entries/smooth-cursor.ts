import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "smooth-cursor",
	slug: "smooth-cursor",
	origin: "fancyui",
	title: "Cursor — multiplayer spring",
	summary:
		"A coloured arrow follows the pointer on a spring, with a name pill trailing on a softer one.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/smooth-cursor",
	addedAt: "2026-10-25",
	verifiedAt: "2026-10-25",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["minimal", "playful"],
	useCaseTags: ["data", "marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "Two springs, not one: the arrow is stiff enough to feel attached to the hand, and the name pill follows on a softer spring, lags a few frames and tilts a little with sideways speed before settling. That lag is what makes it read as a person rather than the system cursor. At rest the pill dims, so an idle teammate fades into the canvas.",
		whenToUse:
			"Collaboration surfaces, live demos of a multiplayer product, or a landing section that should feel inhabited.",
		watch:
			"It covers the whole page and hides the native cursor, so render it only while the pointer is inside the area it belongs to. The loop sleeps once both springs settle. Reduced motion snaps both to the pointer. The layer is aria-hidden and ignores pointer events.",
		clues: [
			"arrow spring + softer label spring",
			"tip as the hotspot",
			"label leash and tilt",
			"idle dim",
		],
	},
	curatedRank: 11,
	collections: ["micro-interactions"],
	components: [{ slug: "smooth-cursor", relation: "exact" }],
	demo: {
		module: "smooth-cursor",
		knobs: [
			{ key: "label", type: "text", label: "Name", maxLength: 16 },
			{ key: "color", type: "color", label: "Colour" },
			{ key: "rotate", type: "boolean", label: "Rotate" },
		],
		defaults: { label: "You", color: "#3a7bfd", rotate: false },
	},
	capture: { sweep: true, delay: 1000 },
};

export default entry;
