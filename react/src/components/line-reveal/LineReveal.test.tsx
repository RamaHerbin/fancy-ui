import { render, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { LineReveal } from "./LineReveal.js";

// pretext's prepareWithSegments() needs a canvas 2d context or OffscreenCanvas
// for text measurement — neither exists under jsdom (getContext is mocked to
// return null in src/test-setup.ts). Stubbing document.fonts.load() with a
// promise that never resolves keeps the component on its pre-measurement
// fallback branch instead of letting the effect's `.then()` handler call
// into pretext and throw "Text measurement requires OffscreenCanvas or a DOM
// canvas context."
function stubNeverLoadingFonts() {
	Object.defineProperty(document, "fonts", {
		configurable: true,
		writable: true,
		value: { load: () => new Promise<FontFace[]>(() => {}) },
	});
}

class MockIntersectionObserver {
	callback: IntersectionObserverCallback;
	static instances: MockIntersectionObserver[] = [];

	constructor(callback: IntersectionObserverCallback) {
		this.callback = callback;
		MockIntersectionObserver.instances.push(this);
	}

	observe = vi.fn();
	disconnect = vi.fn();
	unobserve = vi.fn();
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

describe("LineReveal", () => {
	beforeEach(stubNeverLoadingFonts);
	afterEach(() => {
		cleanup();
		MockIntersectionObserver.instances = [];
	});

	it("mounts and renders the root wrapper", () => {
		const { container } = render(<LineReveal text="Hello there" />);
		const root = container.firstElementChild as HTMLElement;
		expect(root.className).toContain("relative");
		expect(root.className).toContain("w-full");
	});

	it("applies custom class names", () => {
		const { container } = render(<LineReveal text="Hello" className="my-reveal" />);
		const root = container.firstElementChild as HTMLElement;
		expect(root.className).toContain("my-reveal");
	});

	it("keeps the full text available to screen readers via a sr-only span", () => {
		const { container } = render(<LineReveal text="Accessible copy" />);
		const srOnly = container.querySelector(".sr-only");
		expect(srOnly?.textContent).toBe("Accessible copy");
	});

	it("renders the pre-measure fallback (hidden text) before pretext has measured", () => {
		const { container } = render(<LineReveal text="Falls back" />);
		const fallback = container.querySelector('[aria-hidden="true"]') as HTMLElement;
		expect(fallback).toBeTruthy();
		expect(fallback.textContent).toBe("Falls back");
		expect(fallback.style.visibility).toBe("hidden");
	});

	it("sets the font style from the font prop", () => {
		const { container } = render(<LineReveal text="Styled" font="700 24px Georgia, serif" />);
		const root = container.firstElementChild as HTMLElement;
		expect(root.getAttribute("style") ?? "").toContain("24px");
	});

	it("observes the container element for intersection", () => {
		render(<LineReveal text="Watch me" />);
		const lastInstance = MockIntersectionObserver.instances.at(-1);
		expect(lastInstance?.observe).toHaveBeenCalled();
	});

	it("unmounts cleanly", () => {
		const { unmount } = render(<LineReveal text="Bye" />);
		expect(() => unmount()).not.toThrow();
	});
});
