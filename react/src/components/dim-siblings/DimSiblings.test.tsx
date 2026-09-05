import { cleanup, render } from "@testing-library/react";
import { createRef, type CSSProperties } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { DimSiblings } from "./DimSiblings.js";
import { DimSiblingsHarness } from "./DimSiblingsHarness.js";

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

function threeLinks() {
	return (
		<span>
			<a href="#a">One</a>
			<a href="#b">Two</a>
			<a href="#c">Three</a>
		</span>
	);
}

function root(): HTMLElement {
	return document.querySelector(".ft-dimsiblings") as HTMLElement;
}

afterEach(cleanup);

describe("DimSiblings — structure", () => {
	it("renders a div by default, with the children inside", () => {
		render(<DimSiblings>{threeLinks()}</DimSiblings>);
		const el = root();
		expect(el.tagName).toBe("DIV");
		expect(el.querySelectorAll("a")).toHaveLength(3);
	});

	it("renders real sibling children as actual direct children of the root", () => {
		render(<DimSiblingsHarness />);
		const el = root();
		expect(el.children).toHaveLength(3);
		expect(Array.from(el.children).every((child) => child.tagName === "A")).toBe(true);
	});

	it("renders the tag requested by `as` (ul, for a list of cards)", () => {
		render(<DimSiblings as="ul">{threeLinks()}</DimSiblings>);
		expect(root().tagName).toBe("UL");
	});

	it("sets data-effect from the effect prop, defaulting to dim", () => {
		render(<DimSiblings>{threeLinks()}</DimSiblings>);
		expect(root()).toHaveAttribute("data-effect", "dim");
	});

	it.each(["dim", "blur", "both"] as const)("reflects effect=%s in data-effect", (effect) => {
		render(<DimSiblings effect={effect}>{threeLinks()}</DimSiblings>);
		expect(root()).toHaveAttribute("data-effect", effect);
	});

	it("keeps its own data-effect when a caller forwards one", () => {
		// `data-effect` is not decoration, it is the switch every rule in the
		// stylesheet is keyed on. The Svelte source writes it after the rest
		// props spread so the component always wins; a forwarded one landing
		// last here would silently move the group onto the blur branch.
		render(
			<DimSiblings effect="dim" data-effect="both">
				{threeLinks()}
			</DimSiblings>
		);
		expect(root()).toHaveAttribute("data-effect", "dim");
	});
});

describe("DimSiblings — CSS custom properties", () => {
	it("omits the opacity/duration vars at their defaults, but always writes blur", () => {
		render(<DimSiblings>{threeLinks()}</DimSiblings>);
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
		render(
			<DimSiblings effect="blur" blur={6}>
				{threeLinks()}
			</DimSiblings>
		);
		expect(root().style.getPropertyValue("--ft-dimsiblings-blur")).toBe("6px");
	});

	it("also applies blur for effect=both", () => {
		render(
			<DimSiblings effect="both" blur={4}>
				{threeLinks()}
			</DimSiblings>
		);
		expect(root().style.getPropertyValue("--ft-dimsiblings-blur")).toBe("4px");
	});

	it("ignores a custom blur value when effect=dim — no prop can turn blur on without effect saying so", () => {
		render(
			<DimSiblings effect="dim" blur={20}>
				{threeLinks()}
			</DimSiblings>
		);
		expect(root().style.getPropertyValue("--ft-dimsiblings-blur")).toBe("0px");
	});

	it("writes the opacity/duration vars inline when they differ from the default", () => {
		render(
			<DimSiblings opacity={0.6} duration={250}>
				{threeLinks()}
			</DimSiblings>
		);
		const style = root().style;
		expect(style.getPropertyValue("--ft-dimsiblings-opacity")).toBe("0.6");
		expect(style.getPropertyValue("--ft-dimsiblings-duration")).toBe("250ms");
	});

	it("keeps a caller-supplied style alongside the (always-present) blur var", () => {
		render(<DimSiblings style={{ marginBlock: "2rem" }}>{threeLinks()}</DimSiblings>);
		const style = root().style;
		expect(style.getPropertyValue("margin-block")).toBe("2rem");
		expect(style.getPropertyValue("--ft-dimsiblings-blur")).toBe("0px");
	});

	it("does not let a caller-supplied style set the vars the component owns", () => {
		// Svelte's `style:` directives reserve their property names against
		// the spread's style string even where the directive resolves to
		// nothing, so `opacity` at its default means the var is absent — not
		// "whatever the caller wrote". Unrelated declarations still ride along.
		render(
			<DimSiblings style={{ marginBlock: "2rem", "--ft-dimsiblings-opacity": 0.9 } as CSSProperties}>
				{threeLinks()}
			</DimSiblings>
		);
		const style = root().style;
		expect(style.getPropertyValue("--ft-dimsiblings-opacity")).toBe("");
		expect(style.getPropertyValue("margin-block")).toBe("2rem");
	});

	it("still wins over a caller-supplied var when the prop is off its default", () => {
		render(
			<DimSiblings
				opacity={0.6}
				style={{ "--ft-dimsiblings-opacity": 0.9 } as CSSProperties}
			>
				{threeLinks()}
			</DimSiblings>
		);
		expect(root().style.getPropertyValue("--ft-dimsiblings-opacity")).toBe("0.6");
	});
});

describe("DimSiblings — wiring", () => {
	it("binds ref to the root element", () => {
		const ref = createRef<HTMLElement>();
		render(<DimSiblings ref={ref}>{threeLinks()}</DimSiblings>);
		expect(ref.current).toBe(root());
	});

	it("merges a caller class and spreads restProps onto the root", () => {
		render(
			<DimSiblings className="footer-links" data-testid="dim-group">
				{threeLinks()}
			</DimSiblings>
		);
		expect(root()).toHaveClass("ft-dimsiblings", "footer-links");
		expect(root()).toHaveAttribute("data-testid", "dim-group");
	});
});
