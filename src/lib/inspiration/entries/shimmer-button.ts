import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "shimmer-button",
	slug: "shimmer-button",
	origin: "fancyui",
	title: "Button — satin shimmer",
	summary: "A satin band sweeps a black pill, then rests; on hover the sheen follows the pointer.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/shimmer-button",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["ambient", "hover"],
	styleTags: ["glow", "minimal"],
	useCaseTags: ["marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "The idle loop sweeps a satin band across the pill and then rests, so it invites without strobing. On hover the sheen jumps to the pointer, so the button answers the cursor rather than looping past it.",
		whenToUse: "A single sign-up or early-access action on a dark hero.",
		watch:
			"It sets `--radius` on its root, which overrides the theme token for any `rounded-*` child. Reduced motion leaves a static sheen.",
		clues: [
			"sweep-then-rest keyframes",
			"pointermove → --mx / --my",
			"face inset by --cut over the sheen",
		],
	},
	curatedRank: 12,
	collections: ["glass-and-glow"],
	components: [{ slug: "shimmer-button", relation: "exact" }],
	demo: {
		module: "shimmer-button",
		knobs: [
			{ key: "shimmerColor", type: "color", label: "Sheen" },
			{
				key: "shimmerDuration",
				type: "select",
				label: "Cycle",
				options: [
					{ value: "2s", label: "2s" },
					{ value: "3s", label: "3s" },
					{ value: "5s", label: "5s" },
				],
			},
		],
		defaults: { shimmerColor: "#ffffff", shimmerDuration: "3s" },
	},
	capture: { hover: [0.56, 0.5], delay: 1400 },
};

export default entry;
