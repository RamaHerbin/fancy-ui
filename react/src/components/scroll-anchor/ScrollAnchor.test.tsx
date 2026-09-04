import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { ScrollAnchor } from "./ScrollAnchor.js";
import { sound, resetSoundForTests } from "../../sound/sound.js";

// jsdom has no layout, so scrollHeight/clientHeight are always 0 and every
// container reads as "already at the bottom". Patching them onto the instance
// after mount gives the region 1000px of content in a 400px viewport: the bottom
// sits at scrollTop 600.
const SCROLL_HEIGHT = 1000;
const CLIENT_HEIGHT = 400;
const BOTTOM = SCROLL_HEIGHT - CLIENT_HEIGHT;

const children = <p className="line">streamed line</p>;

function region(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-scrollanchor-region") as HTMLElement;
}

function pill(container: HTMLElement): HTMLButtonElement | null {
	return container.querySelector(".ft-scrollanchor-return");
}

/** Give the region a real geometry, then park the scrollbar at `scrollTop`. */
function measure(node: HTMLElement, scrollTop = BOTTOM): void {
	Object.defineProperty(node, "scrollHeight", { value: SCROLL_HEIGHT, configurable: true });
	Object.defineProperty(node, "clientHeight", { value: CLIENT_HEIGHT, configurable: true });
	Object.defineProperty(node, "scrollTop", {
		value: scrollTop,
		writable: true,
		configurable: true,
	});
}

/** Move the scrollbar and tell the core about it, the way a browser would. */
async function scrollTo(node: HTMLElement, top: number): Promise<void> {
	node.scrollTop = top;
	await fireEvent.scroll(node);
}

/** Let the MutationObserver callback land, then wait out the core's rAF. */
async function settle(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(resolve));
}

describe("ScrollAnchor", () => {
	afterEach(cleanup);

	it("renders its children inside the scrolling region", () => {
		const { container } = render(<ScrollAnchor>{children}</ScrollAnchor>);

		expect(region(container).querySelector(".line")?.textContent).toBe("streamed line");
	});

	it("shows no way back down while the region is pinned", () => {
		const { container } = render(<ScrollAnchor>{children}</ScrollAnchor>);

		expect(pill(container)).toBeNull();
	});

	it("offers the return button once the reader scrolls away from the bottom", async () => {
		const { container } = render(<ScrollAnchor>{children}</ScrollAnchor>);
		measure(region(container));

		await scrollTo(region(container), 100);

		expect(pill(container)?.textContent).toContain("Jump to latest");
	});

	it("takes the button away again when the reader returns to the bottom", async () => {
		const { container } = render(<ScrollAnchor>{children}</ScrollAnchor>);
		measure(region(container));

		await scrollTo(region(container), 100);
		expect(pill(container)).not.toBeNull();

		await scrollTo(region(container), BOTTOM);
		expect(pill(container)).toBeNull();
	});

	it("forwards every pinned-state flip through onStickChange", async () => {
		const onStickChange = vi.fn();
		const { container } = render(
			<ScrollAnchor onStickChange={onStickChange}>{children}</ScrollAnchor>
		);
		measure(region(container));

		await scrollTo(region(container), 100);
		expect(onStickChange).toHaveBeenLastCalledWith(false);

		// Still away from the bottom: one transition, one call.
		await scrollTo(region(container), 500);
		expect(onStickChange).toHaveBeenCalledTimes(1);

		await scrollTo(region(container), BOTTOM);
		expect(onStickChange).toHaveBeenLastCalledWith(true);
		expect(onStickChange).toHaveBeenCalledTimes(2);
	});

	it("scrolls the region back to the bottom when the button is pressed", async () => {
		const { container } = render(<ScrollAnchor>{children}</ScrollAnchor>);
		measure(region(container));

		await scrollTo(region(container), 100);
		await fireEvent.click(pill(container) as HTMLButtonElement);

		// jsdom has no Element.scrollTo, so the core's fallback writes scrollTop.
		expect(region(container).scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("hands focus to the region, since the button it was on is about to go", async () => {
		const { container } = render(<ScrollAnchor>{children}</ScrollAnchor>);
		measure(region(container));

		await scrollTo(region(container), 100);
		await fireEvent.click(pill(container) as HTMLButtonElement);

		// Left alone, focus would fall to the document body and the arrow keys would
		// stop scrolling the thing the reader was just reading.
		expect(document.activeElement).toBe(region(container));
		// Programmatic focus only: nothing new appears in the tab order.
		expect(region(container).getAttribute("tabindex")).toBe("-1");
	});

	it("arrives instead of travelling when the reader asked for less motion", async () => {
		const { container } = render(<ScrollAnchor>{children}</ScrollAnchor>);
		measure(region(container));
		// jsdom has no Element.scrollTo, so the behaviour is only observable through
		// one we put there ourselves. It moves nothing, which leaves the button up
		// for the second press.
		const jumped = vi.fn();
		Object.defineProperty(region(container), "scrollTo", { value: jumped, configurable: true });

		await scrollTo(region(container), 100);
		await fireEvent.click(pill(container) as HTMLButtonElement);
		expect(jumped).toHaveBeenLastCalledWith({ top: SCROLL_HEIGHT, behavior: "smooth" });

		const matchMedia = vi
			.spyOn(window, "matchMedia")
			.mockReturnValue({ matches: true } as MediaQueryList);
		await fireEvent.click(pill(container) as HTMLButtonElement);

		expect(jumped).toHaveBeenLastCalledWith({ top: SCROLL_HEIGHT, behavior: "instant" });
		matchMedia.mockRestore();
	});

	it("honours a custom bottomThreshold", async () => {
		const onStickChange = vi.fn();
		const { container } = render(
			<ScrollAnchor bottomThreshold={5} onStickChange={onStickChange}>
				{children}
			</ScrollAnchor>
		);
		measure(region(container));

		// 20px from the bottom: inside the default 40px zone, outside this one.
		await scrollTo(region(container), BOTTOM - 20);
		expect(onStickChange).toHaveBeenCalledExactlyOnceWith(false);
		expect(pill(container)).not.toBeNull();
	});

	it("labels the button however it is told to", async () => {
		const { container } = render(
			<ScrollAnchor returnLabel="Back to the answer">{children}</ScrollAnchor>
		);
		measure(region(container));

		await scrollTo(region(container), 100);
		expect(pill(container)?.textContent).toContain("Back to the answer");
	});

	it("keeps the arrow out of the button's accessible name", async () => {
		const { container } = render(<ScrollAnchor>{children}</ScrollAnchor>);
		measure(region(container));

		await scrollTo(region(container), 100);
		expect(pill(container)?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
	});

	it("never offers the button when showReturn is off, however far up the reader goes", async () => {
		const onStickChange = vi.fn();
		const { container } = render(
			<ScrollAnchor showReturn={false} onStickChange={onStickChange}>
				{children}
			</ScrollAnchor>
		);
		measure(region(container));

		await scrollTo(region(container), 100);

		expect(onStickChange).toHaveBeenLastCalledWith(false);
		expect(pill(container)).toBeNull();
	});

	it("drops the button when pinning is switched off, since nothing could dismiss it", async () => {
		const { container, rerender } = render(<ScrollAnchor active={true}>{children}</ScrollAnchor>);
		measure(region(container));

		await scrollTo(region(container), 100);
		expect(pill(container)).not.toBeNull();

		rerender(<ScrollAnchor active={false}>{children}</ScrollAnchor>);
		expect(pill(container)).toBeNull();
	});

	it("pins the region to the bottom as content arrives", async () => {
		const { container } = render(<ScrollAnchor>{children}</ScrollAnchor>);
		measure(region(container), BOTTOM);

		// Moved without a scroll event, so only a pin can explain the result.
		region(container).scrollTop = 0;
		region(container).appendChild(document.createElement("p"));
		await settle();

		expect(region(container).scrollTop).toBe(SCROLL_HEIGHT);
	});

	it("stops pinning the region once active turns false", async () => {
		const { container, rerender } = render(<ScrollAnchor active={true}>{children}</ScrollAnchor>);
		measure(region(container), BOTTOM);

		rerender(<ScrollAnchor active={false}>{children}</ScrollAnchor>);

		region(container).scrollTop = 0;
		region(container).appendChild(document.createElement("p"));
		await settle();

		expect(region(container).scrollTop).toBe(0);
	});

	it("caps the region at 100% unless given another height", () => {
		const { container } = render(<ScrollAnchor>{children}</ScrollAnchor>);
		expect(region(container).style.maxHeight).toBe("100%");

		cleanup();

		const custom = render(<ScrollAnchor maxHeight="14rem">{children}</ScrollAnchor>);
		expect(region(custom.container).style.maxHeight).toBe("14rem");
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(<ScrollAnchor className="my-region">{children}</ScrollAnchor>);
		const root = container.firstElementChild as HTMLElement;

		expect(root.className).toContain("my-region");
		expect(root.className).toContain("ft-scrollanchor");
	});

	it("recomputes the pin state when bottomThreshold changes, with nothing scrolled", async () => {
		const { container, rerender } = render(
			<ScrollAnchor bottomThreshold={40}>{children}</ScrollAnchor>
		);
		measure(region(container), BOTTOM - 60); // 60px from the bottom
		await scrollTo(region(container), BOTTOM - 60);
		expect(pill(container)).not.toBeNull();

		// Only the threshold moves: 60px now counts as pinned.
		rerender(<ScrollAnchor bottomThreshold={100}>{children}</ScrollAnchor>);
		expect(pill(container)).toBeNull();
	});

	it("fills a bounded parent so the region's default height cap can resolve", () => {
		// jsdom lays nothing out, so what is checkable here is the class that
		// gives the percentage something to resolve against.
		const { container } = render(<ScrollAnchor>{children}</ScrollAnchor>);
		expect((container.firstElementChild as HTMLElement).className).toContain("h-full");
	});

	describe("sound", () => {
		beforeEach(() => {
			resetSoundForTests();
			window.localStorage.clear();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays the press cue exactly once when the return pill is activated, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<ScrollAnchor sound>{children}</ScrollAnchor>);
			measure(region(container));

			await scrollTo(region(container), 100);
			await fireEvent.click(pill(container) as HTMLButtonElement);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", undefined);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<ScrollAnchor>{children}</ScrollAnchor>);
			measure(region(container));

			await scrollTo(region(container), 100);
			await fireEvent.click(pill(container) as HTMLButtonElement);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing from handleStick or the geometry effect — only the pill's own click plays", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<ScrollAnchor sound>{children}</ScrollAnchor>);
			measure(region(container));

			await scrollTo(region(container), 100);
			await scrollTo(region(container), BOTTOM);

			expect(play).not.toHaveBeenCalled();
		});

		it("does not double-fire: one pill click plays one cue, not two", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<ScrollAnchor sound>{children}</ScrollAnchor>);
			measure(region(container));

			await scrollTo(region(container), 100);
			await fireEvent.click(pill(container) as HTMLButtonElement);

			expect(play).toHaveBeenCalledTimes(1);
		});
	});
});
