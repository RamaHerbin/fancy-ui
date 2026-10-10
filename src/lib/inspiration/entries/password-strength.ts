import type { FancyUIReference } from "../types.js";

const entry: FancyUIReference = {
	id: "password-strength",
	slug: "password-strength",
	origin: "fancyui",
	title: "Password — strength meter",
	summary: "A segmented meter answers each keystroke, so the rule is learned by typing.",
	kind: "interaction",
	creator: "FancyUI",
	sourceUrl: "/docs/components/password-input",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["type"],
	styleTags: ["minimal"],
	useCaseTags: ["forms", "onboarding"],
	codeAvailability: "open-source",
	analysis: {
		why: "Strength is recomputed per input and drawn as segments, so the visitor learns what makes a password strong by watching it change rather than reading a rule list.",
		whenToUse: "Sign-up and password-change forms.",
		watch:
			"A meter is guidance, not a policy — validate on the server. The reveal toggle is `aria-pressed`. Do not rely on colour alone for the strength label.",
		clues: ["strength() per input", "segmented meter", "aria-live"],
	},
	curatedRank: 32,
	collections: ["micro-interactions"],
	components: [{ slug: "password-input", relation: "exact" }],
	demo: {
		module: "password-strength",
		knobs: [
			{ key: "showStrength", type: "boolean", label: "Strength meter" },
			{ key: "showToggle", type: "boolean", label: "Reveal toggle" },
		],
		defaults: { showStrength: true, showToggle: true },
	},
};

export default entry;
