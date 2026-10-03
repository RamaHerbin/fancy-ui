import type { ExternalReference } from "../types.js";

// Draft: a proprietary platform control. No licence lets us capture and
// publish it, so it stays out of the gallery until we have our own study.
const entry: ExternalReference = {
	id: "ios-pull-to-refresh",
	slug: "ios-pull-to-refresh",
	origin: "external",
	title: "iOS list — pull to refresh",
	summary: "The spinner assembles from the pull distance, so the gesture is its own progress bar.",
	kind: "interaction",
	creator: "Apple",
	product: "iOS",
	sourceUrl: "https://developer.apple.com/design/human-interface-guidelines/",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "draft",
	interactionTags: ["drag"],
	styleTags: ["physical", "minimal"],
	useCaseTags: ["feedback", "data"],
	codeAvailability: "none",
	analysis: {
		why: "The spinner's spokes appear one by one as the list is pulled past its top, so the gesture doubles as a progress bar toward the threshold. Past it, the refresh commits and the list rubber-bands back to rest.",
		whenToUse: "Feeds and inboxes on touch devices, where new content arrives at the top.",
		watch:
			"Pointer and keyboard users cannot overscroll: always pair it with a visible refresh control.",
		clues: ["overscroll → rubber band", "threshold commit", "spinner drawn from pull ratio"],
	},
	components: [],
};

export default entry;
