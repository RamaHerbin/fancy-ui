import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "agent-plan",
	slug: "agent-plan",
	origin: "fancyui",
	title: "Plan — live checklist",
	summary: "A plan whose rows tick over as the agent works, with a count and a thin progress bar.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/agent-plan",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["ambient"],
	styleTags: ["minimal"],
	useCaseTags: ["ai", "data"],
	codeAvailability: "open-source",
	analysis: {
		why: "Each row switches glyph as its step moves from pending to running to done, and a done/total count with a thin bar sums it up, so progress reads at a glance without a log to parse.",
		whenToUse: "Multi-step agent runs where the visitor should see the plan before the result.",
		watch:
			"Every glyph carries a spoken status label. Passing `onSelect` turns rows into buttons. Nested `substeps` count as steps of their own in the total.",
		clues: ["status → glyph", "done / total + bar", "nested substeps", "rows keyed by id"],
	},
	curatedRank: 21,
	collections: ["ai-interfaces"],
	components: [{ slug: "agent-plan", relation: "exact" }],
	demo: {
		module: "agent-plan",
		knobs: [{ key: "showProgress", type: "boolean", label: "Progress bar" }],
		defaults: { showProgress: true },
	},
	capture: { delay: 2400 },
};

export default entry;
