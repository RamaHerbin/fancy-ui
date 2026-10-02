import { Profiler, StrictMode } from "react";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { AnimatedTooltip } from "./AnimatedTooltip.js";
import { FakeAnimation } from "../../test-setup.js";

const mockItems = [
	{ id: 1, name: "Alice", designation: "Engineer", image: "/alice.jpg" },
	{ id: 2, name: "Bob", designation: "Designer", image: "/bob.jpg" },
];

const fourItems = [
	...mockItems,
	{ id: 3, name: "Cleo", designation: "Writer", image: "/cleo.jpg" },
	{ id: 4, name: "Dan", designation: "Founder", image: "/dan.jpg" },
];

/** Replaces `window.matchMedia` wholesale (the repo-wide pattern). */
function stubReducedMotion(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: query.includes("prefers-reduced-motion: reduce") ? matches : false,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

/** The default avatar width, so the half width matches what the browser
 *  measures on a default-size item. jsdom lays nothing out, so every rect is a
 *  stub. */
const AVATAR = 56;

/** Pins each item wrapper's rect at the given left offset, in order. */
function pinRects(container: HTMLElement, lefts: number[]): HTMLElement[] {
	const wrappers = [...container.querySelectorAll<HTMLElement>(".at-item")];
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

/** The tooltip positioner currently rendered inside one item wrapper, or `null`. */
function tooltipIn(wrapper: HTMLElement): HTMLElement | null {
	return wrapper.querySelector<HTMLElement>(".at-tip");
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
		vi.unstubAllGlobals();
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

		// 50 - 0 - 28 = 22 → lean 22 / 28 → 11px, 5.5deg
		expect(tooltipIn(alice!)?.style.transform).toBe("translateX(calc(-50% + 11px)) rotate(5.5deg)");

		await settleLegs();
	});

	it("clamps the lean to one avatar radius", async () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const [alice] = pinRects(container, [0, 40]);

		fireEvent.mouseEnter(alice!, { clientX: 500 });

		expect(tooltipIn(alice!)?.style.transform).toBe("translateX(calc(-50% + 14px)) rotate(7deg)");

		await settleLegs();
	});

	it("draws the tooltip live again while its own item is hovered", async () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const [alice] = pinRects(container, [0, 40]);

		fireEvent.mouseEnter(alice!, { clientX: 50 });
		fireEvent.mouseMove(alice!, { clientX: 20 });

		// 20 - 0 - 28 = -8 → -4px, -2deg
		expect(tooltipIn(alice!)?.style.transform).toBe("translateX(calc(-50% + -4px)) rotate(-2deg)");

		await settleLegs();
	});

	it("freezes the leaving tooltip at its own last pose when the pointer crosses to a neighbour", async () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const [alice, bob] = pinRects(container, [0, 40]);

		fireEvent.mouseEnter(alice!, { clientX: 50 });
		await settleLegs();

		// No mouseleave in between: the overlap makes crossing straight onto
		// the neighbour the ordinary traversal of the row.
		fireEvent.mouseEnter(bob!, { clientX: 45 });

		// Bob is live at 45 - 40 - 28 = -23 → -11.5px, -5.75deg.
		expect(tooltipIn(bob!)?.style.transform).toBe(
			"translateX(calc(-50% + -11.5px)) rotate(-5.75deg)"
		);
		// Alice is still mounted, mid-exit, and must keep HER pose — the source's
		// paused block never re-reads the shared position.
		expect(tooltipIn(alice!)?.style.transform).toBe("translateX(calc(-50% + 11px)) rotate(5.5deg)");

		await settleLegs();
	});

	it("freezes the leaving tooltip when the pointer leaves the row and resets the offset", async () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const [alice] = pinRects(container, [0, 40]);

		fireEvent.mouseEnter(alice!, { clientX: 50 });
		await settleLegs();

		// The leave handler resets the shared offset to 0; the exiting tooltip
		// must not snap to a centred, unrotated pose because of it.
		fireEvent.mouseLeave(alice!);

		expect(tooltipIn(alice!)?.style.transform).toBe("translateX(calc(-50% + 11px)) rotate(5.5deg)");

		await settleLegs();
		expect(tooltipIn(alice!)).toBeNull();
	});

	it("plays the sink exit on the card and unmounts once it lands", async () => {
		stubReducedMotion(false);
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const [alice] = pinRects(container, [0, 40]);

		fireEvent.mouseEnter(alice!, { clientX: 50 });
		await settleLegs();
		const card = alice!.querySelector<HTMLElement>(".at-card")!;
		// The entrance is the CSS keyframe; no sampled intro runs.
		expect(FakeAnimation.instances.filter((a) => a.target === card)).toHaveLength(0);

		fireEvent.mouseLeave(alice!);
		// One microtask: the leading dummy hands over to the sampled leg.
		await Promise.resolve();
		const exit = latestAnimationOn(card);
		const keyframes = exit.keyframes as Keyframe[];
		expect(keyframes.length).toBeGreaterThan(1);
		expect(String(keyframes.at(-1)?.transform)).toContain("translateY(4px) scale(0.97)");
		expect(Number(keyframes.at(-1)?.opacity)).toBe(0);

		await settleLegs();
		expect(tooltipIn(alice!)).toBeNull();
	});

	it("fades the card out without movement under reduced motion", async () => {
		stubReducedMotion(true);
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const [alice] = pinRects(container, [0, 40]);

		fireEvent.mouseEnter(alice!, { clientX: 50 });
		await settleLegs();
		const card = alice!.querySelector<HTMLElement>(".at-card")!;

		fireEvent.mouseLeave(alice!);
		// One microtask: the leading dummy hands over to the sampled leg.
		await Promise.resolve();
		const keyframes = latestAnimationOn(card).keyframes as Keyframe[];
		expect(keyframes.length).toBeGreaterThan(1);
		for (const keyframe of keyframes) {
			expect(keyframe.transform).toBeUndefined();
		}

		await settleLegs();
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
		// 30 - 0 - 28 = 2 → 1px, 0.5deg
		expect(tooltipIn(alice!)?.style.transform).toBe("translateX(calc(-50% + 1px)) rotate(0.5deg)");

		await settleLegs();
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

		expect(tooltipIn(alice!)?.style.transform).toBe("translateX(calc(-50% + 11px)) rotate(5.5deg)");

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
		// Focus has no pointer to sample: the card sits centred and upright.
		expect((tooltip as HTMLElement).style.transform).toBe(
			"translateX(calc(-50% + 0px)) rotate(0deg)"
		);

		fireEvent.focusOut(alice!);
		expect(alice!).not.toHaveAttribute("aria-describedby");

		await settleLegs();
	});

	it("marks the hovered item active and lifts its avatar", async () => {
		stubReducedMotion(false);
		const { container } = render(<AnimatedTooltip items={fourItems} />);
		const wrappers = container.querySelectorAll<HTMLElement>(".at-item");

		fireEvent.mouseEnter(wrappers[1]!);
		expect(wrappers[1]).toHaveAttribute("data-active");
		expect(wrappers[1]!.className).toContain("at-active");
		expect(wrappers[1]!.querySelector(".at-avatar")!.className).toContain("at-lifted");
		expect(wrappers[0]).not.toHaveAttribute("data-active");

		fireEvent.mouseLeave(wrappers[1]!);
		expect(wrappers[1]).not.toHaveAttribute("data-active");
		expect(wrappers[1]!.querySelector(".at-avatar")!.className).not.toContain("at-lifted");

		await settleLegs();
	});

	it("parts the neighbours away from the hovered item", async () => {
		stubReducedMotion(false);
		const { container } = render(<AnimatedTooltip items={fourItems} />);
		const wrappers = container.querySelectorAll<HTMLElement>(".at-item");

		fireEvent.mouseEnter(wrappers[1]!);
		expect(wrappers[0]!.className).toContain("at-parted");
		expect(wrappers[0]).toHaveAttribute("data-part", "before");
		expect(wrappers[2]!.className).toContain("at-parted");
		expect(wrappers[2]).toHaveAttribute("data-part", "after");
		expect(wrappers[0]!.style.getPropertyValue("--_at-shift")).toBe("-6px");
		expect(wrappers[2]!.style.getPropertyValue("--_at-shift")).toBe("6px");
		expect(wrappers[3]!.style.getPropertyValue("--_at-shift")).toBe("2px");
		// The hovered item itself does not move sideways.
		expect(wrappers[1]!.className).not.toContain("at-parted");

		await settleLegs();
	});

	it("pipes accent and size into CSS custom properties", () => {
		const { container } = render(
			<AnimatedTooltip items={mockItems} accent="rgb(240, 163, 110)" size={72} />
		);
		const root = container.firstElementChild as HTMLElement;
		expect(root.getAttribute("style")).toContain("--at-accent: rgb(240, 163, 110)");
		expect(root.getAttribute("style")).toContain("--at-accent-2:");
		expect(root.style.getPropertyValue("--_at-size")).toBe("72px");
	});

	it("defaults to a 56px avatar and no inline accent", () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--_at-size")).toBe("56px");
		expect(root.getAttribute("style")).not.toContain("--at-accent");
	});

	it("keeps presence layers out of the accessibility tree", async () => {
		const { container } = render(<AnimatedTooltip items={mockItems} />);
		for (const el of container.querySelectorAll(".at-ring, .at-glow, .at-disc")) {
			expect(el).toHaveAttribute("aria-hidden", "true");
		}
		const wrapper = container.querySelector(".group") as HTMLElement;
		fireEvent.focusIn(wrapper);
		const tip = container.querySelector('[role="tooltip"]')!;
		expect(tip.querySelector(".at-rule")).toHaveAttribute("aria-hidden", "true");
		expect(tip.textContent).toContain("Alice");
		expect(tip.textContent).toContain("Engineer");

		await settleLegs();
	});

	it("suppresses lift and parting under reduced motion, but still opens", async () => {
		stubReducedMotion(true);
		const { container } = render(<AnimatedTooltip items={fourItems} />);
		const wrappers = container.querySelectorAll<HTMLElement>(".at-item");

		fireEvent.mouseEnter(wrappers[1]!, { clientX: 500 });
		expect(wrappers[1]).toHaveAttribute("data-active");
		expect(container.querySelector('[role="tooltip"]')).not.toBeNull();
		expect(wrappers[1]!.querySelector(".at-avatar")!.className).not.toContain("at-lifted");
		expect(container.querySelectorAll(".at-parted").length).toBe(0);
		const tip = container.querySelector<HTMLElement>('[role="tooltip"]')!;
		expect(tip.style.transform).toContain("rotate(0deg)");

		await settleLegs();
	});
});
