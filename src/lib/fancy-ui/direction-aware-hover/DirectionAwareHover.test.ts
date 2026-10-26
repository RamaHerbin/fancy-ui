import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import DirectionAwareHover from "./DirectionAwareHover.svelte";

describe("DirectionAwareHover", () => {
	beforeEach(() => {
		// Mock window.matchMedia (not available in jsdom)
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});
	});

	afterEach(cleanup);

	it("renders a figure container", () => {
		const { container } = render(DirectionAwareHover, {
			props: { imageUrl: "/test.jpg" },
		});
		const figure = container.querySelector('[role="figure"]');
		expect(figure).toBeInTheDocument();
	});

	it("renders an image with correct src", () => {
		const { container } = render(DirectionAwareHover, {
			props: { imageUrl: "/test.jpg" },
		});
		const img = container.querySelector("img");
		expect(img).toHaveAttribute("src", "/test.jpg");
	});

	it("renders an image with correct alt", () => {
		const { container } = render(DirectionAwareHover, {
			props: { imageUrl: "/test.jpg", imageAlt: "My image" },
		});
		const img = container.querySelector("img");
		expect(img).toHaveAttribute("alt", "My image");
	});

	it("uses default alt text", () => {
		const { container } = render(DirectionAwareHover, {
			props: { imageUrl: "/test.jpg" },
		});
		const img = container.querySelector("img");
		expect(img).toHaveAttribute("alt", "image");
	});

	it("has overflow-hidden class on the container", () => {
		const { container } = render(DirectionAwareHover, {
			props: { imageUrl: "/test.jpg" },
		});
		const figure = container.querySelector('[role="figure"]') as HTMLElement;
		expect(figure?.className).toContain("overflow-hidden");
	});

	it("has rounded-lg class on the container", () => {
		const { container } = render(DirectionAwareHover, {
			props: { imageUrl: "/test.jpg" },
		});
		const figure = container.querySelector('[role="figure"]') as HTMLElement;
		expect(figure?.className).toContain("rounded-lg");
	});

	it("applies custom class names", () => {
		const { container } = render(DirectionAwareHover, {
			props: { imageUrl: "/test.jpg", class: "custom-hover" },
		});
		const figure = container.querySelector('[role="figure"]') as HTMLElement;
		expect(figure?.className).toContain("custom-hover");
	});

	it("image has object-cover class", () => {
		const { container } = render(DirectionAwareHover, {
			props: { imageUrl: "/test.jpg" },
		});
		const img = container.querySelector("img");
		expect(img?.className).toContain("object-cover");
	});

	describe("keyboard path", () => {
		const overlay = (c: HTMLElement) => c.querySelector(".bg-black\\/40");

		function touchPointer(type: string, el: Element, pointerType: string) {
			const ev = new Event(type, { bubbles: false });
			Object.defineProperty(ev, "pointerType", { value: pointerType });
			el.dispatchEvent(ev);
		}

		it("makes the root focusable and keeps role and name hooks", () => {
			const { container } = render(DirectionAwareHover, { props: { imageUrl: "/t.jpg" } });
			const figure = container.querySelector('[role="figure"]') as HTMLElement;
			expect(figure).toHaveAttribute("tabindex", "0");
		});

		it("focus presents the overlay and the caption, blur returns to rest", async () => {
			const { container } = render(DirectionAwareHover, {
				props: { imageUrl: "/t.jpg" },
			});
			const figure = container.querySelector('[role="figure"]') as HTMLElement;
			expect(overlay(container)).toBeNull();
			await fireEvent.focusIn(figure);
			await tick();
			const el = overlay(container);
			expect(el).not.toBeNull();
			expect(el!.className).toContain("-translate-y-full");
			expect(el!.className).toContain("group-focus-within/card:translate-y-0");
			await fireEvent.focusOut(figure);
			await tick();
			// the fade-out may still hold the node; the direction state is rest again
			const img = figure.querySelector("img")!.parentElement as HTMLElement;
			expect(img.className).not.toContain("translate-y-2");
		});

		it("ignores touch pointers on the hover path", async () => {
			// jsdom reports touch support, which would switch the hover path off for every pointer.
			delete (window as unknown as Record<string, unknown>).ontouchstart;
			const { container } = render(DirectionAwareHover, { props: { imageUrl: "/t.jpg" } });
			const figure = container.querySelector('[role="figure"]') as HTMLElement;
			touchPointer("pointerenter", figure, "touch");
			await tick();
			expect(overlay(container)).toBeNull();
			touchPointer("pointerenter", figure, "mouse");
			await tick();
			expect(overlay(container)).not.toBeNull();
		});
	});
});
