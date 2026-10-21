/**
 * Focus: the word blur and the sliding frame used to carry an inline
 * `transition: ... {animationDuration}s`, which cannot be media-gated. The
 * duration now travels as `--focus-duration` and is only spent inside
 * `@media (prefers-reduced-motion: no-preference)`, so under `reduce` the
 * frame and the blur snap to their new state instead of animating.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../../../..");

const COMPONENTS = [
	"src/lib/fancy-ui/focus/Focus.svelte",
	"react/src/components/focus/Focus.tsx",
	"vue/src/components/focus/Focus.vue",
];
const STYLES = [
	"src/lib/fancy-ui/focus/Focus.svelte",
	"react/src/components/focus/focus.css",
	"vue/src/components/focus/Focus.vue",
];

describe("reduced motion snap: focus frame and word blur", () => {
	for (const file of COMPONENTS) {
		it(`${file} sets the duration as a variable, never as an inline transition`, () => {
			const src = readFileSync(resolve(ROOT, file), "utf8");
			expect(src).not.toMatch(/transition: ?(?:`)?(?:filter|all) ?\$?\{/);
			expect(src).toContain("--focus-duration");
		});
	}
	for (const file of STYLES) {
		it(`${file} spends the duration only under no-preference`, () => {
			const src = readFileSync(resolve(ROOT, file), "utf8");
			const at = src.indexOf("@media (prefers-reduced-motion: no-preference)");
			expect(at).toBeGreaterThan(-1);
			expect(src.slice(at)).toContain("var(--focus-duration");
			expect(src.slice(0, at)).not.toContain("var(--focus-duration");
		});
	}
});
