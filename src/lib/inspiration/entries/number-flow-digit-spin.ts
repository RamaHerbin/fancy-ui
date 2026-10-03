import type { ExternalReference } from "../types.js";

const entry: ExternalReference = {
	id: "number-flow-digit-spin",
	slug: "number-flow-digit-spin",
	origin: "external",
	title: "Number — digit spin",
	summary: "Each digit spins through its neighbours to the new value while the figure reflows.",
	kind: "interaction",
	creator: "Maxwell Barvian",
	product: "NumberFlow",
	sourceUrl: "https://number-flow.barvian.me/",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["press"],
	styleTags: ["minimal", "editorial"],
	useCaseTags: ["data", "commerce"],
	sourceFramework: "other",
	implementationFrameworks: ["react", "vue", "svelte"],
	codeAvailability: "open-source",
	analysis: {
		why: "Pressing Shuffle sends every digit around a vertical wheel: the digits it passes stay faintly visible above and below, so the eye reads motion rather than a swap. Separators and sign fade in and out while the whole figure slides to its new width, so a change of length never jumps.",
		whenToUse:
			"A headline figure that changes in front of the visitor: a price toggle, a live counter, a total.",
		watch:
			"Screen readers should hear the final value once, not each frame. Under reduced motion the change should be instant. Proportional digits make the width jitter; use tabular numerals.",
		clues: [
			"per-digit vertical wheel",
			"width transition on the whole figure",
			"fade for added or removed characters",
			"Intl.NumberFormat parts",
		],
	},
	curatedRank: 36,
	collections: ["micro-interactions"],
	components: [
		{
			slug: "text-roll",
			relation: "related",
			note: "Rolls only the characters that change, one step, instead of spinning through every digit.",
		},
		{
			slug: "number-ticker",
			relation: "related",
			note: "Counts the value up or down rather than spinning each digit on its own wheel.",
		},
	],
	media: {
		type: "image",
		src: "/inspiration/external/number-flow-digit-spin.webp",
		width: 720,
		height: 450,
		alt: "A large dollar figure mid-shuffle: each digit is blurred between the values above and below it, over a Shuffle button.",
		credit: "Captured from the project's demo (MIT)",
		provenance: {
			license: "MIT",
			licenseUrl: "https://github.com/barvian/number-flow/blob/main/LICENSE.md",
			capturedBy: "fancyui",
			capturedAt: "2026-10-03",
		},
	},
};

export default entry;
