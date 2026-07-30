import { render, cleanup } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect } from "vitest";
import EditorialEngine from "./EditorialEngine.svelte";

// The real engine measures text via @chenglou/pretext, which needs a canvas
// 2d context or OffscreenCanvas — neither exists under jsdom
// (HTMLCanvasElement.prototype.getContext is mocked to return null in
// src/test-setup.ts). Stubbing `document.fonts.ready` with a promise that
// never resolves keeps the component pinned on its pre-engine fallback
// branch (the only branch that's meaningfully testable under jsdom) instead
// of letting the effect's `.then()` handler call into pretext and throw.
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
		const { container } = render(EditorialEngine);
		expect(container.querySelector(".ee-stage")).toBeTruthy();
	});

	it("applies custom class names to the stage", () => {
		const { container } = render(EditorialEngine, { props: { class: "my-stage" } });
		const stage = container.querySelector(".ee-stage") as HTMLElement;
		expect(stage.className).toContain("my-stage");
	});

	it("sets the font-family style from the fontFamily prop", () => {
		const { container } = render(EditorialEngine, { props: { fontFamily: "Georgia, serif" } });
		const stage = container.querySelector(".ee-stage") as HTMLElement;
		expect(stage.style.fontFamily).toContain("Georgia");
	});

	it("renders the pre-engine fallback with the headline and body before the engine is ready", () => {
		const { container } = render(EditorialEngine, {
			props: { headline: "HELLO WORLD", body: "Some body copy." },
		});
		const fallback = container.querySelector(".ee-fallback");
		expect(fallback).toBeTruthy();
		expect(fallback?.querySelector("h2")?.textContent).toBe("HELLO WORLD");
		expect(fallback?.querySelector("p")?.textContent).toBe("Some body copy.");
	});

	it("does not carry the ready class while pretext has not measured yet", () => {
		const { container } = render(EditorialEngine);
		const stage = container.querySelector(".ee-stage") as HTMLElement;
		expect(stage.classList.contains("ready")).toBe(false);
	});

	it("unmounts cleanly", () => {
		const { container, unmount } = render(EditorialEngine);
		expect(() => unmount()).not.toThrow();
		expect(container.querySelector(".ee-stage")).toBeFalsy();
	});
});
