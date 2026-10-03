import type { ExternalReference } from "../types.js";

// Draft: a proprietary product; no licence to capture it.
const entry: ExternalReference = {
	id: "arc-sidebar-peek",
	slug: "arc-sidebar-peek",
	origin: "external",
	title: "Arc — sidebar peek",
	summary: "Edge proximity, not a click, opens the hidden sidebar; it retreats when you leave.",
	kind: "interaction",
	creator: "The Browser Company",
	product: "Arc",
	sourceUrl: "https://arc.net",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "draft",
	interactionTags: ["hover"],
	styleTags: ["minimal"],
	useCaseTags: ["navigation"],
	codeAvailability: "none",
	analysis: {
		why: "With the sidebar hidden, moving the cursor to the window edge slides it in over the content, and it retreats the moment the cursor leaves — navigation on demand without a toggle.",
		whenToUse: "Content-first layouts where navigation is needed occasionally.",
		watch:
			"Edge hover does not exist on touch or keyboard: keep an explicit toggle, and add a short delay so passing cursors do not trigger it.",
		clues: ["edge hit zone", "translateX with delay", "pointerleave close"],
	},
	components: [
		{
			slug: "sidebar",
			relation: "related",
			note: "A collapsible navigation rail with an icon-only state; no edge-hover peek.",
		},
	],
};

export default entry;
