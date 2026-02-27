import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import NumberTicker from "./NumberTicker.svelte";

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

	// Helper to trigger intersection
	trigger(isIntersecting: boolean) {
		this.callback(
			[{ isIntersecting } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

describe("NumberTicker", () => {
	afterEach(() => {
		cleanup();
		MockIntersectionObserver.instances = [];
	});

	it("renders the number-ticker element", () => {
		const { container } = render(NumberTicker, { props: { value: 100 } });
		const ticker = container.querySelector(".number-ticker");
		expect(ticker).toBeTruthy();
	});

	it("displays initial value for direction up as 0", () => {
		const { container } = render(NumberTicker, {
			props: { value: 100, direction: "up" },
		});
		const ticker = container.querySelector(".number-ticker");
		expect(ticker?.textContent).toBe("0");
	});

	it("displays initial value for direction down as the value", () => {
		const { container } = render(NumberTicker, {
			props: { value: 50, direction: "down" },
		});
		const ticker = container.querySelector(".number-ticker");
		expect(ticker?.textContent).toBe("50");
	});

	it("applies custom class names", () => {
		const { container } = render(NumberTicker, {
			props: { value: 42, class: "my-ticker" },
		});
		const ticker = container.querySelector(".number-ticker");
		expect(ticker?.className).toContain("my-ticker");
	});

	it("formats with decimal places", () => {
		const { container } = render(NumberTicker, {
			props: { value: 100, decimalPlaces: 2, direction: "down" },
		});
		const ticker = container.querySelector(".number-ticker");
		expect(ticker?.textContent).toBe("100.00");
	});

	it("observes element for intersection", () => {
		render(NumberTicker, { props: { value: 100 } });
		const lastInstance = MockIntersectionObserver.instances.at(-1);
		expect(lastInstance?.observe).toHaveBeenCalled();
	});
});
