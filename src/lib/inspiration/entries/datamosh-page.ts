import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "datamosh-page",
	slug: "datamosh-page",
	origin: "fancyui",
	title: "Page — datamosh swap",
	summary: "A page swap hidden behind bands that decode the new page from noise.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/datamosh-transition",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["press"],
	styleTags: ["retro", "brutal"],
	useCaseTags: ["media", "marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "The cover phase hides the swap, then the reveal shows the new page as if decoded from a corrupted stream. A promise API lets the swap finish before the reveal starts.",
		whenToUse: "Editorial or portfolio sites with a deliberate glitch aesthetic.",
		watch:
			"Canvas 2D bands over the page; a strong glitch is a lot of flashing, so keep it brief. The component honours reduced motion. Await the swap before resolving the cover.",
		clues: ["cover / reveal promise API", "canvas bands", "contained mode"],
	},
	curatedRank: 34,
	components: [{ slug: "datamosh-transition", relation: "exact" }],
	demo: {
		module: "datamosh-page",
		knobs: [
			{
				key: "variant",
				type: "select",
				label: "Variant",
				options: [
					{ value: "curtain", label: "curtain" },
					{ value: "rise", label: "rise" },
					{ value: "split", label: "split" },
					{ value: "interlace", label: "interlace" },
				],
			},
			{ key: "speed", type: "range", label: "Speed", min: 0.5, max: 2, step: 0.1 },
		],
		defaults: { variant: "curtain", speed: 1 },
		mount: "intent",
	},
};

export default entry;
