import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "sun-switch",
	slug: "sun-switch",
	origin: "fancyui",
	title: "Theme switch — pixel sun wave",
	summary: "A theme switch drawn as a pixel sun; the new theme spreads from it in a dithered wave.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/sun-switch",
	addedAt: "2026-10-25",
	verifiedAt: "2026-10-25",
	status: "published",
	interactionTags: ["press", "hover"],
	styleTags: ["retro", "playful", "hdr"],
	useCaseTags: ["navigation", "feedback"],
	codeAvailability: "open-source",
	analysis: {
		why: "The switch is a sun made of square dots, and the theme change starts from it: the edge of the new theme is a staircase that steps one cell at a time on the switch's own grid, led by a dithered halo in the sun's four colours. Hovering opens a soft lens that shows the true colours under the pointer, so the control rewards a look before the click.",
		whenToUse:
			"The theme toggle of a site with a pixel or editorial voice, or any card that switches between a day and a night state.",
		watch:
			"Canvas 2D at device-pixel resolution; the loop sleeps when nothing moves or the switch is off screen. On the page the wave runs as a view transition, and the theme must flip synchronously inside the callback. The theme flips at most three times a second, so fast clicks never strobe. Reduced motion swaps the theme in one frame with no halo. A native switch button with aria-checked.",
		clues: [
			"view transition clipped by a staircase polygon",
			"Bayer 4×4 dithered halo",
			"lens with eased radius",
			"contained mode over a static copy",
		],
	},
	curatedRank: 4,
	collections: ["micro-interactions"],
	components: [{ slug: "sun-switch", relation: "exact" }],
	demo: {
		module: "sun-switch",
		knobs: [
			{ key: "radius", type: "range", label: "Radius", min: 6, max: 14, step: 1 },
			{ key: "duration", type: "range", label: "Duration", min: 600, max: 2400, step: 100 },
			{ key: "haloCells", type: "range", label: "Halo", min: 3, max: 16, step: 1 },
			{ key: "horizon", type: "boolean", label: "Horizon" },
		],
		defaults: { radius: 11, duration: 2000, haloCells: 10, horizon: true },
		mount: "intent",
	},
	capture: { delay: 1200 },
};

export default entry;
