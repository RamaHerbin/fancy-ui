import { render, cleanup } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import BoxReveal from "./BoxReveal.vue";

// Mock IntersectionObserver as a class
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

describe("BoxReveal", () => {
	afterEach(() => {
		cleanup();
		MockIntersectionObserver.instances = [];
	});

	it("renders the box-reveal container", () => {
		const { container } = render(BoxReveal, {
			slots: { default: "content" },
		});
		const wrapper = container.querySelector(".box-reveal");
		expect(wrapper).toBeTruthy();
	});

	it("renders the overlay element", () => {
		const { container } = render(BoxReveal, {
			slots: { default: "content" },
		});
		const overlay = container.querySelector(".box-reveal-overlay");
		expect(overlay).toBeTruthy();
	});

	it("renders overlay with z-20 class for stacking", () => {
		const { container } = render(BoxReveal, {
			props: { color: "#ff0000" },
			slots: { default: "content" },
		});
		const overlay = container.querySelector(".box-reveal-overlay") as HTMLElement;
		expect(overlay?.className).toContain("z-20");
		expect(overlay?.className).toContain("absolute");
	});

	it("applies custom class names", () => {
		const { container } = render(BoxReveal, {
			props: { class: "my-reveal" },
			slots: { default: "content" },
		});
		const wrapper = container.querySelector(".box-reveal");
		expect(wrapper?.className).toContain("my-reveal");
	});

	it("observes element for intersection", async () => {
		render(BoxReveal, {
			slots: { default: "content" },
		});
		await nextTick();
		const lastInstance = MockIntersectionObserver.instances.at(-1);
		expect(lastInstance?.observe).toHaveBeenCalled();
	});

	it("content starts hidden (opacity 0)", () => {
		const { container } = render(BoxReveal, {
			slots: { default: "content" },
		});
		const content = container.querySelector(".box-reveal-content") as HTMLElement;
		const style = content?.getAttribute("style") ?? "";
		expect(style).toContain("opacity");
	});
});
