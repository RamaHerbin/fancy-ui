import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "streaming-text",
	slug: "streaming-text",
	origin: "fancyui",
	title: "Answer — tinted streaming",
	summary: "Each new chunk arrives tinted and settles into the paragraph a moment later.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/streaming-text",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["ambient"],
	styleTags: ["minimal", "editorial"],
	useCaseTags: ["ai"],
	codeAvailability: "open-source",
	analysis: {
		why: "New text lands in a tint and fades to the body colour over a few hundred milliseconds, so the seam between what was there and what just arrived stays legible — without any text moving. A soft block cursor trails the last character while the stream is open.",
		whenToUse: "Model answers, live transcripts, any text that grows in place.",
		watch:
			"Hand it the accumulated text, never the delta. The tint settle lives under `no-preference`. Markdown mode renders blocks and drops the per-chunk tint.",
		clues: [
			"accumulated text in, diff tinted",
			"settleMs fade",
			"trailing block cursor",
			"onComplete on the true → false edge",
		],
	},
	curatedRank: 18,
	collections: ["ai-interfaces"],
	components: [{ slug: "streaming-text", relation: "exact" }],
	demo: {
		module: "streaming-text",
		knobs: [
			{ key: "tintColor", type: "color", label: "Tint" },
			{ key: "settleMs", type: "range", label: "Settle (ms)", min: 100, max: 1200, step: 50 },
		],
		defaults: { tintColor: "#818cf8", settleMs: 450 },
	},
	capture: { delay: 1500 },
};

export default entry;
