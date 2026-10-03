import type { ExternalReference } from "../types.js";

const entry: ExternalReference = {
	id: "shiki-magic-move-code",
	slug: "shiki-magic-move-code",
	origin: "external",
	title: "Code block — magic move",
	summary: "Between two versions of a snippet, matching tokens glide to their new place.",
	kind: "interaction",
	creator: "Shiki",
	product: "Shiki Magic Move",
	sourceUrl: "https://shiki-magic-move.netlify.app/",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["type", "press"],
	styleTags: ["editorial", "minimal"],
	useCaseTags: ["marketing", "media"],
	sourceFramework: "vue",
	implementationFrameworks: ["react", "vue", "svelte"],
	codeAvailability: "open-source",
	analysis: {
		why: "Toggling the example swaps the code, but tokens that exist in both versions slide from their old line and column to the new one while removed tokens fade out and new ones fade in. The reader follows a variable across the refactor instead of re-reading the block. Duration and stagger sliders sit under the editor.",
		whenToUse:
			"Step-by-step code walkthroughs, release notes and docs where the change matters more than the final code.",
		watch:
			"Copy must return the final code, not a mid-flight state. Long blocks with many moved tokens get noisy; keep each step small. Under reduced motion, cross-fade or cut.",
		clues: [
			"tokenise both versions",
			"match tokens by content",
			"FLIP each token's position",
			"stagger by line",
		],
	},
	curatedRank: 40,
	components: [
		{
			slug: "code-diff",
			relation: "related",
			note: "Shows the change as added and removed lines side by side, without animating tokens between versions.",
		},
	],
	media: {
		type: "image",
		src: "/inspiration/external/shiki-magic-move-code.webp",
		width: 720,
		height: 450,
		alt: "A dark highlighted code block mid-transition: some tokens sit between lines as they move, others are half faded.",
		credit: "Captured from the project's demo (MIT)",
		provenance: {
			license: "MIT",
			licenseUrl: "https://github.com/shikijs/shiki-magic-move/blob/main/LICENSE",
			capturedBy: "fancyui",
			capturedAt: "2026-10-03",
		},
	},
};

export default entry;
