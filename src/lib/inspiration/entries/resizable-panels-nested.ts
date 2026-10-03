import type { ExternalReference } from "../types.js";

const entry: ExternalReference = {
	id: "resizable-panels-nested",
	slug: "resizable-panels-nested",
	origin: "external",
	title: "Panels — nested resize",
	summary: "Drag the gaps between nested panels; where gaps meet, both directions resize at once.",
	kind: "interaction",
	creator: "Brian Vaughn",
	product: "react-resizable-panels",
	sourceUrl: "https://react-resizable-panels.vercel.app/examples/nested-groups",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["drag"],
	styleTags: ["minimal"],
	useCaseTags: ["navigation", "data"],
	sourceFramework: "react",
	implementationFrameworks: ["react"],
	codeAvailability: "open-source",
	analysis: {
		why: "Groups nest horizontally and vertically, and the gap between two panels is the handle: the cursor turns to a resize arrow on hover and the neighbours trade size as you drag. Near an intersection, one drag moves the column and the row together. The example prints the markup above the live layout, so structure and result sit side by side.",
		whenToUse:
			"Editors, dashboards and inspectors where the visitor decides how much room each pane gets.",
		watch:
			"Handles need a keyboard path (focus plus arrow keys) and a visible focus ring. Thin gaps are hard targets on touch; widen the hit area, not the visible line. Persist sizes so a reload does not undo the layout.",
		clues: [
			"sizes as percentages of the group",
			"pointer capture on the gap",
			"intersection hit test",
			"min and max per panel",
		],
	},
	curatedRank: 38,
	components: [
		{
			slug: "sidebar",
			relation: "related",
			note: "Collapses a single side pane to a rail; it does not split the remaining space into resizable panels.",
		},
	],
	media: {
		type: "image",
		src: "/inspiration/external/resizable-panels-nested.webp",
		width: 720,
		height: 450,
		alt: "Nested group markup above a live layout of five dark panels, the middle column widened by a drag.",
		credit: "Captured from the project's demo (MIT)",
		provenance: {
			license: "MIT",
			licenseUrl: "https://github.com/bvaughn/react-resizable-panels/blob/main/LICENSE.md",
			capturedBy: "fancyui",
			capturedAt: "2026-10-03",
		},
	},
};

export default entry;
