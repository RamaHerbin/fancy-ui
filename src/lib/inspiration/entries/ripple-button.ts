import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "ripple-button",
	slug: "ripple-button",
	origin: "fancyui",
	title: "Button — ripple at touch",
	summary: "The ripple starts where you pressed, so the button acknowledges the exact contact.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/ripple-button",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["press"],
	styleTags: ["minimal", "physical"],
	useCaseTags: ["forms", "feedback"],
	codeAvailability: "open-source",
	analysis: {
		why: "The ripple's origin is the contact point, not the centre, so the button answers the finger or cursor where it landed. Keyboard activation ripples from the centre, so every input gets the same acknowledgement.",
		whenToUse: "Dense, touch-first controls where a press needs visible confirmation.",
		watch:
			"Reduced motion is honoured in CSS. The ripple colour must contrast with the button face, or it is invisible. Each ripple cleans itself up on `animationend`.",
		clues: ["clientX/Y → origin", "scale keyframe", "cleanup on animationend", "keyboard = centre"],
	},
	curatedRank: 24,
	collections: ["micro-interactions"],
	components: [{ slug: "ripple-button", relation: "exact" }],
	demo: {
		module: "ripple-button",
		knobs: [
			{ key: "rippleColor", type: "color", label: "Colour" },
			{ key: "duration", type: "range", label: "Duration", min: 200, max: 1500, step: 50 },
		],
		defaults: { rippleColor: "#60a5fa", duration: 900 },
	},
};

export default entry;
