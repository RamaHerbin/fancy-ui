import { render, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { BentoGrid } from "./BentoGrid.js";

class MockIntersectionObserver {
	observe = vi.fn();
	disconnect = vi.fn();
	unobserve = vi.fn();
	takeRecords = vi.fn(() => []);
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
vi.stubGlobal("matchMedia", (query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addEventListener: () => {},
	removeEventListener: () => {},
	dispatchEvent: () => false,
	addListener: () => {},
	removeListener: () => {},
}));

describe("BentoGrid listeners and precedence", () => {
	afterEach(cleanup);

	it("reveals on focusin and still calls a consumer focus listener once", async () => {
		const spy = vi.fn();
		const { getByTestId } = render(<BentoGrid data-testid={"g"} onFocus={spy} />);
		const grid = getByTestId("g");
		expect(grid).toHaveAttribute("data-state", "armed");
		act(() => {
			grid.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		});
		await Promise.resolve();
		expect(grid).toHaveAttribute("data-state", "shown");
		expect(spy).toHaveBeenCalledTimes(1);
	});

	it("lets the accent beat a consumer --bento-accent", () => {
		const { getByTestId } = render(
			<BentoGrid
				data-testid={"g"}
				accent={"red"}
				style={{ "--bento-accent": "blue", opacity: "0.5" } as React.CSSProperties}
			/>
		);
		const grid = getByTestId("g");
		expect(grid.style.getPropertyValue("--bento-accent")).toBe("red");
		expect(grid.style.opacity).toBe("0.5");
	});

	it("falls back to a consumer data-state when reveal is off", () => {
		const { getByTestId } = render(
			<BentoGrid data-testid={"g"} reveal={false} data-state={"mine"} />
		);
		expect(getByTestId("g")).toHaveAttribute("data-state", "mine");
	});
});
