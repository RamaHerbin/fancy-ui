import { Profiler, StrictMode } from "react";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
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
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

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

	it("draws a pointer sample without re-rendering the row", async () => {
		let commits = 0;
		function Harness() {
			return (
				<Profiler
					id="animated-tooltip"
					onRender={() => {
						commits++;
					}}
				>
					<AnimatedTooltip items={mockItems} />
				</Profiler>
			);
		}

		const { container } = render(<Harness />);
		const [alice] = pinRects(container, [0, 40]);

		fireEvent.mouseEnter(alice!, { clientX: 50 });
		await settleLegs();

		// The source reads the shared pointer position inside the hovered item's
		// block, so a sample rewrites one style attribute on one node. A sample
		// that re-rendered the row would scale with `items.length`.
		commits = 0;
		fireEvent.mouseMove(alice!, { clientX: 20 });
		fireEvent.mouseMove(alice!, { clientX: 30 });

		expect(commits).toBe(0);
		// 30 - 0 - 28 = 2 → 1
		expect(tooltipIn(alice!)?.style.transform).toBe("translateX(calc(-50% + 1px)) rotate(1deg)");

		await settleLegs();
	});

	it("reverses from the entrance leg's own capture, not from the painted mid-flight style", async () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const [alice] = pinRects(container, [0, 40]);

		// Stands in for what a real host paints once the entrance is running: an
		// already-scaled, already-faded computed style. jsdom's animation stub
		// never touches the computed style, so the leg has to be simulated.
		const real = window.getComputedStyle.bind(window);
		let tooltip: HTMLElement | null = null;
		let painting = false;
		vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
			if (painting && element === tooltip) {
				return {
					opacity: "0.5",
					transform: "matrix(0.7, 0, 0, 0.7, 0, 0)",
				} as unknown as CSSStyleDeclaration;
			}
			return real(element, pseudo);
		});

		fireEvent.mouseEnter(alice!, { clientX: 50 });
		tooltip = tooltipIn(alice!)!;

		// One microtask turn: the leading dummy hands over to the real leg, and
		// the leg has NOT settled, so the entrance's capture is still the one in
		// force. `settleLegs` would drain both turns and clear it.
		await Promise.resolve();

		painting = true;
		fireEvent.mouseLeave(alice!);
		await settleLegs();

		const keyframes = latestAnimationOn(tooltip).keyframes as Keyframe[];
		expect(keyframes.length).toBeGreaterThan(1);
		for (const keyframe of keyframes) {
			expect(String(keyframe.transform)).toContain("translateX(calc(-50% + 11px)) rotate(11deg)");
			expect(String(keyframe.transform)).not.toContain("matrix");
		}
	});

	it("keeps the pose on the node across StrictMode's mount-time ref cycle", async () => {
		const { container } = render(
			<StrictMode>
				<AnimatedTooltip items={mockItems} />
			</StrictMode>
		);
		const [alice] = pinRects(container, [0, 40]);

		// StrictMode attaches, detaches and re-attaches every ref on mount, so
		// the imperative pose write has to survive the cycle rather than being a
		// one-shot at first attach.
		fireEvent.mouseEnter(alice!, { clientX: 50 });

		expect(tooltipIn(alice!)?.style.transform).toBe("translateX(calc(-50% + 11px)) rotate(11deg)");

		await settleLegs();
		expect(tooltipIn(alice!)).not.toBeNull();
	});

	it("does not expose the avatar wrapper as role=button", () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const wrappers = container.querySelectorAll(".group");

		// Announced as a button it would promise an activation it never had: no
		// key handler and no name of its own. It stays focusable, so keyboard
		// users can still reach the tooltip.
		wrappers.forEach((wrapper) => {
			expect(wrapper).not.toHaveAttribute("role", "button");
			expect(wrapper).toHaveAttribute("tabindex", "0");
		});
	});

	it("shows a role=tooltip node referenced by aria-describedby on focus", async () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const [alice] = pinRects(container, [0, 40]);

		// No tooltip association before interaction.
		expect(alice!).not.toHaveAttribute("aria-describedby");

		fireEvent.focusIn(alice!);
		const describedBy = alice!.getAttribute("aria-describedby");
		expect(describedBy).toBeTruthy();
		const tooltip = container.querySelector(`#${describedBy}`);
		expect(tooltip).toHaveAttribute("role", "tooltip");

		fireEvent.focusOut(alice!);
		expect(alice!).not.toHaveAttribute("aria-describedby");

		await settleLegs();
	});
});
