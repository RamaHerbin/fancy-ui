import { createRef, StrictMode, useState } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import { FakeAnimation } from "../../test-setup.js";

import { NavigationMenu } from "./NavigationMenu.js";
import { NavigationMenuList } from "./NavigationMenuList.js";
import { NavigationMenuItem } from "./NavigationMenuItem.js";
import { NavigationMenuTrigger } from "./NavigationMenuTrigger.js";
import { NavigationMenuContent } from "./NavigationMenuContent.js";
import { NavigationMenuLink } from "./NavigationMenuLink.js";
import { __dismissableLayerCount } from "../../internals/dismissable.js";

/**
 * jsdom has no `inert` IDL property, so `el.inert = true` would otherwise be a
 * plain expando that reflects to no attribute — a test reading `.inert` back
 * would pass even if the real browser behaviour (an `inert` ATTRIBUTE, which
 * is what `:not([inert])` selectors and assistive tech key on) was never
 * touched. Guarded so it is a no-op the moment jsdom ships the real property.
 */
if (!("inert" in HTMLElement.prototype)) {
	Object.defineProperty(HTMLElement.prototype, "inert", {
		configurable: true,
		get(this: HTMLElement) {
			return this.hasAttribute("inert");
		},
		set(this: HTMLElement, value: boolean) {
			if (value) this.setAttribute("inert", "");
			else this.removeAttribute("inert");
		},
	});
}

interface Link {
	href: string;
	title: string;
	description?: string;
	current?: boolean;
}

interface Item {
	value: string;
	label: string;
	links: Link[];
}

const TWO_ITEMS: Item[] = [
	{
		value: "products",
		label: "Products",
		links: [
			{ href: "/components", title: "Components", description: "Browse the full UI library" },
			{ href: "/themes", title: "Themes", description: "Generate custom color palettes" },
		],
	},
	{
		value: "resources",
		label: "Resources",
		links: [{ href: "/docs", title: "Documentation", description: "Guides and API reference" }],
	},
];

interface HarnessProps {
	items: Item[];
	/** The initial open value — the React spelling of the source harness's
	 *  `bind:value` seed. */
	value?: string;
	onValueChange?: (value: string) => void;
	label?: string;
	openDelay?: number;
	closeDelay?: number;
	/** A plain, non-disclosure link rendered after the items — the mockup's "Pricing". */
	extraLink?: Link;
	/**
	 * `false` renders the menu with neither `value` nor `onValueChange`: the
	 * genuinely uncontrolled path, which is what the source's `value: undefined`
	 * case reaches through `bind:`.
	 */
	bound?: boolean;
}

/**
 * The React replacement for the source's `*.test.svelte` rig (internals
 * contract §9.2). The behaviour under test spans every piece of the compound
 * at once — root timers, an item's own trigger/content pair, the links inside
 * a panel — so proving it needs real instances wired up the way a consumer
 * actually would. The value is round-tripped through this component's own
 * state so a test can observe it the same way the source harness does.
 */
function Harness({
	items,
	value: initialValue = "",
	onValueChange,
	label = "Test navigation",
	openDelay = 150,
	closeDelay = 200,
	extraLink,
	bound = true,
}: HarnessProps) {
	const [value, setValue] = useState(initialValue);

	function handleValueChange(next: string) {
		setValue(next);
		onValueChange?.(next);
	}

	const binding = bound ? { value, onValueChange: handleValueChange } : {};

	return (
		<>
			<NavigationMenu {...binding} label={label} openDelay={openDelay} closeDelay={closeDelay}>
				<NavigationMenuList>
					{items.map((item) => (
						<NavigationMenuItem key={item.value} value={item.value}>
							<NavigationMenuTrigger>{item.label}</NavigationMenuTrigger>
							<NavigationMenuContent>
								{item.links.map((link) => (
									<NavigationMenuLink
										key={link.href}
										href={link.href}
										title={link.title}
										description={link.description}
										current={link.current}
									/>
								))}
							</NavigationMenuContent>
						</NavigationMenuItem>
					))}
					{extraLink ? (
						<li>
							<a href={extraLink.href}>{extraLink.title}</a>
						</li>
					) : null}
				</NavigationMenuList>
			</NavigationMenu>
			<span data-testid="bound-value">{value}</span>
		</>
	);
}

function triggers(container: HTMLElement): HTMLButtonElement[] {
	return Array.from(container.querySelectorAll<HTMLButtonElement>("[data-ft-nav-trigger]"));
}

function triggerByLabel(container: HTMLElement, label: string): HTMLButtonElement {
	return triggers(container).find((b) => b.textContent?.includes(label)) as HTMLButtonElement;
}

function panel(): HTMLElement | null {
	return document.body.querySelector(".ft-navigation-menu-content");
}

function panelLinks(): HTMLAnchorElement[] {
	return Array.from(panel()?.querySelectorAll("a") ?? []);
}

/**
 * `pointerenter` / `pointerleave` are DERIVED events in React: the enter/leave
 * plugin synthesises them from `pointerover` / `pointerout`, so dispatching a
 * raw `pointerenter` — which is what the source suite does — would reach no
 * handler at all. The pair below is the same user gesture expressed in the
 * events React actually listens for.
 */
function pointerEnter(el: Element) {
	fireEvent.pointerOver(el);
}

function pointerLeave(el: Element) {
	fireEvent.pointerOut(el);
}

/**
 * Wrapped in a SYNCHRONOUS `act`: the listener is a native document one, so
 * the state update it schedules has to be flushed for the next assertion to
 * see it — but a synchronous `act` does not drain microtasks, which is what
 * keeps an exit leg in flight across the assertions that need it there.
 */
function pressEscape() {
	act(() => {
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
		);
	});
}

/**
 * Drains an entrance or exit leg to completion WITHOUT advancing a single
 * millisecond of timer time — which is what lets it stand in for the source's
 * `waitFor(() => expect(panel()).toBeNull())` in tests whose whole point is
 * that no delay elapsed. The animation stub finishes on a MICROTASK and
 * `runTransition` chains a dummy into the real animation, so a settled leg is
 * two turns away.
 *
 * Every test that would otherwise leave a leg in flight ends with this, and
 * not merely for tidiness: a leg that settles after the test body has returned
 * updates React state outside `act`, which prints a warning per panel.
 */
async function settle() {
	await act(async () => {});
	await act(async () => {});
}

/** Advances fake timers inside `act`, so the state updates their callbacks
 *  schedule are flushed before the next assertion. */
async function advance(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

describe("NavigationMenu", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		expect(__dismissableLayerCount()).toBe(0);
		document.body.innerHTML = "";
		vi.useRealTimers();
	});

	it("defaults the nav's accessible name to Main", () => {
		const { container } = render(<NavigationMenu />);
		expect(container.querySelector("nav")?.getAttribute("aria-label")).toBe("Main");
	});

	it("uses the given label as the nav's accessible name", () => {
		const { container } = render(<Harness items={TWO_ITEMS} label="Site" />);
		expect(container.querySelector("nav")?.getAttribute("aria-label")).toBe("Site");
	});

	it("merges the class prop with the base classes on the nav", () => {
		const { container } = render(<NavigationMenu className="mt-4" />);
		const nav = container.querySelector("nav");
		expect(nav?.className).toContain("ft-navigation-menu");
		expect(nav?.className).toContain("mt-4");
	});

	it("binds the nav element", () => {
		const ref = createRef<HTMLElement>();
		const { container } = render(<NavigationMenu ref={ref} />);
		expect(ref.current).toBe(container.querySelector("nav"));
	});

	it("renders items as a <ul> of <li>, each holding a real button — never role=menu, closed", () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);

		expect(container.querySelector("ul")).toBeTruthy();
		expect(container.querySelectorAll("li")).toHaveLength(TWO_ITEMS.length);
		for (const button of triggers(container)) {
			expect(button.getAttribute("type")).toBe("button");
		}
		// The single most important decision this component makes: this is
		// disclosure navigation, not an application menu. See the README. This
		// only proves it of the closed trigger row, still inside `container` —
		// the open panel is a separate assertion below, since it portals to
		// `document.body` and never opening one here would leave that half of
		// the claim unchecked.
		expect(container.querySelector('[role="menu"]')).toBeNull();
		expect(container.querySelector('[role="menuitem"]')).toBeNull();
		expect(container.querySelector('[aria-haspopup="menu"]')).toBeNull();
	});

	it("never role=menu in the open panel either, portalled to document.body and all", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		fireEvent.click(triggerByLabel(container, "Products"));
		const content = panel();
		expect(content).not.toBeNull();

		// Checked against `document.body` as a whole, not just `content` —
		// the claim is that nothing in the portalled subtree carries menu
		// semantics, not merely that the panel's own root element doesn't.
		expect(document.body.querySelector('[role="menu"]')).toBeNull();
		expect(document.body.querySelector('[role="menuitem"]')).toBeNull();
		expect(document.body.querySelector('[aria-haspopup="menu"]')).toBeNull();
		// The links inside are real, ordinary anchors — not role="menuitem".
		for (const link of panelLinks()) {
			expect(link.getAttribute("role")).toBeNull();
		}
		await settle();
	});

	it("starts every trigger collapsed, with no aria-controls until the panel exists", () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		for (const button of triggers(container)) {
			expect(button.getAttribute("aria-expanded")).toBe("false");
			expect(button.hasAttribute("aria-controls")).toBe(false);
		}
		expect(panel()).toBeNull();
	});

	it("opens on click, wiring aria-expanded/aria-controls to a real panel id", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		const trigger = triggerByLabel(container, "Products");

		fireEvent.click(trigger);

		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		const controls = trigger.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(panel()?.id).toBe(controls);
		expect(panel()?.getAttribute("aria-labelledby")).toBe(trigger.id);
		await settle();
	});

	it("closes on a second click of the same trigger", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		const trigger = triggerByLabel(container, "Products");

		fireEvent.click(trigger);
		expect(panel()).not.toBeNull();

		fireEvent.click(trigger);
		// `aria-expanded` flips synchronously — nothing a consumer can observe
		// waits for the fade. Only the panel's DOM removal is deferred, so
		// only that assertion settles the leg first.
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		await settle();
		expect(panel()).toBeNull();
	});

	it("switches to a different trigger on click immediately, with no delay", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		fireEvent.click(products);
		expect(panelLinks()[0]?.getAttribute("href")).toBe("/components");

		fireEvent.click(resources);
		expect(products.getAttribute("aria-expanded")).toBe("false");
		expect(resources.getAttribute("aria-expanded")).toBe("true");
		// `settle()` advances no timer time at all, so "with no delay" is still
		// exactly what is being asserted — it only lets the old panel finish
		// leaving, since both panels are in `document.body` until it does.
		await settle();
		expect(panelLinks()[0]?.getAttribute("href")).toBe("/docs");
	});

	it("does not treat a pointerdown on the open trigger itself as an outside click", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		const trigger = triggerByLabel(container, "Products");
		fireEvent.click(trigger);
		expect(panel()).not.toBeNull();

		fireEvent.pointerDown(trigger);
		expect(panel()).not.toBeNull();
		await settle();
	});

	it("closes on a pointerdown outside the trigger and the panel", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		fireEvent.click(triggerByLabel(container, "Products"));
		expect(panel()).not.toBeNull();

		fireEvent.pointerDown(document.body);
		await settle();
		expect(panel()).toBeNull();
	});

	it("opens after openDelay on pointerenter, not a moment before", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} openDelay={300} />);
		const trigger = triggerByLabel(container, "Products");

		pointerEnter(trigger);
		await advance(299);
		expect(panel()).toBeNull();

		await advance(1);
		expect(panel()).not.toBeNull();
		await settle();
	});

	it("cancels the scheduled open if the pointer leaves before openDelay elapses", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} openDelay={300} />);
		const trigger = triggerByLabel(container, "Products");

		pointerEnter(trigger);
		await advance(150);
		pointerLeave(trigger);
		await advance(1000);

		expect(panel()).toBeNull();
	});

	it("closes after closeDelay once the pointer leaves the trigger without reaching the panel", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} closeDelay={150} />);
		const trigger = triggerByLabel(container, "Products");
		fireEvent.click(trigger);
		expect(panel()).not.toBeNull();

		pointerLeave(trigger);
		await advance(149);
		expect(panel()).not.toBeNull();

		await advance(1);
		await settle();
		expect(panel()).toBeNull();
	});

	it("stays open when the pointer travels from the trigger into the panel before closeDelay elapses", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} closeDelay={150} />);
		const trigger = triggerByLabel(container, "Products");
		fireEvent.click(trigger);

		pointerLeave(trigger);
		await advance(100);
		pointerEnter(panel()!);
		await advance(1000);

		expect(panel()).not.toBeNull();
		await settle();
	});

	it("closes after closeDelay once the pointer leaves the panel behind it", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} closeDelay={150} />);
		const trigger = triggerByLabel(container, "Products");
		fireEvent.click(trigger);

		pointerLeave(trigger);
		await advance(100);
		pointerEnter(panel()!);
		pointerLeave(panel()!);
		await advance(149);
		expect(panel()).not.toBeNull();

		await advance(1);
		await settle();
		expect(panel()).toBeNull();
	});

	it("switches to a different trigger on hover immediately, with no re-delay, once something is already open", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} openDelay={300} />);
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		pointerEnter(products);
		await advance(300);
		expect(panelLinks()[0]?.getAttribute("href")).toBe("/components");

		pointerEnter(resources);
		// No time advanced at all — a real delay here would leave the old
		// panel showing, or nothing at all, for up to `openDelay`.
		await advance(0);
		await settle();
		expect(panelLinks()[0]?.getAttribute("href")).toBe("/docs");
		expect(products.getAttribute("aria-expanded")).toBe("false");
	});

	it("opens on Enter and moves focus to the first link in the panel", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		const trigger = triggerByLabel(container, "Products");

		fireEvent.keyDown(trigger, { key: "Enter" });

		expect(panel()).not.toBeNull();
		expect(document.activeElement).toBe(panelLinks()[0]);
		await settle();
	});

	it("opens on ArrowDown the same way as Enter", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		const trigger = triggerByLabel(container, "Resources");

		fireEvent.keyDown(trigger, { key: "ArrowDown" });

		expect(panel()).not.toBeNull();
		expect(document.activeElement).toBe(panelLinks()[0]);
		await settle();
	});

	it("moves focus into a panel that is ALREADY open when its trigger is keyed again", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} openDelay={300} />);
		const trigger = triggerByLabel(container, "Products");

		// Opened by HOVER, so no focus request was ever made and focus is
		// still outside the panel — the state the keyboard path has to
		// recover from.
		pointerEnter(trigger);
		await advance(300);
		await settle();
		expect(panel()).not.toBeNull();
		expect(document.activeElement).not.toBe(panelLinks()[0]);

		// Nothing else moves on this press: `open()` sees the same value and
		// short-circuits, `focus()` re-marks the same roving position, and the
		// panel keeps the node and item value it already had. Only the focus
		// request itself is new.
		fireEvent.keyDown(trigger, { key: "Enter" });

		expect(panel()).not.toBeNull();
		expect(document.activeElement).toBe(panelLinks()[0]);
		await settle();
	});

	it("does not open merely by receiving focus — only Enter/Space/ArrowDown do", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		const trigger = triggerByLabel(container, "Products");

		act(() => {
			trigger.focus();
		});
		expect(panel()).toBeNull();

		// Give a delayed, focus-triggered open every chance to fire too — a
		// handler that schedules through the same hover-intent timer instead
		// of opening synchronously would slip past the assertion above.
		await advance(1000);
		expect(panel()).toBeNull();
	});

	it("closes on Escape and returns focus to the trigger", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		const trigger = triggerByLabel(container, "Products");
		fireEvent.keyDown(trigger, { key: "Enter" });
		expect(document.activeElement).not.toBe(trigger);

		pressEscape();

		// Deliberately asserted BEFORE the panel is gone, and deliberately
		// before the leg is settled: the focus return is `NavigationMenu`'s own
		// `close()`, a plain function outside the panel's own component, so it
		// lands at the dismiss instant rather than at the end of the fade.
		// Settling first would silently delete that requirement.
		expect(document.activeElement).toBe(trigger);
		await settle();
		expect(panel()).toBeNull();
	});

	// The failure this pins down: hover-card-style surfaces that also open on
	// `focusin` reopen themselves the instant Escape returns focus to the
	// trigger, because that programmatic focus() fires a focus event too.
	// NavigationMenuTrigger deliberately has no such handler (see its own
	// comment) — proving the *outcome* here, not just the absence of code,
	// is what catches a regression that adds one back.
	it("does not reopen after Escape just because the pointer is still resting on the trigger", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} openDelay={300} />);
		const trigger = triggerByLabel(container, "Products");

		pointerEnter(trigger);
		await advance(300);
		expect(panel()).not.toBeNull();

		pressEscape();
		// Unwrapped for the same reason as the test above: the return is
		// eager, not deferred to the end of the exit.
		expect(document.activeElement).toBe(trigger);
		await settle();
		expect(panel()).toBeNull();

		// No new pointerenter is dispatched — the pointer never left, so a
		// real one never fires again either. Only a bug would reopen from here.
		await advance(1000);
		expect(panel()).toBeNull();
	});

	it("gives exactly one trigger tabindex 0, defaulting to the first", () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		const zeroed = triggers(container).filter((b) => b.getAttribute("tabindex") === "0");
		const negative = triggers(container).filter((b) => b.getAttribute("tabindex") === "-1");

		expect(zeroed).toHaveLength(1);
		expect(zeroed[0]!.textContent).toContain("Products");
		expect(negative).toHaveLength(1);
	});

	it("moves forward with ArrowRight, wrapping at the end", () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		fireEvent.keyDown(products, { key: "ArrowRight" });
		expect(document.activeElement).toBe(resources);
		expect(resources.getAttribute("tabindex")).toBe("0");
		expect(products.getAttribute("tabindex")).toBe("-1");

		fireEvent.keyDown(resources, { key: "ArrowRight" });
		expect(document.activeElement).toBe(products);
	});

	it("moves backward with ArrowLeft, wrapping at the start", () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		fireEvent.keyDown(products, { key: "ArrowLeft" });
		expect(document.activeElement).toBe(resources);
	});

	it("jumps to the first and last trigger with Home and End", () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		fireEvent.keyDown(products, { key: "End" });
		expect(document.activeElement).toBe(resources);

		fireEvent.keyDown(resources, { key: "Home" });
		expect(document.activeElement).toBe(products);
	});

	it("follows an already-open panel to the next trigger on ArrowRight, immediately", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		fireEvent.click(products);
		expect(panelLinks()[0]?.getAttribute("href")).toBe("/components");

		fireEvent.keyDown(products, { key: "ArrowRight" });

		expect(document.activeElement).toBe(resources);
		expect(resources.getAttribute("aria-expanded")).toBe("true");
		await settle();
		expect(panelLinks()[0]?.getAttribute("href")).toBe("/docs");
	});

	it("closes a panel that loses focus to somewhere outside it, without stealing focus back", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		// Keyboard-open, not click: focus needs to actually be inside the panel
		// (on its first link) for leaving it to mean anything — a click-open
		// leaves focus on the trigger, outside the panel already.
		fireEvent.keyDown(triggerByLabel(container, "Products"), { key: "Enter" });
		expect(document.activeElement).toBe(panelLinks()[0]);

		const elsewhere = document.createElement("button");
		document.body.appendChild(elsewhere);
		act(() => {
			elsewhere.focus();
		});

		// Focus lands wherever the browser actually put it — nothing here
		// forces it back onto the trigger the way Escape's `close()` does.
		expect(document.activeElement).toBe(elsewhere);
		await settle();
		expect(panel()).toBeNull();
		elsewhere.remove();
	});

	it("does not close when focus moves between two links inside the same panel", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		fireEvent.keyDown(triggerByLabel(container, "Products"), { key: "Enter" });
		const [, second] = panelLinks();

		act(() => {
			second!.focus();
		});

		expect(panel()).not.toBeNull();
		expect(document.activeElement).toBe(second);
		await settle();
	});

	it("clears a pending open timer on destroy so it never fires after unmount", async () => {
		const onValueChange = vi.fn();
		const { container, unmount } = render(
			<Harness items={TWO_ITEMS} onValueChange={onValueChange} openDelay={300} />
		);
		pointerEnter(triggerByLabel(container, "Products"));

		expect(() => unmount()).not.toThrow();
		await advance(1000);

		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("clears a pending close timer on destroy so it never fires after unmount", async () => {
		const onValueChange = vi.fn();
		const { container, unmount } = render(
			<Harness items={TWO_ITEMS} onValueChange={onValueChange} closeDelay={300} />
		);
		fireEvent.click(triggerByLabel(container, "Products"));
		onValueChange.mockClear();
		pointerLeave(triggerByLabel(container, "Products"));

		expect(() => unmount()).not.toThrow();
		await advance(1000);

		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("works uncontrolled, with neither value nor onValueChange passed in", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} bound={false} />);
		fireEvent.click(triggerByLabel(container, "Products"));
		expect(panel()).not.toBeNull();
		await settle();
	});

	it("round-trips the open value through a controlled value + onValueChange pair", async () => {
		const { container, getByTestId } = render(<Harness items={TWO_ITEMS} />);
		expect(getByTestId("bound-value").textContent).toBe("");

		fireEvent.click(triggerByLabel(container, "Products"));
		expect(getByTestId("bound-value").textContent).toBe("products");

		fireEvent.click(triggerByLabel(container, "Products"));
		expect(getByTestId("bound-value").textContent).toBe("");
		await settle();
	});

	it("lets a plain link live in the list alongside the disclosure items", () => {
		const { container } = render(
			<Harness items={TWO_ITEMS} extraLink={{ href: "/pricing", title: "Pricing" }} />
		);
		const link = Array.from(container.querySelectorAll("a")).find(
			(a) => a.textContent === "Pricing"
		);
		expect(link?.getAttribute("href")).toBe("/pricing");
	});

	// The entrance itself lives in `internals/motion/anchored.ts` and is
	// tested there. What is component-specific is the plumbing: the panel is
	// anchored to the whole list rather than to one trigger, and the growth
	// origin has to follow the side the anchoring hook actually resolved.
	describe("anchored entrance", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("publishes its resolved placement and grows from the edge nearest the list", async () => {
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Harness items={TWO_ITEMS} />);

			fireEvent.click(triggerByLabel(container, "Products"));
			expect(panel()).not.toBeNull();

			// jsdom has no layout engine — every rect reads as zeroes — so
			// the geometry never overflows and never flips. That makes the
			// un-flipped case the deterministic one to assert here.
			expect(panel()!.getAttribute("data-side")).toBe("bottom");
			expect(panel()!.getAttribute("data-align")).toBe("start");
			// `bottom` + `start`: the panel's own top-left corner, the one
			// touching the list it drops out of. `data-state="open"` is
			// untouched by any of this.
			expect(panel()!.style.transformOrigin).toBe("left top");
			expect(panel()!.getAttribute("data-state")).toBe("open");

			// The sampler turns the transition's `css(t, u)` into a plain
			// `Keyframe[]` and hands it straight to `element.animate()`, so the
			// spy's own arguments say exactly what moves. Two things this
			// pins: the rise starts at the shared `0.92` floor, and the four
			// pixels of `translateY` this panel used to slide are gone for
			// good. It is also the positive control for the reduced-motion
			// case below.
			await settle();
			expect(animateSpy).toHaveBeenCalled();
			const keyframes = animateSpy.mock.calls.at(-1)![0] as Keyframe[];
			expect(keyframes[0]).toEqual({ opacity: "0", transform: "scale(0.92)" });
			expect(keyframes.at(-1)).toEqual({ opacity: "1", transform: "scale(1)" });
			expect(keyframes.some((frame) => String(frame.transform).includes("translate"))).toBe(false);
		});

		it("runs no animation at all under reduced motion, and the panel is there in the same tick", async () => {
			vi.stubGlobal("matchMedia", (query: string) => ({
				matches: true,
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false,
				addListener: () => {},
				removeListener: () => {},
			}));
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Harness items={TWO_ITEMS} />);

			fireEvent.click(triggerByLabel(container, "Products"));
			expect(panel()).not.toBeNull();

			// A zero duration makes the sampler skip `element.animate()`
			// outright rather than run a zero-length animation, so no call at
			// all is the honest proof that nothing was scheduled.
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	// The exit opens a window between the dismiss and the unmount — 150 ms in
	// a browser, a couple of microtasks under the WAAPI stub. These pin what
	// has to be true inside it. Nothing a consumer can observe waits for it:
	// `value` still flips at the dismiss instant, so do the triggers'
	// `aria-expanded`, and so does the focus return, which `NavigationMenu`'s
	// own `close()` does from a plain function outside the panel.
	describe("animated exit", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(<Harness items={TWO_ITEMS} />);
			fireEvent.click(triggerByLabel(container, "Products"));
			expect(panel()!.getAttribute("data-state")).toBe("open");

			pressEscape();

			const closing = panel();
			expect(closing).toBeTruthy();
			// An ordinary React attribute here (divergence D-2), carrying
			// `surfaceState`'s two values.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// `usePresence` sets this on every registered node for the whole
			// exit — a panel on its way out must not still be handing out
			// clickable links.
			expect(closing!.inert).toBe(true);

			await settle();
			expect(panel()).toBeNull();
		});

		it("swallows a second Escape during the exit — onValueChange fires exactly once", async () => {
			const onValueChange = vi.fn();
			const { container } = render(<Harness items={TWO_ITEMS} onValueChange={onValueChange} />);
			fireEvent.click(triggerByLabel(container, "Products"));
			onValueChange.mockClear();

			pressEscape();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape();
			pressEscape();

			expect(onValueChange).toHaveBeenCalledTimes(1);
			expect(onValueChange).toHaveBeenCalledWith("");
			await settle();
		});

		// The React-specific half of the same guarantee. Above, each
		// `pressEscape()` flushes React's work, so the dismiss layer's own
		// `active` gate has already gone false by the second one. Here both
		// keys land inside ONE `act` with no render in between, which is the
		// only way to reach the case the source gets for free: its `value` is a
		// `$state` assignment, visible to the very next statement, where React
		// state is not. `setValue`'s equality guard reads a live ref for
		// exactly this.
		it("reports a dismiss once even when two Escapes land before React re-renders", async () => {
			const onValueChange = vi.fn();
			const { container } = render(<Harness items={TWO_ITEMS} onValueChange={onValueChange} />);
			fireEvent.click(triggerByLabel(container, "Products"));
			onValueChange.mockClear();

			act(() => {
				for (let i = 0; i < 2; i += 1) {
					document.dispatchEvent(
						new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
					);
				}
			});

			expect(onValueChange).toHaveBeenCalledTimes(1);
			expect(onValueChange).toHaveBeenCalledWith("");
			await settle();
		});

		it("removes the panel in the same tick again under reduced motion", () => {
			vi.stubGlobal("matchMedia", (query: string) => ({
				matches: true,
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false,
				addListener: () => {},
				removeListener: () => {},
			}));
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Harness items={TWO_ITEMS} />);

			fireEvent.click(triggerByLabel(container, "Products"));
			expect(panel()).not.toBeNull();

			pressEscape();

			// A zero duration finishes the leg synchronously and never touches
			// `element.animate()`, so the close is exactly as instant as it was
			// before this panel animated out at all — nothing to settle here,
			// and nothing allowed to be.
			expect(panel()).toBeNull();
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	// ── React-layer additions (internals contract §9.4) ──────────────────

	// The guard on the portal-mounting order. The registered node has to exist
	// by the time `usePresence`'s layout effect looks for legs to start; a
	// `Portal` that mounts in the same commit as the panel resolves its
	// container one render too late, the group settles with nothing attached,
	// and the entrance is silently skipped — every other assertion in this file
	// still passes, which is what makes it worth pinning on its own.
	it("plays an entrance leg on the panel itself when it opens from closed", async () => {
		const { container } = render(<Harness items={TWO_ITEMS} />);
		expect(FakeAnimation.instances.length).toBe(0);

		fireEvent.click(triggerByLabel(container, "Products"));
		await settle();

		const targets = FakeAnimation.instances.map((animation) => animation.target);
		expect(targets).toContain(panel());
	});

	// The leak counter the contract names for this pairing, driven through a
	// StrictMode double-invoke: push → splice → push leaves a stack of one at
	// the same depth, and the whole stack drains on unmount.
	it("drains the dismiss stack under StrictMode", async () => {
		const { container, unmount } = render(
			<StrictMode>
				<Harness items={TWO_ITEMS} />
			</StrictMode>
		);

		fireEvent.click(triggerByLabel(container, "Products"));
		await settle();
		expect(__dismissableLayerCount()).toBe(1);

		unmount();
		expect(__dismissableLayerCount()).toBe(0);
	});
});

describe("NavigationMenuLink", () => {
	afterEach(cleanup);

	it("renders the title and description by default", () => {
		const { container } = render(
			<NavigationMenuLink href="/x" title="Themes" description="Generate palettes" />
		);
		expect(container.textContent).toContain("Themes");
		expect(container.textContent).toContain("Generate palettes");
	});

	it("marks the current page with aria-current, and leaves it off otherwise", () => {
		const { container: current } = render(<NavigationMenuLink href="/x" title="X" current />);
		expect(current.querySelector("a")?.getAttribute("aria-current")).toBe("page");

		const { container: notCurrent } = render(
			<NavigationMenuLink href="/x" title="X" current={false} />
		);
		expect(notCurrent.querySelector("a")?.hasAttribute("aria-current")).toBe(false);
	});

	it("opens external links in a new tab with a safe rel, and an sr-only note", () => {
		const { container } = render(
			<NavigationMenuLink href="https://example.com" title="Example" external />
		);
		const a = container.querySelector("a");
		expect(a?.getAttribute("target")).toBe("_blank");
		expect(a?.getAttribute("rel")).toBe("noopener noreferrer");
		expect(container.textContent).toContain("(opens in a new tab)");
	});

	it("leaves target/rel unset and skips the note for a normal link", () => {
		const { container } = render(<NavigationMenuLink href="/x" title="X" external={false} />);
		const a = container.querySelector("a");
		expect(a?.hasAttribute("target")).toBe(false);
		expect(a?.hasAttribute("rel")).toBe(false);
		expect(container.textContent).not.toContain("opens in a new tab");
	});

	it("renders a children override instead of title/description when given", () => {
		const { container } = render(
			<NavigationMenuLink href="/x" title="Ignored" description="Ignored too">
				<span data-testid="custom">Custom row</span>
			</NavigationMenuLink>
		);
		expect(container.querySelector('[data-testid="custom"]')).toBeTruthy();
		expect(container.textContent).not.toContain("Ignored");
	});

	it("merges the class prop onto the anchor", () => {
		const { container } = render(
			<NavigationMenuLink href="/x" title="X" className="ft-navigation-menu-feature" />
		);
		expect(container.querySelector("a")?.className).toContain("ft-navigation-menu-feature");
	});
});
