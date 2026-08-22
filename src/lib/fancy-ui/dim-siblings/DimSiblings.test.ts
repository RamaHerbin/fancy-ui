import { render, cleanup } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect } from "vitest";
import DimSiblings from "./DimSiblings.svelte";
import Harness from "./DimSiblingsHarness.test.svelte";

/**
 * DimSiblings is zero-JS: every actual dim/blur/focus behaviour comes from a
 * `:has()` stylesheet, which jsdom does not apply (jsdom has no CSS layout
 * engine — `getComputedStyle` reflects inline styles and a minimal UA sheet
 * only, never an external or `<style>`-block rule). That is a jsdom
 * limitation, not something a polyfill works around, so per the frozen
 * contract (04-api-contracts.md §11) this file is structural only: the
 * right element, the right data attribute, the right CSS custom properties,
 * the children actually rendered. Real hover/focus-visible/`(hover: hover)`
 * behaviour is confirmed in the manual browser matrix instead.
 */

// `createRawSnippet` can only return HTML for a single root element — most
// assertions here don't care whether the anchors are nested one level deep,
// so this single-element wrapper is enough to exercise props/data/vars.
function threeLinksSnippet() {
	return createRawSnippet(() => ({
		render: () => `<span><a href="#a">One</a><a href="#b">Two</a><a href="#c">Three</a></span>`,
	}));
}

function root(): HTMLElement {
	return document.querySelector(".ft-dimsiblings") as HTMLElement;
}

afterEach(cleanup);

describe("DimSiblings — structure", () => {
	it("renders a div by default, with the children inside", () => {
		render(DimSiblings, { props: { children: threeLinksSnippet() } });
		const el = root();
		expect(el.tagName).toBe("DIV");
		expect(el.querySelectorAll("a")).toHaveLength(3);
	});

	it("renders real sibling children as actual direct children of the root", () => {
		render(Harness);
		const el = root();
		expect(el.children).toHaveLength(3);
		expect(Array.from(el.children).every((child) => child.tagName === "A")).toBe(true);
	});

	it("renders the tag requested by `as` (ul, for a list of cards)", () => {
		render(DimSiblings, { props: { children: threeLinksSnippet(), as: "ul" } });
		expect(root().tagName).toBe("UL");
	});

	it("sets data-effect from the effect prop, defaulting to dim", () => {
		render(DimSiblings, { props: { children: threeLinksSnippet() } });
		expect(root()).toHaveAttribute("data-effect", "dim");
	});

	it.each(["dim", "blur", "both"] as const)("reflects effect=%s in data-effect", (effect) => {
		render(DimSiblings, { props: { children: threeLinksSnippet(), effect } });
		expect(root()).toHaveAttribute("data-effect", effect);
	});
});

describe("DimSiblings — CSS custom properties", () => {
	it("omits the opacity/duration vars at their defaults, but always writes blur", () => {
		render(DimSiblings, { props: { children: threeLinksSnippet() } });
		const style = root().style;
		// Absent, not merely equal to the default: an inline declaration would
		// beat any stylesheet rule trying to override the same var, so at the
		// default value nothing is written at all.
		expect(style.getPropertyValue("--ft-dimsiblings-opacity")).toBe("");
		expect(style.getPropertyValue("--ft-dimsiblings-duration")).toBe("");
		// Blur is the one exception — it's derived state (`effect ∧ blur`), and
		// omitting it at 0px would let a themer's global fallback leak blur
		// into effect="dim".
		expect(style.getPropertyValue("--ft-dimsiblings-blur")).toBe("0px");
	});

	it("carries the blur prop through to the CSS var when effect includes blur", () => {
		render(DimSiblings, {
			props: { children: threeLinksSnippet(), effect: "blur", blur: 6 },
		});
		expect(root().style.getPropertyValue("--ft-dimsiblings-blur")).toBe("6px");
	});

	it("also applies blur for effect=both", () => {
		render(DimSiblings, {
			props: { children: threeLinksSnippet(), effect: "both", blur: 4 },
		});
		expect(root().style.getPropertyValue("--ft-dimsiblings-blur")).toBe("4px");
	});

	it("ignores a custom blur value when effect=dim — no prop can turn blur on without effect saying so", () => {
		render(DimSiblings, {
			props: { children: threeLinksSnippet(), effect: "dim", blur: 20 },
		});
		expect(root().style.getPropertyValue("--ft-dimsiblings-blur")).toBe("0px");
	});

	it("writes the opacity/duration vars inline when they differ from the default", () => {
		render(DimSiblings, {
			props: { children: threeLinksSnippet(), opacity: 0.6, duration: 250 },
		});
		const style = root().style;
		expect(style.getPropertyValue("--ft-dimsiblings-opacity")).toBe("0.6");
		expect(style.getPropertyValue("--ft-dimsiblings-duration")).toBe("250ms");
	});

	it("keeps a caller-supplied style alongside the (always-present) blur var", () => {
		render(DimSiblings, {
			props: { children: threeLinksSnippet(), style: "margin-block: 2rem" },
		});
		const style = root().style;
		expect(style.getPropertyValue("margin-block")).toBe("2rem");
		expect(style.getPropertyValue("--ft-dimsiblings-blur")).toBe("0px");
	});
});

describe("DimSiblings — wiring", () => {
	it("binds ref to the root element", () => {
		let ref: HTMLElement | null = null;
		render(DimSiblings, {
			props: {
				children: threeLinksSnippet(),
				get ref() {
					return ref;
				},
				set ref(value: HTMLElement | null) {
					ref = value;
				},
			},
		});
		expect(ref).toBe(root());
	});

	it("merges a caller class and spreads restProps onto the root", () => {
		render(DimSiblings, {
			props: { children: threeLinksSnippet(), class: "footer-links", "data-testid": "dim-group" },
		});
		expect(root()).toHaveClass("ft-dimsiblings", "footer-links");
		expect(root()).toHaveAttribute("data-testid", "dim-group");
	});
});
