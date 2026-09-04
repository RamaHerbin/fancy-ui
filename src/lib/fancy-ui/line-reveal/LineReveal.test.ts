import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import LineReveal from "./LineReveal.svelte";

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
	afterEach(() => {
		cleanup();
		MockIntersectionObserver.instances = [];
	});

	it("mounts and renders the root wrapper", () => {
		const { container } = render(LineReveal, { props: { text: "Hello there" } });
		const root = container.firstElementChild as HTMLElement;
		expect(root.className).toContain("relative");
		expect(root.className).toContain("w-full");
	});

	it("applies custom class names", () => {
		const { container } = render(LineReveal, {
			props: { text: "Hello", class: "my-reveal" },
		});
		const root = container.firstElementChild as HTMLElement;
		expect(root.className).toContain("my-reveal");
	});

	it("keeps the full text available to screen readers via a sr-only span", () => {
		const { container } = render(LineReveal, { props: { text: "Accessible copy" } });
		const srOnly = container.querySelector(".sr-only");
		expect(srOnly?.textContent).toBe("Accessible copy");
	});

	it("renders the pre-measure fallback (hidden text) before pretext has measured", () => {
		const { container } = render(LineReveal, { props: { text: "Falls back" } });
		const fallback = container.querySelector('[aria-hidden="true"]') as HTMLElement;
		expect(fallback).toBeTruthy();
		expect(fallback.textContent).toBe("Falls back");
		expect(fallback.style.visibility).toBe("hidden");
	});

	it("sets the font style from the font prop", () => {
		const { container } = render(LineReveal, {
			props: { text: "Styled", font: "700 24px Georgia, serif" },
		});
		const root = container.firstElementChild as HTMLElement;
		expect(root.getAttribute("style") ?? "").toContain("24px");
	});

	it("observes the container element for intersection", () => {
		render(LineReveal, { props: { text: "Watch me" } });
		const lastInstance = MockIntersectionObserver.instances.at(-1);
		expect(lastInstance?.observe).toHaveBeenCalled();
	});

	it("unmounts cleanly", () => {
		const { unmount } = render(LineReveal, { props: { text: "Bye" } });
		expect(() => unmount()).not.toThrow();
	});

	it("does not throw when document.fonts is unavailable (e.g. jsdom)", () => {
		const originalFonts = document.fonts;
		// @ts-expect-error -- simulate an environment without FontFaceSet
		delete document.fonts;

		try {
			expect(() =>
				render(LineReveal, { props: { text: "No FontFaceSet" } })
			).not.toThrow();

			const container = document.body;
			const fallback = container.querySelector('[aria-hidden="true"]') as HTMLElement;
			expect(fallback).toBeTruthy();
			expect(fallback.style.visibility).toBe("hidden");
		} finally {
			Object.defineProperty(document, "fonts", {
				configurable: true,
				writable: true,
				value: originalFonts,
			});
		}
	});
});
