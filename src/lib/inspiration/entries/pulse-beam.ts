import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "pulse-beam",
	slug: "pulse-beam",
	origin: "fancyui",
	title: "Composer — pulse beam",
	summary: "A breathing multi-hue beam around a composer that never touches the field inside.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/pulse-beam",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["ambient"],
	styleTags: ["glow", "iridescent"],
	useCaseTags: ["ai", "marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "The beam is drawn around the child, not over it: a 1px ring, a feathered inner glow and a bloom breathe together while the hue drifts, and the field inside stays opaque and readable. It fades in after mount instead of popping, so the surface wakes up rather than switching on.",
		whenToUse:
			"The one input a page is about — a prompt composer, a search field, a waitlist form — when it should look alive while idle.",
		watch:
			"One shared rAF loop drives every instance and an IntersectionObserver pauses it off-screen. Reduced motion keeps the layers lit but frozen. `tone` is a prop, not theme-aware: set it to `light` on light pages.",
		clues: ["mask padding", "hue-rotate", "IntersectionObserver pause", "inner / outside variant"],
	},
	curatedRank: 1,
	collections: ["glass-and-glow"],
	components: [{ slug: "pulse-beam", relation: "exact" }],
	demo: {
		module: "pulse-beam",
		knobs: [
			{
				key: "palette",
				type: "select",
				label: "Palette",
				options: [
					{ value: "colorful", label: "colorful" },
					{ value: "mono", label: "mono" },
					{ value: "ocean", label: "ocean" },
					{ value: "sunset", label: "sunset" },
				],
			},
			{
				key: "variant",
				type: "select",
				label: "Variant",
				options: [
					{ value: "inner", label: "inner" },
					{ value: "outside", label: "outside" },
				],
			},
			{ key: "speed", type: "range", label: "Speed", min: 0.5, max: 2, step: 0.1 },
		],
		defaults: { palette: "colorful", variant: "inner", speed: 1 },
	},
	capture: { delay: 2200 },
};

export default entry;
