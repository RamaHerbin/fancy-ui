import { render, cleanup, fireEvent } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import SmoothCursor from "./SmoothCursor.vue";

describe("SmoothCursor", () => {
	afterEach(cleanup);

	it("renders hidden (opacity-0) before any pointer movement", () => {
		const { container } = render(SmoothCursor);
		const cursor = container.firstElementChild as HTMLElement;
		expect(cursor.className).toContain("opacity-0");
		expect(cursor.className).not.toContain("opacity-100");
	});

	it("applies custom class names", () => {
		const { container } = render(SmoothCursor, { props: { class: "my-cursor" } });
		const cursor = container.firstElementChild as HTMLElement;
		expect(cursor.className).toContain("my-cursor");
	});

	it("renders the default arrow svg when no cursor slot is provided", () => {
		const { container } = render(SmoothCursor);
		expect(container.querySelector("svg")).toBeTruthy();
	});

	it("hides the decorative cursor layer from the accessibility tree", () => {
		const { container, queryAllByRole } = render(SmoothCursor);
		const cursor = container.firstElementChild as HTMLElement;
		expect(cursor.getAttribute("aria-hidden")).toBe("true");
		expect(queryAllByRole("img")).toHaveLength(0);
	});

	it("renders a custom cursor slot instead of the default arrow", () => {
		const { container } = render(SmoothCursor, {
			slots: { cursor: "<div data-testid='custom-cursor'></div>" },
		});
		expect(container.querySelector("svg")).toBeFalsy();
		expect(container.querySelector("[data-testid='custom-cursor']")).toBeTruthy();
	});

	it("hides the native cursor on mount and restores it on unmount", () => {
		const { unmount } = render(SmoothCursor);
		expect(document.body.style.cursor).toBe("none");
		unmount();
		expect(document.body.style.cursor).toBe("");
	});

	it("becomes visible once the pointer moves, and unmount does not throw once the animation loop is running", async () => {
		const { container, unmount } = render(SmoothCursor);
		const cursor = container.firstElementChild as HTMLElement;

		await fireEvent.mouseMove(document, { clientX: 120, clientY: 80 });

		expect(cursor.className).toContain("opacity-100");
		expect(() => unmount()).not.toThrow();
	});

	it("renders the name pill only when a label is given", () => {
		const bare = render(SmoothCursor);
		expect(bare.container.querySelector("[data-smooth-cursor-label]")).toBeNull();
		bare.unmount();

		const { container } = render(SmoothCursor, { props: { label: "Ada" } });
		const pill = container.querySelector("[data-smooth-cursor-label]");
		expect(pill).toBeTruthy();
		expect(pill?.textContent?.trim()).toBe("Ada");
		// Still inside the aria-hidden layer.
		expect(pill?.closest("[aria-hidden='true']")).toBeTruthy();
	});

	it("keeps the name pill when a custom cursor slot replaces the arrow", () => {
		const { container } = render(SmoothCursor, {
			props: { label: "Ada" },
			slots: { cursor: "<div data-testid='custom-cursor'></div>" },
		});
		expect(container.querySelector("svg")).toBeFalsy();
		expect(container.querySelector("[data-testid='custom-cursor']")).toBeTruthy();
		expect(container.querySelector("[data-smooth-cursor-label]")).toBeTruthy();
	});

	it("pipes the color prop into the themeable CSS variable", () => {
		const { container } = render(SmoothCursor, { props: { color: "#ff3366" } });
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--_sc-color")).toBe("var(--smooth-cursor-color, #ff3366)");
	});

	it("stays upright by default: tip hotspot, no rotating class", () => {
		const { container } = render(SmoothCursor);
		const pointer = container.querySelector(".sc-pointer") as HTMLElement;
		expect(pointer.classList.contains("sc-pointer--rotate")).toBe(false);
		expect(pointer.style.translate).toBe("-4px -3px");
	});

	it("rotate re-enables the centred, direction-following arrow", () => {
		const { container } = render(SmoothCursor, { props: { rotate: true } });
		const pointer = container.querySelector(".sc-pointer") as HTMLElement;
		expect(pointer.classList.contains("sc-pointer--rotate")).toBe(true);
		expect(pointer.style.translate).toBe("-50% -50%");
	});

	it("dims the pill with is-idle after idleFade ms at rest, and wakes it on movement", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			const { container } = render(SmoothCursor, { props: { label: "Ada", idleFade: 400 } });
			const pill = container.querySelector("[data-smooth-cursor-label]") as HTMLElement;

			await fireEvent.mouseMove(document, { clientX: 10, clientY: 10 });
			expect(pill.classList.contains("is-idle")).toBe(false);

			vi.advanceTimersByTime(400);
			await nextTick();
			expect(pill.classList.contains("is-idle")).toBe(true);

			await fireEvent.mouseMove(document, { clientX: 20, clientY: 10 });
			expect(pill.classList.contains("is-idle")).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("idleFade={0} never dims the pill", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			const { container } = render(SmoothCursor, { props: { label: "Ada", idleFade: 0 } });
			const pill = container.querySelector("[data-smooth-cursor-label]") as HTMLElement;
			await fireEvent.mouseMove(document, { clientX: 10, clientY: 10 });
			vi.advanceTimersByTime(60_000);
			await nextTick();
			expect(pill.classList.contains("is-idle")).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});
});
