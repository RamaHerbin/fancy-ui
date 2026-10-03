import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "thinking-indicator",
	slug: "thinking-indicator",
	origin: "fancyui",
	title: "Status — thinking shimmer",
	summary:
		"A shimmer sweeps the status label while a timer counts, so “working” says what it is doing.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/thinking-indicator",
	addedAt: "2026-10-03",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["ambient"],
	styleTags: ["minimal"],
	useCaseTags: ["ai", "feedback"],
	codeAvailability: "open-source",
	analysis: {
		why: "Instead of a spinner, the status text itself carries the motion: a highlight sweeps the label while a dot pulses and an elapsed timer ticks. The visitor learns what is happening and for how long in one line.",
		whenToUse:
			"Any agent or model step longer than a second: reading files, searching, generating.",
		watch:
			'It is a `role="status"` polite live region; the ticking timer is `aria-hidden` while running so it is not announced every second. Both animations live under `no-preference`.',
		clues: [
			"background-clip: text sweep",
			"stops built from currentColor",
			"stopwatch from `since`",
			"timer hidden from AT while running",
		],
	},
	curatedRank: 14,
	collections: ["ai-interfaces"],
	components: [{ slug: "thinking-indicator", relation: "exact" }],
	demo: {
		module: "thinking-indicator",
		knobs: [
			{ key: "status", type: "text", label: "Status" },
			{
				key: "variant",
				type: "select",
				label: "Variant",
				options: [
					{ value: "pill", label: "pill" },
					{ value: "inline", label: "inline" },
				],
			},
		],
		defaults: { status: "Reading files", variant: "pill" },
	},
	capture: { delay: 1300 },
};

export default entry;
