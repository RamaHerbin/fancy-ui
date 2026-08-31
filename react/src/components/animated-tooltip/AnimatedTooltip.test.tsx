import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { AnimatedTooltip } from "./AnimatedTooltip.js";
import { FakeAnimation } from "../../test-setup.js";

const mockItems = [
	{ id: 1, name: "Alice", designation: "Engineer", image: "/alice.jpg" },
	{ id: 2, name: "Bob", designation: "Designer", image: "/bob.jpg" },
];

/** The avatar's own width, so `halfWidth` matches what the browser measures on
 *  a `size-14` image. jsdom lays nothing out, so every rect is a stub. */
const AVATAR = 56;

/** Pins each item wrapper's rect at the given left offset, in order. */
function pinRects(container: HTMLElement, lefts: number[]): HTMLElement[] {
	const wrappers = [...container.querySelectorAll<HTMLElement>(".group")];
	wrappers.forEach((wrapper, index) => {
		const left = lefts[index] ?? 0;
		wrapper.getBoundingClientRect = () =>
			({
				left,
				top: 0,
				right: left + AVATAR,
				bottom: AVATAR,
				width: AVATAR,
				height: AVATAR,
			}) as DOMRect;
	});
	return wrappers;
}

/** The tooltip currently rendered inside one item wrapper, or `null`. */
function tooltipIn(wrapper: HTMLElement): HTMLElement | null {
	return wrapper.querySelector<HTMLElement>(".absolute.-top-16");
}

/**
 * Drains a transition leg to completion. The animation stub finishes on a
 * MICROTASK and the sampler chains a dummy into the real animation, so a settled
 * leg is two turns away; `act` crosses a macrotask boundary and flushes the
 * React updates the finish schedules.
 */
const settleLegs = () => act(async () => {});

/** The most recent animation the sampler created on `target`. */
function latestAnimationOn(target: Element): FakeAnimation {
	const found = FakeAnimation.instances.filter((animation) => animation.target === target).at(-1);
	if (!found) throw new Error("no animation recorded on that element");
	return found;
}

describe("AnimatedTooltip", () => {
	afterEach(cleanup);

	it("renders one avatar image per item", () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const imgs = container.querySelectorAll("img");
		expect(imgs.length).toBe(2);
	});

	it("sets correct alt text on images", () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const imgs = container.querySelectorAll("img");
		expect(imgs[0]).toHaveAttribute("alt", "Alice");
		expect(imgs[1]).toHaveAttribute("alt", "Bob");
	});

	it("sets correct src on images", () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const imgs = container.querySelectorAll("img");
		expect(imgs[0]).toHaveAttribute("src", "/alice.jpg");
		expect(imgs[1]).toHaveAttribute("src", "/bob.jpg");
	});

	it("renders a flex container", () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper?.className).toContain("flex");
	});

	it("applies custom class names", () => {
		const { container } = render(<AnimatedTooltip items={mockItems} className="custom" />);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper?.className).toContain("custom");
	});

	it("renders empty when items is empty", () => {
		const { container } = render(<AnimatedTooltip items={[]} />);
		const imgs = container.querySelectorAll("img");
		expect(imgs.length).toBe(0);
	});

	it("each item wrapper has group class", () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const groups = container.querySelectorAll(".group");
		expect(groups.length).toBe(2);
	});

	it("images have rounded-full class", () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const imgs = container.querySelectorAll("img");
		expect(imgs[0]?.className).toContain("rounded-full");
		expect(imgs[1]?.className).toContain("rounded-full");
	});

	it("poses the hovered tooltip from the pointer offset", async () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const [alice] = pinRects(container, [0, 40]);

		fireEvent.mouseEnter(alice!, { clientX: 50 });

		// 50 - 0 - 28 = 22 → 22 / 100 * 50 = 11
		expect(tooltipIn(alice!)?.style.transform).toBe("translateX(calc(-50% + 11px)) rotate(11deg)");

		await settleLegs();
	});

	it("draws the tooltip live again while its own item is hovered", async () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const [alice] = pinRects(container, [0, 40]);

		fireEvent.mouseEnter(alice!, { clientX: 50 });
		fireEvent.mouseMove(alice!, { clientX: 20 });

		// 20 - 0 - 28 = -8 → -4
		expect(tooltipIn(alice!)?.style.transform).toBe("translateX(calc(-50% + -4px)) rotate(-4deg)");

		await settleLegs();
	});

	it("freezes the leaving tooltip at its own last pose when the pointer crosses to a neighbour", async () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const [alice, bob] = pinRects(container, [0, 40]);

		fireEvent.mouseEnter(alice!, { clientX: 50 });
		await settleLegs();

		// No mouseleave in between: the `-mr-4` overlap makes crossing straight
		// onto the neighbour the ordinary traversal of the row.
		fireEvent.mouseEnter(bob!, { clientX: 45 });

		// Bob is live at 45 - 40 - 28 = -23 → -11.5.
		expect(tooltipIn(bob!)?.style.transform).toBe(
			"translateX(calc(-50% + -11.5px)) rotate(-11.5deg)"
		);
		// Alice is still mounted, mid-exit, and must keep HER pose — the source's
		// paused block never re-reads the shared position.
		expect(tooltipIn(alice!)?.style.transform).toBe("translateX(calc(-50% + 11px)) rotate(11deg)");

		await settleLegs();
	});

	it("freezes the leaving tooltip when the pointer leaves the row and resets the offset", async () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const [alice] = pinRects(container, [0, 40]);

		fireEvent.mouseEnter(alice!, { clientX: 50 });
		await settleLegs();

		// `handleMouseLeave` resets the shared offset to 0; the exiting tooltip
		// must not snap to a centred, unrotated pose because of it.
		fireEvent.mouseLeave(alice!);

		expect(tooltipIn(alice!)?.style.transform).toBe("translateX(calc(-50% + 11px)) rotate(11deg)");

		await settleLegs();
	});

	it("bakes the frozen pose into every keyframe of the exit leg", async () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const [alice, bob] = pinRects(container, [0, 40]);

		fireEvent.mouseEnter(alice!, { clientX: 50 });
		const tooltip = tooltipIn(alice!)!;
		await settleLegs();

		fireEvent.mouseEnter(bob!, { clientX: 45 });
		await settleLegs();

		// The exit's keyframes are sampled from `getComputedStyle` at leg start,
		// so a stale inline transform would be baked into the whole 200ms leg
		// rather than showing for a single frame.
		const keyframes = latestAnimationOn(tooltip).keyframes as Keyframe[];
		expect(keyframes.length).toBeGreaterThan(1);
		for (const keyframe of keyframes) {
			expect(String(keyframe.transform)).toContain("translateX(calc(-50% + 11px)) rotate(11deg)");
		}
	});
});
