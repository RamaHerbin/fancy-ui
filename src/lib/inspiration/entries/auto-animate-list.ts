import type { ExternalReference } from "../types.js";

const entry: ExternalReference = {
	id: "auto-animate-list",
	slug: "auto-animate-list",
	origin: "external",
	title: "List — automatic reflow",
	summary: "Rows added, removed or reordered glide into place with no per-item animation code.",
	kind: "interaction",
	creator: "FormKit",
	product: "AutoAnimate",
	sourceUrl: "https://auto-animate.formkit.com/",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["press"],
	styleTags: ["minimal", "playful"],
	useCaseTags: ["data", "forms"],
	implementationFrameworks: ["react", "vue", "svelte"],
	codeAvailability: "open-source",
	analysis: {
		why: "Moving a row down makes the two rows trade places in a short slide, and a new row grows into the gap instead of popping in. The demo shows the same list without the utility beside it, so the difference is easy to see. Nothing in the list knows it is animated: one call on the parent watches its children.",
		whenToUse:
			"Lists, filters and form rows that change under the visitor's pointer: to-dos, tags, cart lines.",
		watch:
			"A reorder that animates must still move keyboard focus and announce the new position. Long lists that reflow on every keystroke get busy; keep durations short and respect reduced motion.",
		clues: [
			"MutationObserver on the parent",
			"FLIP: measure, invert, play",
			"enter and exit keyframes",
			"one call per container",
		],
	},
	curatedRank: 37,
	collections: ["micro-interactions"],
	components: [
		{
			slug: "presence",
			relation: "related",
			note: "Animates one element in and out; it does not slide siblings that change position.",
		},
	],
	media: {
		type: "image",
		src: "/inspiration/external/auto-animate-list.webp",
		width: 720,
		height: 450,
		alt: "A violet to-do list mid-reorder: two rows overlap as they trade places, above an input with Add and Sort buttons.",
		credit: "Captured from the project's demo (MIT)",
		provenance: {
			license: "MIT",
			licenseUrl: "https://github.com/formkit/auto-animate/blob/master/LICENSE",
			capturedBy: "fancyui",
			capturedAt: "2026-10-03",
		},
	},
};

export default entry;
