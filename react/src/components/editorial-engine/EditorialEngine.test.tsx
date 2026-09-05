import { render, cleanup, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { EditorialEngine } from "./EditorialEngine.js";

// The real engine measures text against a canvas 2d context or
// OffscreenCanvas — neither exists under jsdom
// (HTMLCanvasElement.prototype.getContext is stubbed to return null in
// src/test-setup.ts). Stubbing `document.fonts.ready` with a promise that
// never resolves keeps the component pinned on its pre-engine fallback
// branch (the only branch that's meaningfully testable under jsdom) instead
// of letting the effect's `.then()` handler call into the layout library and
// throw.
function stubNeverReadyFonts() {
	Object.defineProperty(document, "fonts", {
		configurable: true,
		writable: true,
		value: { ready: new Promise<void>(() => {}) },
	});
}

describe("EditorialEngine", () => {
	beforeEach(stubNeverReadyFonts);
	afterEach(cleanup);

	it("mounts and renders the stage without throwing", () => {
		const { container } = render(<EditorialEngine />);
		expect(container.querySelector(".ee-stage")).toBeTruthy();
	});

	it("applies custom class names to the stage", () => {
		const { container } = render(<EditorialEngine className="my-stage" />);
		const stage = container.querySelector(".ee-stage") as HTMLElement;
		expect(stage.className).toContain("my-stage");
	});

	it("sets the font-family style from the fontFamily prop", () => {
		const { container } = render(<EditorialEngine fontFamily="Georgia, serif" />);
		const stage = container.querySelector(".ee-stage") as HTMLElement;
		expect(stage.style.fontFamily).toContain("Georgia");
	});

	it("renders the pre-engine fallback with the headline and body before the engine is ready", () => {
		const { container } = render(<EditorialEngine headline="HELLO WORLD" body="Some body copy." />);
		const fallback = container.querySelector(".ee-fallback");
		expect(fallback).toBeTruthy();
		expect(fallback?.querySelector("h2")?.textContent).toBe("HELLO WORLD");
		expect(fallback?.querySelector("p")?.textContent).toBe("Some body copy.");
	});

	it("does not carry the ready class while the text has not been measured yet", () => {
		const { container } = render(<EditorialEngine />);
		const stage = container.querySelector(".ee-stage") as HTMLElement;
		expect(stage.classList.contains("ready")).toBe(false);
	});

	it("hides the positioned-line layer from assistive tech", () => {
		const { container } = render(<EditorialEngine />);
		const layer = container.querySelector(".ee-layer");
		expect(layer).toBeTruthy();
		expect(layer?.getAttribute("aria-hidden")).toBe("true");
	});

	it("unmounts cleanly", () => {
		const { container, unmount } = render(<EditorialEngine />);
		expect(() => unmount()).not.toThrow();
		expect(container.querySelector(".ee-stage")).toBeFalsy();
	});
});

/**
 * Booted-engine tests. The layout library measures against a canvas 2d
 * context, which jsdom does not implement, so a metrics-only fake stands in:
 * `measureText` is the single method the library calls, and the stage is given
 * a non-zero box (jsdom reports 0×0 for every element). With those two stubs
 * the real engine runs end to end, which is what lets these tests assert on
 * the markup it writes into the stage.
 */
describe("EditorialEngine (engine booted)", () => {
	let getContextSpy: { mockRestore: () => void };

	beforeEach(() => {
		Object.defineProperty(document, "fonts", {
			configurable: true,
			writable: true,
			value: { ready: Promise.resolve() },
		});
		const metricsOnlyContext = {
			font: "",
			measureText: (text: string) => ({ width: text.length * 7 }),
		};
		const spy = vi.spyOn(HTMLCanvasElement.prototype, "getContext");
		// `getContext` is overloaded across every context type, so the fake is
		// handed over untyped rather than picking one of those signatures.
		spy.mockReturnValue(metricsOnlyContext as never);
		getContextSpy = spy;
		Object.defineProperty(HTMLElement.prototype, "clientWidth", {
			configurable: true,
			get: () => 900,
		});
		Object.defineProperty(HTMLElement.prototype, "clientHeight", {
			configurable: true,
			get: () => 600,
		});
	});

	afterEach(() => {
		cleanup();
		getContextSpy.mockRestore();
		Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
		Reflect.deleteProperty(HTMLElement.prototype, "clientHeight");
	});

	async function renderReady(props: Parameters<typeof EditorialEngine>[0] = {}) {
		const utils = render(<EditorialEngine {...props} />);
		await act(async () => {
			await Promise.resolve();
		});
		const stage = utils.container.querySelector(".ee-stage") as HTMLElement;
		expect(stage.classList.contains("ready")).toBe(true);
		return { ...utils, stage };
	}

	it("keeps the headline heading and the body paragraph once the engine is ready", async () => {
		const { stage, getByRole, getByText } = await renderReady({
			headline: "HELLO WORLD",
			body: "Some body copy.",
		});

		// Document semantics survive the boot: still a heading, still a
		// paragraph — only visually hidden.
		expect(getByRole("heading", { name: "HELLO WORLD" })).toBeTruthy();
		expect(getByText("Some body copy.").tagName).toBe("P");
		expect(stage.querySelector(".ee-fallback")?.classList).toContain("ee-sr-only");
	});

	it("hides the semantic copy visually, not from assistive technology", async () => {
		const { stage } = await renderReady();
		const fallback = stage.querySelector(".ee-fallback") as HTMLElement;
		expect(fallback.className).toContain("ee-sr-only");
		expect(fallback.style.display).not.toBe("none");
	});

	it("marks every element the engine paints aria-hidden so the article is announced once", async () => {
		const { stage } = await renderReady({ headline: "HELLO WORLD", body: "Some body copy." });
		const painted = stage.querySelectorAll(
			".ee-line, .ee-headline-line, .ee-pullquote-line, .ee-pullquote-box, .ee-orb, .ee-drop-cap"
		);
		expect(painted.length).toBeGreaterThan(0);
		for (const element of painted) {
			expect(element.getAttribute("aria-hidden")).toBe("true");
		}
	});

	it("keeps the semantic copy when a text prop re-creates the engine", async () => {
		const { stage, rerender } = await renderReady({ headline: "FIRST", body: "Body copy." });
		await act(async () => {
			rerender(<EditorialEngine headline="SECOND" body="Body copy." />);
			await Promise.resolve();
		});
		const fallback = stage.querySelector(".ee-fallback") as HTMLElement;
		expect(fallback).toBeTruthy();
		expect(fallback.querySelector("h2")?.textContent).toBe("SECOND");
	});
});
