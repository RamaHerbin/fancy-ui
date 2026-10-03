import type { ExternalReference } from "../types.js";

// Draft: a proprietary marketing site; no licence to capture it.
const entry: ExternalReference = {
	id: "stripe-mesh-gradient",
	slug: "stripe-mesh-gradient",
	origin: "external",
	title: "Stripe — mesh gradient",
	summary: "A WebGL mesh behind the hero that never repeats, so the page feels alive.",
	kind: "section",
	creator: "Stripe",
	sourceUrl: "https://stripe.com",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "draft",
	interactionTags: ["ambient"],
	styleTags: ["glow", "iridescent"],
	useCaseTags: ["marketing"],
	codeAvailability: "none",
	analysis: {
		why: "The hero background is a WebGL plane whose control points drift on noise, blending a few brand colours. It never loops visibly, so the page feels alive without moving anything the eye tracks.",
		whenToUse: "A marketing hero that needs colour and life without imagery.",
		watch:
			"A full-bleed WebGL loop costs battery: pause it off-screen and under reduced motion, and keep text contrast over every colour.",
		clues: ["WebGL plane", "noise-driven control points", "four-colour blend"],
	},
	components: [],
};

export default entry;
