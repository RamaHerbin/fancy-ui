import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "fireworks",
	slug: "fireworks",
	origin: "fancyui",
	title: "Sky — HDR fireworks",
	summary: "GPU fireworks whose bursts and comet trails burn brighter than white on HDR displays.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/fireworks-hdr",
	addedAt: "2026-10-25",
	verifiedAt: "2026-10-25",
	status: "published",
	interactionTags: ["press", "ambient"],
	styleTags: ["glow", "playful", "hdr"],
	useCaseTags: ["marketing", "media"],
	codeAvailability: "open-source",
	analysis: {
		why: "Each shell climbs on a solved trajectory, hangs for a short fuse and breaks at the apex it was aimed at. Sparks start white-hot and cross-fade into a single palette hue before cooling to warm white, so a burst reads as light rather than confetti. On an HDR display the flashes and comet heads go above SDR white while the steady sparks, embers and smoke stay below it, which keeps the frame mostly deep black with a few bright points.",
		whenToUse:
			"A launch page, a celebration moment or a dark hero where the sky itself is the decoration.",
		watch:
			"A WebGPU engine with a WebGL2 fallback, and nothing at all where neither comes up. The particle budget follows the render level and the box size, and an adaptive ladder sheds GPU cost first when frames run long. Reduced motion stops the ambient shells; explicit launches still fire. The canvas is decorative and aria-hidden.",
		clues: [
			"deterministic physics core",
			"rgba16float canvas, extended tone mapping",
			"white → hue → warm-white life ramp",
			"keep-clear rect for foreground copy",
		],
	},
	curatedRank: 3,
	collections: ["glass-and-glow"],
	components: [{ slug: "fireworks-hdr", relation: "exact" }],
	demo: {
		module: "fireworks",
		knobs: [
			{
				key: "shells",
				type: "select",
				label: "Shells",
				options: [
					{ value: "mix", label: "mix" },
					{ value: "heart", label: "heart" },
					{ value: "star", label: "star" },
				],
			},
			{
				key: "ambientIntensity",
				type: "range",
				label: "Intensity",
				min: 0,
				max: 1,
				step: 0.05,
			},
			{ key: "exposure", type: "range", label: "Exposure", min: 1, max: 4, step: 0.1 },
		],
		defaults: { shells: "mix", ambientIntensity: 0.45, exposure: 2.2 },
		mount: "intent",
	},
	capture: { delay: 900 },
};

export default entry;
