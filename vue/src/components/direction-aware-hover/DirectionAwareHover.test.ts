import { render, cleanup, fireEvent } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import DirectionAwareHover from "./DirectionAwareHover.vue";

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

		it("makes the root focusable", () => {
			const { container } = render(DirectionAwareHover, { props: { imageUrl: "/t.jpg" } });
			expect(container.querySelector('[role="figure"]')).toHaveAttribute("tabindex", "0");
		});

		it("focus presents the overlay, blur returns to rest", async () => {
			const { container } = render(DirectionAwareHover, { props: { imageUrl: "/t.jpg" } });
			const figure = container.querySelector('[role="figure"]') as HTMLElement;
			expect(overlay(container)).toBeNull();
			await fireEvent.focusIn(figure);
			await nextTick();
			const el = overlay(container);
			expect(el).not.toBeNull();
			expect(el!.className).toContain("-translate-y-full");
			expect(el!.className).toContain("group-focus-within/card:translate-y-0");
			const img = figure.querySelector("img")!.parentElement as HTMLElement;
			expect(img.className).toContain("translate-y-2");
			await fireEvent.focusOut(figure);
			expect(img.className).not.toContain("translate-y-2");
		});

		it("ignores touch pointers on the hover path", async () => {
			// jsdom reports touch support, which would switch the hover path off for every pointer.
			delete (window as unknown as Record<string, unknown>).ontouchstart;
			const { container } = render(DirectionAwareHover, { props: { imageUrl: "/t.jpg" } });
			const figure = container.querySelector('[role="figure"]') as HTMLElement;
			const touch = new Event("pointerenter");
			Object.assign(touch, { pointerType: "touch" });
			await fireEvent(figure, touch);
			await nextTick();
			expect(overlay(container)).toBeNull();
			const mouse = new Event("pointerenter");
			Object.assign(mouse, { pointerType: "mouse" });
			await fireEvent(figure, mouse);
			await nextTick();
			expect(overlay(container)).not.toBeNull();
		});
	});
});
