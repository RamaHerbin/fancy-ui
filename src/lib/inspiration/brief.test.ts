import { describe, expect, it } from "vitest";
import { buildBrief } from "./brief.js";
import type { FrameworkVariant } from "$lib/server/variants.js";
import type { ExternalReference, FancyUIReference } from "./types.js";

const base = {
	kind: "interaction",
	creator: "FancyUI",
	addedAt: "2026-09-26",
	verifiedAt: "2026-10-03",
	status: "published",
	interactionTags: ["hover"],
	styleTags: ["glow"],
	useCaseTags: ["marketing"],
	codeAvailability: "open-source",
	analysis: {
		why: "It leans toward the cursor.",
		whenToUse: "One primary action.",
		watch: "No hover on touch.",
		clues: ["pointer distance → translate", "spring return"],
	},
} as const;

const fancy: FancyUIReference = {
	...base,
	interactionTags: [...base.interactionTags],
	styleTags: [...base.styleTags],
	useCaseTags: [...base.useCaseTags],
	analysis: { ...base.analysis, clues: [...base.analysis.clues] },
	id: "magnetic-button",
	slug: "magnetic-button",
	origin: "fancyui",
	title: "Button — magnetic pull",
	summary: "A button that leans toward the pointer.",
	sourceUrl: "/docs/components/magnetic-button",
	components: [{ slug: "magnetic-button", relation: "exact" }],
	demo: { module: "magnetic-button" },
};

function variant(framework: FrameworkVariant["framework"], over: Partial<FrameworkVariant> = {}) {
	return {
		framework,
		package: `fancy-ui-${framework}`,
		exports: ["MagneticButton"],
		importLine: `import { MagneticButton } from "fancy-ui-${framework}";`,
		installLine: `pnpm add fancy-ui-${framework}`,
		docsUrl: "/docs/components/magnetic-button",
		sourceUrl: "https://example.test/src",
		packageUrl: "https://example.test/pkg",
		availability: "available",
		note: null,
		...over,
	} satisfies FrameworkVariant;
}

const variants = {
	"magnetic-button": [
		variant("svelte"),
		variant("react"),
		variant("vue", {
			installLine: null,
			availability: "source-only",
			note: "fancy-ui-vue is not on npm yet — the port lives in the repository.",
		}),
	],
};

describe("buildBrief", () => {
	it("carries the title, the absolute reference URL, the analysis and the clues", () => {
		const text = buildBrief(fancy, "svelte", variants);
		expect(text.split("\n")[0]).toBe("Button — magnetic pull");
		expect(text).toContain("Reference: https://fancy-ui.rama.app/inspiration/magnetic-button");
		expect(text).toContain("Pattern: Interaction · Hover · Glow");
		expect(text).toContain("It leans toward the cursor.");
		expect(text).toContain("One primary action.");
		expect(text).toContain("No hover on touch.");
		expect(text).toContain("- spring return");
		expect(text).toMatch(/original adaptation/);
	});

	it("prints the chosen framework's lines only", () => {
		const text = buildBrief(fancy, "react", variants);
		expect(text).toContain("FancyUI components (React)");
		expect(text).toContain("Install: pnpm add fancy-ui-react");
		expect(text).toContain('Import: import { MagneticButton } from "fancy-ui-react";');
		expect(text).not.toContain("fancy-ui-svelte");
	});

	it("prints the note instead of an install line for a source-only port", () => {
		const text = buildBrief(fancy, "vue", variants);
		expect(text).not.toContain("Install:");
		expect(text).toContain("Note: fancy-ui-vue is not on npm yet");
	});

	it("omits absent fields and the components block when nothing is verified", () => {
		const external: ExternalReference = {
			...fancy,
			demo: undefined,
			origin: "external",
			codeAvailability: "unknown",
			sourceUrl: "https://example.test/ref",
			product: undefined,
			analysis: { ...fancy.analysis, clues: [] },
			components: [{ slug: "nothing-here", relation: "related", note: "Close." }],
		};
		const text = buildBrief(external, "svelte", {});
		expect(text).toContain("Source: https://example.test/ref");
		expect(text).not.toContain("Code of the reference");
		expect(text).not.toContain("Implementation clues");
		expect(text).not.toContain("FancyUI components");
		expect(text).not.toContain("undefined");
	});
});
