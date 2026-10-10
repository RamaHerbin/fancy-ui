import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "mosaic-glow",
	slug: "mosaic-glow",
	origin: "fancyui",
	title: "Tiles — glow trail",
	summary: "A grid of tiles lights up under the cursor and fades behind it like phosphor.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/mosaic-glow",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["glow", "retro"],
	useCaseTags: ["marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "Each tile keeps its own intensity, so trail decay separates where the cursor is from where it was, and smoothing keeps the halo from jittering. With no pointer, the halo drifts on its own, so the surface is never dead.",
		whenToUse: "A hero or section background on a dark page that should react to presence.",
		watch:
			"A canvas 2D loop, paused off-screen by an IntersectionObserver. Reduced motion draws one settled frame. On touch only the idle drift shows.",
		clues: ["canvas tiles", "per-tile intensity buffer", "trail decay", "idle drift"],
	},
	curatedRank: 15,
	collections: ["glass-and-glow"],
	components: [{ slug: "mosaic-glow", relation: "exact" }],
	demo: {
		module: "mosaic-glow",
		knobs: [
			{ key: "color", type: "color", label: "Colour" },
			{ key: "tileSize", type: "range", label: "Tile", min: 6, max: 32, step: 2 },
			{ key: "radius", type: "range", label: "Radius", min: 60, max: 320, step: 10 },
		],
		defaults: { color: "#f2c318", tileSize: 18, radius: 170 },
		mount: "intent",
	},
	capture: { sweep: true, delay: 1800 },
};

export default entry;
