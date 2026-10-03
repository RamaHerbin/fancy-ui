import type { ExternalReference } from "../types.js";

// Draft: a proprietary app; no licence to capture it.
const entry: ExternalReference = {
	id: "family-wallet-drag",
	slug: "family-wallet-drag",
	origin: "external",
	title: "Family — drag to reorder",
	summary: "Cards displace physically as you drag one past them; the list reads as objects.",
	kind: "interaction",
	creator: "Family",
	sourceUrl: "https://family.co",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "draft",
	interactionTags: ["drag"],
	styleTags: ["physical", "playful"],
	useCaseTags: ["commerce", "data"],
	codeAvailability: "none",
	analysis: {
		why: "The dragged card follows the finger while its neighbours slide out of the way, and the drop settles on a spring, so reordering feels like moving objects rather than editing rows.",
		whenToUse: "Short, user-ordered collections: wallets, playlists, pinned items.",
		watch:
			"Drag-only reordering excludes keyboard and screen-reader users: provide move up/down actions.",
		clues: ["pointer-driven transform", "sibling displacement", "spring drop"],
	},
	components: [],
};

export default entry;
