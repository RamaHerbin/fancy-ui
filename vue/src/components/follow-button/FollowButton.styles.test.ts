import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileStyle, parse } from "vue/compiler-sfc";
import { describe, expect, it } from "vitest";

/**
 * The unfollow preview lives in CSS, so a unit test that only finds the preview
 * node in the DOM cannot tell whether it ever shows. This compiles the real
 * `<style scoped>` block, the way the bundler does, and asserts on the output.
 */
// Vitest runs from the vue/ package root; jsdom makes import.meta.url a non-file URL.
const sfcPath = resolve(process.cwd(), "src/components/follow-button/FollowButton.vue");
const source = readFileSync(sfcPath, "utf8");

function compiled(): string {
	const { descriptor } = parse(source, { filename: sfcPath });
	const style = descriptor.styles.find((s) => s.scoped);
	expect(style, "FollowButton.vue has a <style scoped> block").toBeTruthy();
	const result = compileStyle({
		source: style!.content,
		filename: sfcPath,
		id: "data-v-followtest",
		scoped: true,
	});
	expect(result.errors).toEqual([]);
	return result.code;
}

/** The rules inside the fine-pointer media block, flattened to `selector => body`. */
function hoverRules(css: string): Map<string, string> {
	const start = css.indexOf("@media (hover: hover) and (pointer: fine)");
	expect(start).toBeGreaterThanOrEqual(0);
	let depth = 0;
	let end = start;
	for (let i = css.indexOf("{", start); i < css.length; i++) {
		if (css[i] === "{") depth++;
		if (css[i] === "}") depth--;
		if (depth === 0) {
			end = i;
			break;
		}
	}
	const block = css.slice(css.indexOf("{", start) + 1, end);
	const rules = new Map<string, string>();
	for (const m of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		rules.set(m[1]!.replace(/\s+/g, " ").trim(), m[2]!.replace(/\s+/g, " ").trim());
	}
	return rules;
}

describe("FollowButton compiled styles", () => {
	it("scopes the unfollow preview rules to the tail, so they reach the preview and the rest layer", () => {
		const rules = hoverRules(compiled());
		const selectors = [...rules.keys()];

		const hideRest = selectors.find(
			(s) =>
				s.includes(".ft-follow__live[data-preview]") &&
				s.includes("> .ft-follow__rest[data-v-followtest]")
		);
		const showPreview = selectors.find(
			(s) =>
				s.includes(".ft-follow__live[data-preview]") &&
				s.includes("> .ft-follow__preview[data-v-followtest]")
		);
		expect(hideRest, `rest rule in: ${selectors.join(" | ")}`).toBeTruthy();
		expect(showPreview, `preview rule in: ${selectors.join(" | ")}`).toBeTruthy();
		expect(rules.get(hideRest!)).toContain("visibility: hidden");
		expect(rules.get(showPreview!)).toContain("visibility: visible");
	});

	it("keeps the hover and focus-visible trigger on the button", () => {
		const css = compiled();
		expect(css).toMatch(
			/\.ft-follow:is\(:hover, :focus-visible\) \.ft-follow__live\[data-preview\]/
		);
	});

	it("never emits an unscoped visibility rule for the bare button", () => {
		const rules = hoverRules(compiled());
		for (const [selector, body] of rules) {
			if (!/visibility/.test(body)) continue;
			expect(selector, "a visibility rule must target the rest or preview layer").toMatch(
				/__(rest|preview)\[data-v-followtest\]$/
			);
		}
	});
});
