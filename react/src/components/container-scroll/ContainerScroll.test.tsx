import { render, cleanup, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { ContainerScroll, apertureEase, apertureProgress } from "./ContainerScroll.js";

function mockMatchMedia(reduced: boolean) {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: reduced && query.includes("reduce"),
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
}

/** Every element reports the same rect, so the card track can be placed anywhere. */
function mockTrackTop(top: number, height = 640) {
	return vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
		top,
		bottom: top + height,
		height,
		left: 0,
		right: 1000,
		width: 1000,
		x: 0,
		y: top,
		toJSON: () => ({}),
	} as DOMRect);
}

function progressOf(container: HTMLElement): number {
	const root = container.querySelector(".cs-root") as HTMLElement;
	return Number(root.style.getPropertyValue("--cs-progress"));
}

const flush = () => act(() => new Promise<void>((r) => setTimeout(r, 40)));

describe("ContainerScroll", () => {
	beforeEach(() => {
		mockMatchMedia(false);
		Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("renders the component", () => {
		const { container } = render(<ContainerScroll />);
		expect(container.firstElementChild).toBeInTheDocument();
	});

	it("renders the card, its frame and the seam", () => {
		const { container } = render(<ContainerScroll />);
		expect(container.querySelector(".cs-card")).toBeInTheDocument();
		expect(container.querySelector(".cs-surface")).toBeInTheDocument();
		const seam = container.querySelector(".cs-seam");
		expect(seam).toBeInTheDocument();
		expect(seam?.getAttribute("aria-hidden")).toBe("true");
	});

	it("applies custom class", () => {
		const { container } = render(<ContainerScroll className="my-scroll" />);
		expect(container.firstElementChild?.className).toContain("my-scroll");
	});

	it("has no 3D tilt or perspective", () => {
		const { container } = render(<ContainerScroll />);
		expect(container.innerHTML).not.toContain("rotateX");
		expect(container.innerHTML).not.toContain("perspective");
	});

	it("starts closed when the card is below the fold", () => {
		mockTrackTop(2000);
		const { container } = render(<ContainerScroll />);
		expect(progressOf(container)).toBe(0);
		const root = container.querySelector(".cs-root") as HTMLElement;
		expect(root.style.getPropertyValue("--cs-open")).toBe("0.0000");
	});

	it("opens as the card scrolls into view", async () => {
		const spy = mockTrackTop(2000);
		const { container } = render(<ContainerScroll />);
		expect(progressOf(container)).toBe(0);

		spy.mockReturnValue({ top: 500, height: 640, bottom: 1140 } as DOMRect);
		window.dispatchEvent(new Event("scroll"));
		await flush();
		const mid = progressOf(container);
		expect(mid).toBeGreaterThan(0);
		expect(mid).toBeLessThan(1);

		spy.mockReturnValue({ top: -100, height: 640, bottom: 540 } as DOMRect);
		window.dispatchEvent(new Event("scroll"));
		await flush();
		expect(progressOf(container)).toBe(1);
	});

	it("is fully open under reduced motion", async () => {
		mockMatchMedia(true);
		mockTrackTop(2000);
		const { container } = render(<ContainerScroll />);
		await flush();
		expect(progressOf(container)).toBe(1);
		expect(container.querySelector(".cs-root")?.hasAttribute("data-reduced-motion")).toBe(true);
	});

	it("forwards the accent colours as CSS variables", () => {
		const { container } = render(
			<ContainerScroll accent="#ff8800" accentSecondary="rgb(1, 2, 3)" />
		);
		const root = container.querySelector(".cs-root") as HTMLElement;
		expect(root.style.getPropertyValue("--cs-accent")).toBe("#ff8800");
		expect(root.style.getPropertyValue("--cs-accent-2")).toBe("rgb(1, 2, 3)");
	});

	it("progress and easing helpers are clamped", () => {
		expect(apertureProgress(900, 640, 900)).toBe(0);
		expect(apertureProgress(2000, 640, 900)).toBe(0);
		expect(apertureProgress(-500, 640, 900)).toBe(1);
		expect(apertureEase(0)).toBe(0);
		expect(apertureEase(1)).toBe(1);
		expect(apertureEase(0.5)).toBeCloseTo(0.5);
	});
});
