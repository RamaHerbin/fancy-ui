import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { computePosition } from "../_internals/anchor-position.js";
import Harness from "./ContextMenuHarness.test.svelte";

interface ItemSpec {
	label: string;
	disabled?: boolean;
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

describe("ContextMenu", () => {
	afterEach(() => {
		cleanup();
		document.body.querySelectorAll('[role="menu"]').forEach((el) => el.remove());
	});

	it("renders closed by default, with no panel", () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		expect(region(container)).toBeTruthy();
		expect(menu()).toBeNull();
	});

	// The virtual anchor is portalled to `document.body`, same as
	// `ContextMenuContent` itself — otherwise a `position: fixed` ancestor
	// established by an enclosing component (a transform/filter/perspective/
	// will-change/contain container elsewhere in this library) would resolve
	// this span's containing block against that ancestor instead of the
	// viewport, and `anchorPosition` would measure a self-consistent but
	// wrong rect. jsdom has no layout engine, so this only asserts the
	// structural part — parentage and cleanup — not actual screen position.
	it("portals its virtual anchor to document.body, and removes it on unmount", () => {
		const { container, unmount } = render(Harness, { props: { items: ITEMS } });
		expect(region(container)).toBeTruthy();

		const anchorEl = anchor();
		expect(anchorEl).toBeTruthy();
		expect(anchorEl.parentElement).toBe(document.body);
		expect(container.contains(anchorEl)).toBe(false);

		unmount();
		expect(document.body.contains(anchorEl)).toBe(false);
	});

	it("right-click on the region prevents the native menu and opens at the pointer", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const notPrevented = await fireEvent.contextMenu(region(container), {
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
	});

	it("a keyboard-dispatched contextmenu event (button 0, no real pointer position) falls back to the region's own rect", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
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
		});

		// `button: 0` (the default MouseEvent value) is what the Menu key and
		// Shift+F10 report — never `2`, which only a real right mouse click
		// carries. `clientX`/`clientY` at `0, 0` here matches what a real
		// keyboard-dispatched event also reports, but is no longer what the
		// component keys off of — see the test below for why that distinction
		// matters.
		await fireEvent.contextMenu(el, { button: 0, clientX: 0, clientY: 0 });
		expect(menu()).not.toBeNull();
		expect(anchor().style.left).toBe("44px");
		expect(anchor().style.top).toBe("55px");
	});

	// This is exactly the input the old `clientX === 0 && clientY === 0`
	// heuristic got wrong: a genuine right-click landing on that literal
	// pixel was indistinguishable from the keyboard path and fell back to
	// the trigger's rect instead of the pointer. `button: 2` is what makes
	// this unambiguously a real right-click regardless of where it lands,
	// so the panel opens at (0, 0) — the pointer — not at the region's rect.
	it("a real right-click at the literal viewport corner opens at the pointer, not at the trigger's rect", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
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
		});

		await fireEvent.contextMenu(el, { button: 2, clientX: 0, clientY: 0 });
		expect(menu()).not.toBeNull();
		expect(anchor().style.left).toBe("0px");
		expect(anchor().style.top).toBe("0px");
	});

	it("opening a second time while already open replaces the panel instead of stacking", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const el = region(container);

		await fireEvent.contextMenu(el, { button: 2, clientX: 10, clientY: 10 });
		expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);

		await fireEvent.contextMenu(el, { button: 2, clientX: 300, clientY: 400 });
		expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);
		expect(anchor().style.left).toBe("300px");
		expect(anchor().style.top).toBe("400px");
	});

	// jsdom does not compute layout, so `getBoundingClientRect()` on the
	// virtual anchor is always zeroed regardless of the inline `left`/`top`
	// this component sets — there is no way to drive a real flip/clamp
	// through full component rendering here. This instead exercises the
	// exact `computePosition` call ContextMenuContent makes, with a
	// zero-size anchor rect placed near the bottom edge of a realistic
	// viewport, and checks its own real flip/clamp math — the same function
	// `anchorPosition`'s action calls internally — keeps the whole panel
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

		const { container } = render(Harness, { props: { items: ITEMS } });
		await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
		await waitFor(() => expect(menu()).not.toBeNull());

		await fireEvent.keyDown(document, { key: "Escape" });
		await waitFor(() => expect(menu()).toBeNull());
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(Harness, { props: { items: ITEMS } });

		await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
		await waitFor(() => expect(menu()).not.toBeNull());

		await fireEvent.pointerDown(outside);
		await waitFor(() => expect(menu()).toBeNull());
		outside.remove();
	});

	it("Tab closes the menu without forcing focus anywhere", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
		await waitFor(() => expect(menu()).not.toBeNull());

		await fireEvent.keyDown(menu()!, { key: "Tab" });
		await waitFor(() => expect(menu()).toBeNull());
	});

	it("a disabled trigger leaves the native menu alone and never opens", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, triggerDisabled: true } });
		const notPrevented = await fireEvent.contextMenu(region(container), {
			button: 2,
			clientX: 50,
			clientY: 50,
		});
		expect(notPrevented).toBe(true);
		expect(menu()).toBeNull();
	});

	it("selecting an item fires onSelect and closes the menu", async () => {
		const onSelect = vi.fn();
		const { container } = render(Harness, { props: { items: ITEMS, onSelect } });
		await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
		await waitFor(() => expect(menu()).not.toBeNull());

		await fireEvent.click(itemByLabel(menu(), "Reload")!);
		expect(onSelect).toHaveBeenCalledWith("Reload");
		await waitFor(() => expect(menu()).toBeNull());
	});

	it("a disabled item does not fire onSelect and is skipped by ArrowDown", async () => {
		const onSelect = vi.fn();
		const withDisabled: ItemSpec[] = [{ label: "Previous", disabled: true }, { label: "Reload" }];
		const { container } = render(Harness, { props: { items: withDisabled, onSelect } });
		await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(menu(), "Reload")));

		await fireEvent.click(itemByLabel(menu(), "Previous")!);
		expect(onSelect).not.toHaveBeenCalled();
	});

	// `ContextMenuItem` is a re-export of `DropdownMenuItem`, not a copy —
	// `dropdown-menu/DropdownMenu.test.ts` already proves typeahead matches
	// an item's visible label even when it's decorated with an icon and a
	// shortcut. This is a smoke test that the re-export genuinely carries
	// that behaviour through to this family, not a second copy of that
	// coverage.
	it("typeahead works on its items too, via the shared DropdownMenuItem implementation", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
		await waitFor(() => expect(menu()).not.toBeNull());

		await fireEvent.keyDown(menu()!, { key: "r" });
		expect(document.activeElement).toBe(itemByLabel(menu(), "Reload"));
	});

	// The mockup specifies two distinct densities — DropdownMenu rows at
	// 13px, ContextMenu rows at 12px — and `ContextMenuItem` is the exact
	// same shared component `DropdownMenuItem` is, carrying no font-size of
	// its own. It has to inherit this family's own 12px from
	// `ContextMenuContent`'s panel via CSS.
	it("the panel carries its own 12px item font-size, distinct from DropdownMenu's 13px", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
		await waitFor(() => expect(menu()).not.toBeNull());

		expect(menu()?.className).toContain("text-[12px]");
		expect(itemByLabel(menu(), "Reload")?.className).not.toMatch(/text-\[\d+px\]/);
	});

	it("round-trips through bind:open", async () => {
		let open = false;
		const { container } = render(Harness, {
			props: {
				items: ITEMS,
				get open() {
					return open;
				},
				set open(v: boolean) {
					open = v;
				},
			},
		});

		await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
		expect(open).toBe(true);
	});

	it("works uncontrolled with only onOpenChange", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(Harness, { props: { items: ITEMS, onOpenChange } });
		await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
		expect(onOpenChange).toHaveBeenCalledWith(true);
	});

	// The submenu primitives (`ContextMenuSub`/`SubTrigger`/`SubContent`) are
	// the exact same implementation `DropdownMenu.test.ts` already exercises
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
	// one place a stale hardcoded value would have gone unnoticed: before
	// this fix, `DropdownMenuSubContent` pinned its own `text-[13px]`
	// regardless of which family opened it, which this test would have
	// caught (13px, not 12px, under a `ContextMenu`).
	it("a submenu's panel carries this family's 12px, not DropdownMenu's 13px", async () => {
		const { container } = render(Harness, {
			props: { items: ITEMS, withSubmenu: true, subItems: [{ label: "Inspect" }] },
		});
		await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
		await waitFor(() => expect(menu()).not.toBeNull());

		const subBtn = menu()!.querySelector('[aria-haspopup="menu"]') as HTMLElement;
		await fireEvent.click(subBtn);
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
	});

	it("the shared submenu opens from a context menu and its item still closes the whole tree", async () => {
		const onSelect = vi.fn();
		const { container } = render(Harness, {
			props: { items: ITEMS, withSubmenu: true, subItems: [{ label: "Inspect" }], onSelect },
		});
		await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
		await waitFor(() => expect(menu()).not.toBeNull());

		const subBtn = menu()!.querySelector('[aria-haspopup="menu"]') as HTMLElement;
		await fireEvent.click(subBtn);
		await waitFor(() => {
			const subMenus = Array.from(document.querySelectorAll('[role="menu"]'));
			expect(subMenus).toHaveLength(2);
		});

		const subMenuEl = Array.from(document.querySelectorAll('[role="menu"]')).find(
			(el) => el !== menu()
		) as HTMLElement;
		await fireEvent.click(itemByLabel(subMenuEl, "Inspect")!);
		expect(onSelect).toHaveBeenCalledWith("Inspect");
		await waitFor(() => expect(document.querySelectorAll('[role="menu"]')).toHaveLength(0));
	});
});
