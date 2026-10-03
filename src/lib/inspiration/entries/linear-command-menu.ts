import type { ExternalReference } from "../types.js";

// Draft: a proprietary product; no licence to capture it.
const entry: ExternalReference = {
	id: "linear-command-menu",
	slug: "linear-command-menu",
	origin: "external",
	title: "Linear — command menu",
	summary: "Every action is typeable; the menu is the app's keyboard.",
	kind: "interaction",
	creator: "Linear",
	sourceUrl: "https://linear.app",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "draft",
	interactionTags: ["type", "select"],
	styleTags: ["minimal"],
	useCaseTags: ["navigation", "data"],
	codeAvailability: "none",
	analysis: {
		why: "Every action in the app is reachable by typing its name, and choosing one can open a nested page in the same menu, so the palette becomes the app's keyboard rather than a search box.",
		whenToUse: "Tools with many actions and repeat users who live on the keyboard.",
		watch:
			"Discoverability: keep a visible entry point and show the shortcut next to menu items elsewhere.",
		clues: ["fuzzy match", "roving focus", "nested pages via a back stack"],
	},
	components: [
		{
			slug: "command-menu",
			relation: "related",
			note: "A modal command palette with grouped, filterable items; no nested pages.",
		},
	],
};

export default entry;
