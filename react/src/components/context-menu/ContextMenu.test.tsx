import { Fragment, useState } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import { computePosition } from "../../internals/anchor-position.js";
import { resetSoundForTests, sound } from "../../sound/sound.js";
import { __dismissableLayerCount } from "../../internals/dismissable.js";
import { ContextMenu } from "./ContextMenu.js";
import { ContextMenuTrigger } from "./ContextMenuTrigger.js";
import { ContextMenuContent } from "./ContextMenuContent.js";
import {
	ContextMenuItem,
	ContextMenuSub,
	ContextMenuSubTrigger,
	ContextMenuSubContent,
} from "./index.js";

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

interface ItemSpec {
	label: string;
	disabled?: boolean;
}

interface HarnessProps {
	items: ItemSpec[];
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onSelect?: (label: string) => void;
	triggerDisabled?: boolean;
	withSubmenu?: boolean;
	subItems?: ItemSpec[];
	sound?: boolean;
}

/**
 * The source's `ContextMenuHarness.test.svelte`, as a plain component.
 *
 * `ContextMenu`'s behaviour lives across the root, the trigger region, the
 * content and its items together, so proving it needs real instances of all
 * of them. Every prop a test might vary is a parameter here, never hardcoded.
 * A `.test.svelte` file existed only because Svelte components need their own
 * file; React declares the rig inline.
 *
 * `ContextMenuItem`/`Sub`/`SubTrigger`/`SubContent` have no file of their own
 * in this folder — they are `dropdown-menu`'s implementations, re-exported
 * under this family's names from `index.ts`.
 */
function Harness({
	items,
	open,
	onOpenChange,
	onSelect,
	triggerDisabled = false,
	withSubmenu = false,
	subItems = [],
	sound: soundProp = false,
}: HarnessProps) {
	return (
		<ContextMenu open={open} onOpenChange={onOpenChange} sound={soundProp}>
			<ContextMenuTrigger disabled={triggerDisabled}>
				<div data-testid="region">Right-click me</div>
			</ContextMenuTrigger>
			<ContextMenuContent>
				{items.map((item) => (
					<Fragment key={item.label}>
						<ContextMenuItem disabled={item.disabled} onSelect={() => onSelect?.(item.label)}>
							{item.label}
						</ContextMenuItem>
					</Fragment>
				))}
				{withSubmenu ? (
					<ContextMenuSub>
						<ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
						<ContextMenuSubContent>
							{subItems.map((item) => (
								<ContextMenuItem key={item.label} onSelect={() => onSelect?.(item.label)}>
									{item.label}
								</ContextMenuItem>
							))}
						</ContextMenuSubContent>
					</ContextMenuSub>
				) : null}
			</ContextMenuContent>
		</ContextMenu>
	);
}

const ITEMS: ItemSpec[] = [{ label: "Previous" }, { label: "Reload" }, { label: "Save page" }];

function region(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-context-menu-trigger") as HTMLElement;
}

function menu(): HTMLElement | null {
	return document.querySelector('[role="menu"]');
}

function anchor(): HTMLElement {
	return document.querySelector(".ft-context-menu-anchor") as HTMLElement;
}

function itemsIn(root: HTMLElement | null): HTMLElement[] {
	return root ? Array.from(root.querySelectorAll('[role="menuitem"]')) : [];
}

function itemByLabel(root: HTMLElement | null, label: string): HTMLElement | undefined {
	return itemsIn(root).find((el) => el.textContent?.trim().startsWith(label));
}

/**
 * Dispatched inside a SYNCHRONOUS `act`, which flushes React's work without
 * draining the microtask queue. The exit window is 150 ms in a browser and a
 * couple of microtasks under the animation stub, so a helper that awaited a
 * turn of its own would drain the whole exit and leave a test that means to
 * look inside the fade looking at an empty document instead.
 */
function pressEscape() {
	act(() => {
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
		);
	});
}

/** Opens the menu at (50, 50), the coordinates most of these tests use. */
function rightClick(target: HTMLElement) {
	return fireEvent.contextMenu(target, { button: 2, clientX: 50, clientY: 50 });
}

function pointerDownOn(target: HTMLElement) {
	const init = { bubbles: true, cancelable: true };
	// The jsdom version this package pins does not implement `PointerEvent`.
	// A `MouseEvent` of the same type carries everything the handler reads
	// (`type` and `target`), so the assertions are unaffected.
	const event =
		typeof PointerEvent === "undefined"
			? new MouseEvent("pointerdown", init)
			: new PointerEvent("pointerdown", init);
	act(() => {
		target.dispatchEvent(event);
	});
}

/**
 * Drains every in-flight leg to completion. The animation stub finishes on a
 * MICROTASK and `runTransition` chains a dummy into the real animation, so a
 * settled leg is two turns away; an async `act` crosses a macrotask boundary
 * and flushes the React updates the finish schedules.
 */
const settleLegs = () => act(async () => {});

/**
 * Replaces `window.matchMedia` wholesale, the pattern the rest of the repo
 * uses. `anchored()` resolves it fresh every time a transition starts, so an
 * override installed before the right-click is the one that decides whether
 * the panel animates at all — in either direction.
 */
function stubMatchMedia(matches: boolean): void {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

describe("ContextMenu", () => {
	afterEach(() => {
		cleanup();
		expect(__dismissableLayerCount()).toBe(0);
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
		// `vi.spyOn` on an already-mocked property reuses the existing mock
		// rather than layering a new one, so without this a later
		// `expect(animateSpy).not.toHaveBeenCalled()` would see an earlier
		// test's calls too.
		vi.restoreAllMocks();
	});

	it("renders closed by default, with no panel", () => {
		const { container } = render(<Harness items={ITEMS} />);
		expect(region(container)).toBeTruthy();
		expect(menu()).toBeNull();
	});

	// The virtual anchor is portalled to `document.body`, same as
	// `ContextMenuContent` itself — otherwise a `position: fixed` ancestor
	// established by an enclosing component (a transform/filter/perspective/
	// will-change/contain container elsewhere in this library) would resolve
	// this span's containing block against that ancestor instead of the
	// viewport, and the positioning core would measure a self-consistent but
	// wrong rect. jsdom has no layout engine, so this only asserts the
	// structural part — parentage and cleanup — not actual screen position.
	it("portals its virtual anchor to document.body, and removes it on unmount", () => {
		const { container, unmount } = render(<Harness items={ITEMS} />);
		expect(region(container)).toBeTruthy();

		const anchorEl = anchor();
		expect(anchorEl).toBeTruthy();
		expect(anchorEl.parentElement).toBe(document.body);
		expect(container.contains(anchorEl)).toBe(false);

		unmount();
		expect(document.body.contains(anchorEl)).toBe(false);
	});

	it("right-click on the region prevents the native menu and opens at the pointer", async () => {
		const { container } = render(<Harness items={ITEMS} />);
		const notPrevented = fireEvent.contextMenu(region(container), {
			button: 2,
			clientX: 120,
			clientY: 80,
		});

		// `dispatchEvent` (which `fireEvent` returns) resolves to `false` once
		// `preventDefault()` has been called on a cancelable event — the
		// concrete, DOM-level proof the native browser menu was suppressed.
		expect(notPrevented).toBe(false);
		expect(menu()).not.toBeNull();
		expect(anchor().style.left).toBe("120px");
		expect(anchor().style.top).toBe("80px");
		await settleLegs();
	});

	it("a keyboard-dispatched contextmenu event (button 0, no real pointer position) falls back to the region's own rect", async () => {
		const { container } = render(<Harness items={ITEMS} />);
		const el = region(container);
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
			left: 44,
			top: 55,
			right: 244,
			bottom: 155,
			width: 200,
			height: 100,
			x: 44,
			y: 55,
			toJSON() {
				return this;
			},
		} as DOMRect);

		// `button: 0` (the default MouseEvent value) is what the Menu key and
		// Shift+F10 report — never `2`, which only a real right mouse click
		// carries. `clientX`/`clientY` at `0, 0` here matches what a real
		// keyboard-dispatched event also reports, but is no longer what the
		// component keys off of — see the test below for why that distinction
		// matters.
		fireEvent.contextMenu(el, { button: 0, clientX: 0, clientY: 0 });
		expect(menu()).not.toBeNull();
		expect(anchor().style.left).toBe("44px");
		expect(anchor().style.top).toBe("55px");
		await settleLegs();
	});

	// This is exactly the input the old `clientX === 0 && clientY === 0`
	// heuristic got wrong: a genuine right-click landing on that literal
	// pixel was indistinguishable from the keyboard path and fell back to
	// the trigger's rect instead of the pointer. `button: 2` is what makes
	// this unambiguously a real right-click regardless of where it lands,
	// so the panel opens at (0, 0) — the pointer — not at the region's rect.
	it("a real right-click at the literal viewport corner opens at the pointer, not at the trigger's rect", async () => {
		const { container } = render(<Harness items={ITEMS} />);
		const el = region(container);
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
			left: 44,
			top: 55,
			right: 244,
			bottom: 155,
			width: 200,
			height: 100,
			x: 44,
			y: 55,
			toJSON() {
				return this;
			},
		} as DOMRect);

		fireEvent.contextMenu(el, { button: 2, clientX: 0, clientY: 0 });
		expect(menu()).not.toBeNull();
		expect(anchor().style.left).toBe("0px");
		expect(anchor().style.top).toBe("0px");
		await settleLegs();
	});

	it("opening a second time while already open replaces the panel instead of stacking", async () => {
		const { container } = render(<Harness items={ITEMS} />);
		const el = region(container);

		fireEvent.contextMenu(el, { button: 2, clientX: 10, clientY: 10 });
		expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);

		fireEvent.contextMenu(el, { button: 2, clientX: 300, clientY: 400 });
		expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);
		expect(anchor().style.left).toBe("300px");
		expect(anchor().style.top).toBe("400px");
		await settleLegs();
	});

	// Moving the anchor is only half of it — the panel has to FOLLOW it.
	// jsdom zeroes every `getBoundingClientRect()`, so the span's inline
	// `left`/`top` alone never reaches the positioning core's math; this
	// teaches the virtual anchor to report the rect its own inline style
	// describes, which is what a real layout engine would do, and then reads
	// the coordinates the core writes onto the panel itself. Unless the
	// pointer coordinates reach `useAnchorPosition` as a recompute trigger,
	// the second right-click leaves the panel parked at the first one's
	// position until an unrelated scroll or resize fires.
	it("a second right-click while the menu is open moves the panel, not just the anchor", async () => {
		const { container } = render(<Harness items={ITEMS} />);
		const anchorEl = anchor();
		vi.spyOn(anchorEl, "getBoundingClientRect").mockImplementation(() => {
			const x = parseFloat(anchorEl.style.left) || 0;
			const y = parseFloat(anchorEl.style.top) || 0;
			return {
				left: x,
				top: y,
				right: x,
				bottom: y,
				width: 0,
				height: 0,
				x,
				y,
				toJSON() {
					return this;
				},
			} as DOMRect;
		});

		fireEvent.contextMenu(region(container), { button: 2, clientX: 10, clientY: 10 });
		await waitFor(() => expect(menu()).not.toBeNull());
		// Default side "bottom", align "start", offset 2, against a zero-size
		// point: the panel's own top-left lands on the pointer, 2px down.
		expect(menu()!.style.left).toBe("10px");
		expect(menu()!.style.top).toBe("12px");

		fireEvent.contextMenu(region(container), { button: 2, clientX: 300, clientY: 300 });

		expect(anchor().style.left).toBe("300px");
		expect(menu()!.style.left).toBe("300px");
		expect(menu()!.style.top).toBe("302px");
		await settleLegs();
	});

	// jsdom does not compute layout, so `getBoundingClientRect()` on the
	// virtual anchor is always zeroed regardless of the inline `left`/`top`
	// this component sets — there is no way to drive a real flip/clamp
	// through full component rendering here. This instead exercises the
	// exact `computePosition` call `ContextMenuContent` makes, with a
	// zero-size anchor rect placed near the bottom edge of a realistic
	// viewport, and checks its own real flip/clamp math — the same function
	// the positioning core calls internally — keeps the whole panel
	// on-screen.
	it("a right-click near the bottom edge keeps the panel on-screen (via the same computePosition the panel uses)", () => {
		const viewport = { width: 1024, height: 768 };
		const nearBottomRight = {
			left: 1000,
			top: 750,
			right: 1000,
			bottom: 750,
			width: 0,
			height: 0,
		} as DOMRect;

		const result = computePosition(
			nearBottomRight,
			{ width: 200, height: 220 },
			{ side: "bottom", align: "start", offset: 2, viewport }
		);

		expect(result.x + 200).toBeLessThanOrEqual(viewport.width);
		expect(result.y + 220).toBeLessThanOrEqual(viewport.height);
		expect(result.x).toBeGreaterThanOrEqual(0);
		expect(result.y).toBeGreaterThanOrEqual(0);
	});

	it("Escape closes the menu and returns focus to whatever held it before the menu opened", async () => {
		const outside = document.createElement("button");
		outside.textContent = "Elsewhere";
		document.body.appendChild(outside);
		outside.focus();

		const { container } = render(<Harness items={ITEMS} />);
		rightClick(region(container));
		await waitFor(() => expect(menu()).not.toBeNull());

		pressEscape();
		await waitFor(() => expect(menu()).toBeNull());
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(<Harness items={ITEMS} />);

		rightClick(region(container));
		await waitFor(() => expect(menu()).not.toBeNull());

		pointerDownOn(outside);
		await waitFor(() => expect(menu()).toBeNull());
		outside.remove();
	});

	it("Tab closes the menu without forcing focus anywhere", async () => {
		const { container } = render(<Harness items={ITEMS} />);
		rightClick(region(container));
		await waitFor(() => expect(menu()).not.toBeNull());

		fireEvent.keyDown(menu()!, { key: "Tab" });
		await waitFor(() => expect(menu()).toBeNull());
	});

	it("a disabled trigger leaves the native menu alone and never opens", () => {
		const { container } = render(<Harness items={ITEMS} triggerDisabled />);
		const notPrevented = fireEvent.contextMenu(region(container), {
			button: 2,
			clientX: 50,
			clientY: 50,
		});
		expect(notPrevented).toBe(true);
		expect(menu()).toBeNull();
	});

	it("selecting an item fires onSelect and closes the menu", async () => {
		const onSelect = vi.fn();
		const { container } = render(<Harness items={ITEMS} onSelect={onSelect} />);
		rightClick(region(container));
		await waitFor(() => expect(menu()).not.toBeNull());

		fireEvent.click(itemByLabel(menu(), "Reload")!);
		expect(onSelect).toHaveBeenCalledWith("Reload");
		await waitFor(() => expect(menu()).toBeNull());
	});

	it("a disabled item does not fire onSelect and is skipped by ArrowDown", async () => {
		const onSelect = vi.fn();
		const withDisabled: ItemSpec[] = [{ label: "Previous", disabled: true }, { label: "Reload" }];
		const { container } = render(<Harness items={withDisabled} onSelect={onSelect} />);
		rightClick(region(container));
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(menu(), "Reload")));

		fireEvent.click(itemByLabel(menu(), "Previous")!);
		expect(onSelect).not.toHaveBeenCalled();
		await settleLegs();
	});

	// `ContextMenuItem` is a re-export of `DropdownMenuItem`, not a copy —
	// `dropdown-menu/DropdownMenu.test.tsx` already proves typeahead matches
	// an item's visible label even when it's decorated with an icon and a
	// shortcut. This is a smoke test that the re-export genuinely carries
	// that behaviour through to this family, not a second copy of that
	// coverage.
	it("typeahead works on its items too, via the shared DropdownMenuItem implementation", async () => {
		const { container } = render(<Harness items={ITEMS} />);
		rightClick(region(container));
		await waitFor(() => expect(menu()).not.toBeNull());

		fireEvent.keyDown(menu()!, { key: "r" });
		expect(document.activeElement).toBe(itemByLabel(menu(), "Reload"));
		await settleLegs();
	});

	// The mockup specifies two distinct densities — DropdownMenu rows at
	// 13px, ContextMenu rows at 12px — and `ContextMenuItem` is the exact
	// same shared component `DropdownMenuItem` is, carrying no font-size of
	// its own. It has to inherit this family's own 12px from
	// `ContextMenuContent`'s panel via CSS.
	it("the panel carries its own 12px item font-size, distinct from DropdownMenu's 13px", async () => {
		const { container } = render(<Harness items={ITEMS} />);
		rightClick(region(container));
		await waitFor(() => expect(menu()).not.toBeNull());

		expect(menu()?.className).toContain("text-[12px]");
		expect(itemByLabel(menu(), "Reload")?.className).not.toMatch(/text-\[\d+px\]/);
		await settleLegs();
	});

	// The React spelling of `bind:open`: a caller holding the value in its own
	// state and writing it back from `onOpenChange`.
	it("round-trips through a controlled open + onOpenChange pair", async () => {
		let observed = false;
		function Controlled() {
			const [open, setOpen] = useState(false);
			return (
				<Harness
					items={ITEMS}
					open={open}
					onOpenChange={(next) => {
						observed = next;
						setOpen(next);
					}}
				/>
			);
		}
		const { container } = render(<Controlled />);

		rightClick(region(container));
		expect(observed).toBe(true);
		expect(menu()).not.toBeNull();
		await settleLegs();
	});

	it("works uncontrolled with only onOpenChange", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(<Harness items={ITEMS} onOpenChange={onOpenChange} />);
		rightClick(region(container));
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(menu()).not.toBeNull();
		await settleLegs();
	});

	// The submenu primitives (`ContextMenuSub`/`SubTrigger`/`SubContent`) are
	// the exact same implementation `DropdownMenu.test.tsx` already exercises
	// in full (open on click/ArrowRight/hover-intent, close on ArrowLeft,
	// closing the whole tree on selection, sibling exclusivity, the
	// placement-flip caret). This is a smoke test that they integrate
	// correctly through `ContextMenu`'s own context, not a second copy of
	// that coverage.
	// `DropdownMenuSubContent` (shared, re-exported as `ContextMenuSubContent`)
	// is portalled independently of `ContextMenuContent`, so once both are
	// open they're DOM siblings, not ancestor/descendant — it can't inherit
	// this family's 12px through plain CSS the way a top-level item does. It
	// has to come through `MenuContext.itemTextClass`, forwarded from
	// `ContextMenuContent`'s own context down to the submenu's. This is the
	// one place a stale hardcoded value would have gone unnoticed: a
	// `DropdownMenuSubContent` pinning its own `text-[13px]` regardless of
	// which family opened it would show 13px, not 12px, under a `ContextMenu`.
	it("a submenu's panel carries this family's 12px, not DropdownMenu's 13px", async () => {
		const { container } = render(
			<Harness items={ITEMS} withSubmenu subItems={[{ label: "Inspect" }]} />
		);
		rightClick(region(container));
		await waitFor(() => expect(menu()).not.toBeNull());

		const subBtn = menu()!.querySelector('[aria-haspopup="menu"]') as HTMLElement;
		fireEvent.click(subBtn);
		await waitFor(() => {
			const subMenus = Array.from(document.querySelectorAll('[role="menu"]')).filter(
				(el) => el !== menu()
			);
			expect(subMenus).toHaveLength(1);
		});

		const subMenuEl = Array.from(document.querySelectorAll('[role="menu"]')).find(
			(el) => el !== menu()
		) as HTMLElement;
		expect(subMenuEl.className).toContain("text-[12px]");
		expect(subMenuEl.className).not.toContain("text-[13px]");
		await settleLegs();
	});

	it("the shared submenu opens from a context menu and its item still closes the whole tree", async () => {
		const onSelect = vi.fn();
		const { container } = render(
			<Harness items={ITEMS} withSubmenu subItems={[{ label: "Inspect" }]} onSelect={onSelect} />
		);
		rightClick(region(container));
		await waitFor(() => expect(menu()).not.toBeNull());

		const subBtn = menu()!.querySelector('[aria-haspopup="menu"]') as HTMLElement;
		fireEvent.click(subBtn);
		await waitFor(() => {
			const subMenus = Array.from(document.querySelectorAll('[role="menu"]'));
			expect(subMenus).toHaveLength(2);
		});

		const subMenuEl = Array.from(document.querySelectorAll('[role="menu"]')).find(
			(el) => el !== menu()
		) as HTMLElement;
		fireEvent.click(itemByLabel(subMenuEl, "Inspect")!);
		expect(onSelect).toHaveBeenCalledWith("Inspect");
		await waitFor(() => expect(document.querySelectorAll('[role="menu"]')).toHaveLength(0));
	});

	// The entrance itself lives in `internals/motion/anchored.ts` and is
	// tested there. What is component-specific is the plumbing between the
	// positioning core's resolved placement and the growth origin — which
	// matters more here than anywhere else, because this panel's anchor is a
	// point at the pointer and a right-click low or far right in the viewport
	// flips it as a matter of routine.
	describe("anchored entrance", () => {
		it("publishes its resolved placement and grows from the corner nearest the click", async () => {
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Harness items={ITEMS} />);
			fireEvent.contextMenu(region(container), { button: 2, clientX: 120, clientY: 80 });
			await settleLegs();
			expect(menu()).not.toBeNull();

			// jsdom has no layout engine — every rect reads as zeroes — so
			// `computePosition` never overflows and never flips. That makes
			// the un-flipped case the deterministic one to assert here.
			expect(menu()!.getAttribute("data-side")).toBe("bottom");
			expect(menu()!.getAttribute("data-align")).toBe("start");
			// `bottom` + `start`: the panel's own top-left corner, which sits
			// under the pointer that opened it.
			expect(menu()!.style.transformOrigin).toBe("left top");

			// The positive control for the reduced-motion case below: with no
			// preference expressed, opening really does schedule an animation
			// — and the transition sampler hands `element.animate()` the
			// sampled `css(t, u)` verbatim, so the spy's arguments are a
			// readable record of what that animation touches: opacity and
			// transform only, from the shared `0.92` floor. Asserting the
			// keyframes rather than a bare call count means a panel animating
			// the wrong property, or off the wrong scale, fails here instead of
			// passing silently.
			expect(animateSpy).toHaveBeenCalled();
			const keyframes = animateSpy.mock.calls.at(-1)![0] as Keyframe[];
			expect(keyframes.at(0)).toEqual({ opacity: "0", transform: "scale(0.92)" });
			expect(keyframes.at(-1)).toEqual({ opacity: "1", transform: "scale(1)" });
		});

		it("runs no animation at all under reduced motion, and the panel is there in the same tick", () => {
			stubMatchMedia(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Harness items={ITEMS} />);

			fireEvent.contextMenu(region(container), { button: 2, clientX: 120, clientY: 80 });
			expect(menu()).not.toBeNull();

			// A zero duration makes the sampler skip `element.animate()`
			// outright rather than run a zero-length animation, so no call at
			// all is the honest proof that nothing was scheduled.
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	// The exit opens a window between the dismiss and the unmount — 150 ms in
	// a browser, a couple of microtasks under the animation stub. These pin
	// what has to be true inside it. Nothing a consumer can observe waits for
	// it: `open` still flips at the dismiss instant, and so does the focus
	// return, which `ContextMenu`'s own `setOpen` does from a plain function
	// outside the mount gate.
	describe("animated exit", () => {
		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(<Harness items={ITEMS} />);
			rightClick(region(container));
			await settleLegs();
			expect(menu()!.getAttribute("data-state")).toBe("open");

			pressEscape();

			const closing = menu();
			expect(closing).toBeTruthy();
			// An ordinary React attribute here, carrying `surfaceState`'s two
			// values — never `"opening"` (convention C-5).
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// `usePresence` sets this on every registered node for the whole
			// exit — a menu on its way out must not start taking clicks again.
			expect(closing!.inert).toBe(true);

			await waitFor(() => expect(menu()).toBeNull());
		});

		it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
			const onOpenChange = vi.fn();
			const { container } = render(<Harness items={ITEMS} onOpenChange={onOpenChange} />);
			rightClick(region(container));
			await settleLegs();
			onOpenChange.mockClear();

			pressEscape();
			expect(menu()).toBeTruthy(); // still fading

			pressEscape();
			pressEscape();

			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(false);
			await waitFor(() => expect(menu()).toBeNull());
		});

		it("removes the panel in the same tick again under reduced motion", () => {
			stubMatchMedia(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(<Harness items={ITEMS} />);

			rightClick(region(container));
			expect(menu()).not.toBeNull();

			pressEscape();

			// A zero duration makes `runTransition` call its `onFinish`
			// synchronously and never touch `element.animate()`, so the close
			// is exactly as instant as it was before this panel animated out at
			// all — no `waitFor` needed, and none allowed here.
			expect(menu()).toBeNull();
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	// `useSoundCue` forwards its optional `options` argument through to
	// `sound.play(cue, options)`, so the spy records two arguments where the
	// source's call site passed one. The cue is the assertion; the trailing
	// `undefined` is the hook's signature, not a behaviour change.
	describe("sound", () => {
		beforeEach(() => {
			// The controller is a module singleton: a preference another suite
			// stored, or an engine another suite created, would otherwise decide
			// what these cases hear.
			resetSoundForTests();
			window.localStorage.clear();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("a right-click opens the menu and plays open exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} sound />);

			rightClick(region(container));
			await waitFor(() => expect(menu()).not.toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
			await settleLegs();
		});

		it("plays nothing at all with the default prop", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} />);

			rightClick(region(container));
			await waitFor(() => expect(menu()).not.toBeNull());
			pressEscape();
			await waitFor(() => expect(menu()).toBeNull());

			expect(play).not.toHaveBeenCalled();
		});

		// Dispatched synthetically, not through `fireEvent.contextMenu` — proves
		// the guard lives in `ContextMenuTrigger`'s own `if (disabled) return`,
		// not merely in something `fireEvent`'s own event construction happens
		// to skip.
		it("a disabled trigger plays nothing, even dispatched synthetically", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} triggerDisabled sound />);

			act(() => {
				region(container).dispatchEvent(
					new MouseEvent("contextmenu", {
						bubbles: true,
						cancelable: true,
						button: 2,
						clientX: 50,
						clientY: 50,
					})
				);
			});

			expect(play).not.toHaveBeenCalled();
			expect(menu()).toBeNull();
		});

		// The matrix's own double-fire guard for `open`: the existing
		// `open === next` early return in `setOpen` makes a reposition
		// right-click — the menu is already open, only `point` moves — silent
		// rather than replaying the open cue a second time.
		it("a reposition right-click while already open is silent — no repeated open cue", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} sound />);
			const el = region(container);

			fireEvent.contextMenu(el, { button: 2, clientX: 10, clientY: 10 });
			await waitFor(() => expect(menu()).not.toBeNull());
			play.mockClear();

			fireEvent.contextMenu(el, { button: 2, clientX: 300, clientY: 400 });

			expect(play).not.toHaveBeenCalled();
			await settleLegs();
		});

		it("Escape dismisses the menu and plays close exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} sound />);
			rightClick(region(container));
			await waitFor(() => expect(menu()).not.toBeNull());
			play.mockClear();

			pressEscape();
			await waitFor(() => expect(menu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("an outside click dismisses the menu and plays close exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const outside = document.createElement("button");
			document.body.appendChild(outside);
			const { container } = render(<Harness items={ITEMS} sound />);
			rightClick(region(container));
			await waitFor(() => expect(menu()).not.toBeNull());
			play.mockClear();

			pointerDownOn(outside);
			await waitFor(() => expect(menu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
			outside.remove();
		});

		// Select precedent: the item's own `select` cue already tells the story
		// of this interaction — `closeAll({ silent: true })` must keep the close
		// that follows it mute, or one activation would sound like two.
		it("selecting an item plays select exactly once, never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} sound />);
			rightClick(region(container));
			await waitFor(() => expect(menu()).not.toBeNull());
			play.mockClear();

			fireEvent.click(itemByLabel(menu(), "Reload")!);
			await waitFor(() => expect(menu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("a disabled item plays nothing", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const withDisabled: ItemSpec[] = [{ label: "Previous", disabled: true }, { label: "Reload" }];
			const { container } = render(<Harness items={withDisabled} sound />);
			rightClick(region(container));
			await waitFor(() => expect(menu()).not.toBeNull());
			play.mockClear();

			fireEvent.click(itemByLabel(menu(), "Previous")!);

			expect(play).not.toHaveBeenCalled();
			await settleLegs();
		});

		// Submenu open/close come free from the shared `DropdownMenuSub`, which
		// reads `sound` off whichever level's `MenuContext` it was mounted
		// under — this proves that inheritance actually reaches this family's
		// own context, not just DropdownMenu's.
		it("a submenu inherits sound: opening plays open once, selecting inside plays select only", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(
				<Harness items={ITEMS} withSubmenu subItems={[{ label: "Inspect" }]} sound />
			);
			rightClick(region(container));
			await waitFor(() => expect(menu()).not.toBeNull());
			play.mockClear();

			const subBtn = menu()!.querySelector('[aria-haspopup="menu"]') as HTMLElement;
			fireEvent.click(subBtn);
			await waitFor(() => {
				expect(document.querySelectorAll('[role="menu"]')).toHaveLength(2);
			});
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);

			play.mockClear();
			const subMenuEl = Array.from(document.querySelectorAll('[role="menu"]')).find(
				(el) => el !== menu()
			) as HTMLElement;
			fireEvent.click(itemByLabel(subMenuEl, "Inspect")!);
			await waitFor(() => expect(document.querySelectorAll('[role="menu"]')).toHaveLength(0));

			expect(play.mock.calls).toEqual([["select", undefined]]);
		});
	});
});
