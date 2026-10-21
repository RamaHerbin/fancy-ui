/**
 * Reduced-motion snap guard for the pointer-driven interaction components that
 * used to animate unconditionally. Under `prefers-reduced-motion: reduce` the
 * state change must still happen (tilt, spotlight, glow, focus frame) but
 * instantly: every `transform` / `opacity` / `filter` transition is declared
 * behind `motion-safe:` (Tailwind) or `@media (prefers-reduced-motion:
 * no-preference)` (CSS), with the resting state as the ungated fallback.
 *
 * jsdom cannot evaluate media queries, so the three framework sources are
 * checked directly; the JS-driven case (Focus) is also covered by a real
 * matchMedia-mocked render in each framework's own test file.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../../../..");

const SOURCES: Record<string, string[]> = {
	"card-3d": [
		"src/lib/fancy-ui/card-3d/CardContainer.svelte",
		"src/lib/fancy-ui/card-3d/CardItem.svelte",
		"react/src/components/card-3d/CardContainer.tsx",
		"react/src/components/card-3d/CardItem.tsx",
		"vue/src/components/card-3d/CardContainer.vue",
		"vue/src/components/card-3d/CardItem.vue",
	],
	"card-spotlight": [
		"src/lib/fancy-ui/card-spotlight/CardSpotlight.svelte",
		"react/src/components/card-spotlight/CardSpotlight.tsx",
		"vue/src/components/card-spotlight/CardSpotlight.vue",
	],
	"glowing-effect": [
		"src/lib/fancy-ui/glowing-effect/GlowingEffect.svelte",
		"react/src/components/glowing-effect/GlowingEffect.tsx",
		"vue/src/components/glowing-effect/GlowingEffect.vue",
	],
	"glare-card": [
		"src/lib/fancy-ui/glare-card/GlareCard.svelte",
		"react/src/components/glare-card/GlareCard.tsx",
		"vue/src/components/glare-card/GlareCard.vue",
	],
};

// A Tailwind transition utility not carried by the motion-safe variant.
const UNGATED_TRANSITION =
	/(?<!motion-safe:)(?<![\w-])transition(?:-(?:all|transform|opacity|filter))?(?![\w-])(?=[\s"'`\\])/g;

describe("reduced motion snap: Tailwind transitions are motion-safe", () => {
	for (const [name, files] of Object.entries(SOURCES)) {
		for (const file of files) {
			it(`${name}: ${file} has no ungated transition utility`, () => {
				const src = readFileSync(resolve(ROOT, file), "utf8");
				const classLines = src.split("\n").filter((l) => /transition/.test(l));
				const offenders = classLines.filter((l) => {
					// Svelte `transition:` directives and comments are not utilities.
					const stripped = l.replace(/transition:[a-z]+/g, "").replace(/\/\/.*$/, "");
					UNGATED_TRANSITION.lastIndex = 0;
					return UNGATED_TRANSITION.test(stripped);
				});
				expect(offenders).toEqual([]);
			});
		}
	}

	it("glare-card, card-3d, card-spotlight and glowing-effect still declare a motion-safe transition", () => {
		for (const files of Object.values(SOURCES)) {
			const joined = files.map((f) => readFileSync(resolve(ROOT, f), "utf8")).join("\n");
			expect(joined).toContain("motion-safe:transition");
		}
	});
});

describe("reduced motion snap: frosted-glass settle animation", () => {
	for (const file of [
		"src/lib/fancy-ui/frosted-glass/FrostedGlass.svelte",
		"react/src/components/frosted-glass/frosted-glass.css",
		"vue/src/components/frosted-glass/FrostedGlass.vue",
	]) {
		it(`${file} only runs the settle fade under no-preference`, () => {
			const src = readFileSync(resolve(ROOT, file), "utf8");
			const lines = src.split("\n");
			const idx = lines.findIndex((l) => /^\s*animation:\s*frosted-glass-settle/.test(l));
			expect(idx).toBeGreaterThan(-1);
			const before = lines.slice(0, idx).join("\n");
			expect(before.lastIndexOf("@media (prefers-reduced-motion: no-preference)")).toBeGreaterThan(
				before.lastIndexOf(".frosted-glass-filter {") - 400
			);
			// The rule that carries the animation must sit inside the media block.
			const mediaAt = before.lastIndexOf("@media (prefers-reduced-motion: no-preference)");
			expect(mediaAt).toBeGreaterThan(-1);
			const closedBetween = before.slice(mediaAt).split("}").length - 1;
			const openedBetween = before.slice(mediaAt).split("{").length - 1;
			expect(openedBetween - closedBetween).toBeGreaterThanOrEqual(2);
		});
	}
});
