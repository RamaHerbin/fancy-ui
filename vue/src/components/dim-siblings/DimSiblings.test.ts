import { cleanup, render } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";

import DimSiblings from "./DimSiblings.vue";

/**
 * DimSiblings is zero-JS: every actual dim/blur/focus behaviour comes from a
 * `:has()` stylesheet, which jsdom does not apply (jsdom has no CSS layout
 * engine — `getComputedStyle` reflects inline styles and a minimal UA sheet
 * only, never an external or `<style>`-block rule). That is a jsdom
 * limitation, not something a polyfill works around, so per the frozen
 * contract this file is structural only: the right element, the right data
 * attribute, the right CSS custom properties, the children actually
 * rendered. Real hover/focus-visible/`(hover: hover)` behaviour is confirmed
 * in the manual browser matrix instead.
 */

// Template markup with several top-level children still needs to land as
// direct children of the rendered root — the single-root slot helper below
// can't exercise that, so this inline harness renders three real <a>
// siblings. The source's colocated `.test.svelte` rig is inlined here rather
// than ported as a second file.
const Harness = defineComponent({
	name: "DimSiblingsHarness",
	setup() {
		return () =>
			h(DimSiblings, null, {
				default: () => [
					h("a", { href: "#a" }, "One"),
					h("a", { href: "#b" }, "Two"),
					h("a", { href: "#c" }, "Three"),
				],
			});
	},
});

function threeLinksSlot() {
	return {
		default: () =>
			h("span", null, [
				h("a", { href: "#a" }, "One"),
				h("a", { href: "#b" }, "Two"),
				h("a", { href: "#c" }, "Three"),
			]),
	};
}

function root(): HTMLElement {
	return document.querySelector(".ft-dimsiblings") as HTMLElement;
}

afterEach(cleanup);

describe("DimSiblings — structure", () => {
	it("renders a div by default, with the children inside", () => {
		render(DimSiblings, { slots: threeLinksSlot() });
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
		render(DimSiblings, { props: { as: "ul" }, slots: threeLinksSlot() });
		expect(root().tagName).toBe("UL");
	});

	it("sets data-effect from the effect prop, defaulting to dim", () => {
		render(DimSiblings, { slots: threeLinksSlot() });
		expect(root()).toHaveAttribute("data-effect", "dim");
	});

	it.each(["dim", "blur", "both"] as const)("reflects effect=%s in data-effect", (effect) => {
		render(DimSiblings, { props: { effect }, slots: threeLinksSlot() });
		expect(root()).toHaveAttribute("data-effect", effect);
	});
});

describe("DimSiblings — CSS custom properties", () => {
	it("omits the opacity/duration vars at their defaults, but always writes blur", () => {
		render(DimSiblings, { slots: threeLinksSlot() });
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
		render(DimSiblings, { props: { effect: "blur", blur: 6 }, slots: threeLinksSlot() });
		expect(root().style.getPropertyValue("--ft-dimsiblings-blur")).toBe("6px");
	});

	it("also applies blur for effect=both", () => {
		render(DimSiblings, { props: { effect: "both", blur: 4 }, slots: threeLinksSlot() });
		expect(root().style.getPropertyValue("--ft-dimsiblings-blur")).toBe("4px");
	});

	it("ignores a custom blur value when effect=dim — no prop can turn blur on without effect saying so", () => {
		render(DimSiblings, { props: { effect: "dim", blur: 20 }, slots: threeLinksSlot() });
		expect(root().style.getPropertyValue("--ft-dimsiblings-blur")).toBe("0px");
	});

	it("writes the opacity/duration vars inline when they differ from the default", () => {
		render(DimSiblings, { props: { opacity: 0.6, duration: 250 }, slots: threeLinksSlot() });
		const style = root().style;
		expect(style.getPropertyValue("--ft-dimsiblings-opacity")).toBe("0.6");
		expect(style.getPropertyValue("--ft-dimsiblings-duration")).toBe("250ms");
	});

	it("keeps a caller-supplied style alongside the (always-present) blur var", () => {
		render(DimSiblings, {
			attrs: { style: "margin-block: 2rem" },
			slots: threeLinksSlot(),
		});
		const style = root().style;
		expect(style.getPropertyValue("margin-block")).toBe("2rem");
		expect(style.getPropertyValue("--ft-dimsiblings-blur")).toBe("0px");
	});
});

describe("DimSiblings — wiring", () => {
	it("exposes ref pointing at the root element", () => {
		const wrapper = mount(DimSiblings, { slots: threeLinksSlot() });
		expect(wrapper.vm.ref).toBe(wrapper.element);
	});

	it("merges a caller class and spreads attrs onto the root", () => {
		render(DimSiblings, {
			props: { class: "footer-links" },
			attrs: { "data-testid": "dim-group" },
			slots: threeLinksSlot(),
		});
		expect(root()).toHaveClass("ft-dimsiblings", "footer-links");
		expect(root()).toHaveAttribute("data-testid", "dim-group");
	});
});
