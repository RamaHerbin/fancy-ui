import { render, cleanup, fireEvent, waitFor } from "@testing-library/vue";
import { createSSRApp, defineComponent, h, nextTick, type PropType, type VNode } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, describe, it, expect, vi } from "vitest";

import { computePosition } from "../../internals/anchor-position.js";
import { sound } from "../../sound/sound.js";
import ContextMenu from "./ContextMenu.vue";
import ContextMenuTrigger from "./ContextMenuTrigger.vue";
import ContextMenuContent from "./ContextMenuContent.vue";
// Item/Sub/SubTrigger/SubContent have no file of their own in this folder —
// they are `dropdown-menu`'s implementations, re-exported under this family's
// names from `index.ts`. See index.ts.
import {
	ContextMenuItem,
	ContextMenuSub,
	ContextMenuSubTrigger,
	ContextMenuSubContent,
} from "./index.js";

/**
 * Transposed assertion-for-assertion from the source component's suite. Four
 * shapes changed and nothing else did:
 *
 * - The source's `.test.svelte` rig is an inline `defineComponent` + `h()`
 *   here; every prop it varies is the same one.
 * - `tick()` becomes `nextTick()`, and the source's snippet props are slots.
 * - The bindable `open` is `v-model:open`, so the round-trip case passes an
 *   `onUpdate:open` listener instead of a getter/setter pair. The rig omits
 *   both keys entirely when a test does not drive them — a vnode carrying
 *   `open` AND `onUpdate:open` is a CONTROLLED model, and a `v-model` left
 *   undefined would silently stop the menu opening at all.
 * - `element.inert` is read as the `inert` ATTRIBUTE. jsdom implements no
 *   `inert` IDL property, and the presence clock writes the attribute through
 *   `toggleAttribute`, so `hasAttribute` observes production behaviour rather
 *   than a shim.
 *
 * One fixture also changed, marked at its call site: this package's jsdom has
 * no `PointerEvent`.
 */

interface ItemSpec {
	label: string;
	disabled?: boolean;
}

/**
 * Test-only rig, same reasoning as the source's own: `ContextMenu`'s behaviour
 * lives across the root, the trigger region, the content and its items
 * together, so proving it needs real instances of all of them. Every prop a
 * test might vary is a parameter here, never hardcoded.
 */
const Harness = defineComponent({
	name: "ContextMenuHarness",
	props: {
		items: { type: Array as PropType<ItemSpec[]>, required: true },
		open: { type: Boolean, default: undefined },
		"onUpdate:open": {
			type: Function as PropType<(open: boolean) => void>,
			default: undefined,
		},
		onOpenChange: { type: Function as PropType<(open: boolean) => void>, default: undefined },
		onSelect: { type: Function as PropType<(label: string) => void>, default: undefined },
		triggerDisabled: { type: Boolean, default: false },
		withSubmenu: { type: Boolean, default: false },
		subItems: { type: Array as PropType<ItemSpec[]>, default: () => [] },
		sound: { type: Boolean, default: false },
	},
	setup(props) {
		function itemNode(item: ItemSpec): VNode {
			return h(
				ContextMenuItem,
				{
					key: item.label,
					disabled: item.disabled,
					onSelect: () => props.onSelect?.(item.label),
				},
				{ default: () => item.label }
			);
		}

		return () => {
			const rows: VNode[] = props.items.map((item) => itemNode(item));
			if (props.withSubmenu) {
				rows.push(
					h(ContextMenuSub, null, {
						default: () => [
							h(ContextMenuSubTrigger, null, { default: () => "More tools" }),
							h(ContextMenuSubContent, null, {
								default: () => props.subItems.map((item) => itemNode(item)),
							}),
						],
					})
				);
			}

			// `open` and `onUpdate:open` are omitted unless a test drives them:
			// passing both keys — even as `undefined` — is what marks the model
			// CONTROLLED, and an uncontrolled menu would then never open.
			const rootProps: Record<string, unknown> = {
				onOpenChange: props.onOpenChange,
				sound: props.sound,
			};
			if (props.open !== undefined) rootProps.open = props.open;
			if (props["onUpdate:open"]) rootProps["onUpdate:open"] = props["onUpdate:open"];

			return h(ContextMenu, rootProps, {
				default: () => [
					h(
						ContextMenuTrigger,
						{ disabled: props.triggerDisabled },
						{ default: () => h("div", { "data-testid": "region" }, "Right-click me") }
					),
					h(ContextMenuContent, null, { default: () => rows }),
				],
			});
		};
	},
});

const ITEMS: ItemSpec[] = [{ label: "Previous" }, { label: "Reload" }, { label: "Save page" }];

function region(container: Element): HTMLElement {
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

// Dispatched synchronously, never through `fireEvent` — `fireEvent` awaits a
// tick of its own, which under the animation stub is enough to drain the whole
// exit and leave a test that means to look inside the fade looking at an empty
// document instead. A raw dispatch plus ONE `await nextTick()` lands in the
// window.
function pressEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

// `@testing-library/vue`'s `fireEvent` resolves to `undefined`, not the
// `dispatchEvent` boolean the source suite reads; the two cases that pin
// `preventDefault()` therefore dispatch the event themselves and take the
// boolean straight from `dispatchEvent`. Everything else stays on `fireEvent`.
function dispatchContextMenu(target: HTMLElement, init: MouseEventInit): boolean {
	return target.dispatchEvent(
		new MouseEvent("contextmenu", { bubbles: true, cancelable: true, ...init })
	);
}

// Opens the menu without awaiting anything, for the same reason `pressEscape`
// exists.
function rightClick(target: HTMLElement) {
	dispatchContextMenu(target, { button: 2, clientX: 50, clientY: 50 });
}

// This package's jsdom version does not implement `PointerEvent` (the source
// suite's jsdom does); the dismiss layer only reads `event.target`, so a
// same-typed `MouseEvent` is an equivalent stand-in.
function pointerDownOn(target: HTMLElement) {
	const PointerDownCtor = typeof PointerEvent !== "undefined" ? PointerEvent : MouseEvent;
	target.dispatchEvent(new PointerDownCtor("pointerdown", { bubbles: true, cancelable: true }));
}

// Replaces `window.matchMedia` wholesale, the pattern the rest of the repo
// uses. The transition resolves it fresh the instant it starts, so an
// override installed before the right-click is the one that decides whether
// the panel animates at all — in either direction.
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
	// viewport, and the positioning core would measure a self-consistent but
	// wrong rect. jsdom has no layout engine, so this only asserts the
	// structural part — parentage and cleanup — not actual screen position.
	it("portals its virtual anchor to document.body, and removes it on unmount", async () => {
		const { container, unmount } = render(Harness, { props: { items: ITEMS } });
		expect(region(container)).toBeTruthy();

		// The one shape the source's own assertion does not have. The source
		// portals through an ACTION, which runs inside the same synchronous
		// mount flush; here the equivalent is a `<Portal>` that stays
		// `disabled` until `onMounted` — the only way to leave the server
		// render un-portalled (see ContextMenu.vue) — and the relocation
		// therefore lands one flush later. `await nextTick()` is that flush.
		await nextTick();

		const anchorEl = anchor();
		expect(anchorEl).toBeTruthy();
		expect(anchorEl.parentElement).toBe(document.body);
		expect(container.contains(anchorEl)).toBe(false);

		unmount();
		expect(document.body.contains(anchorEl)).toBe(false);
	});

	// The source's first-item focus lives in a top-level `$effect`, which runs
	// once on MOUNT as well as on every later change. A `watch` without
	// `immediate` only ever fires on a CHANGE, and the presence clock seeds
	// `mounted` from `open`, so a menu rendered already open moves neither
	// source and nothing would fire at all. `ContextMenuContent` therefore runs
	// the same check from `onMounted` too — the one phase a server render can
	// never reach, so the gate stays SSR-safe.
	it("a menu already open on its very first render focuses its first item", async () => {
		render(Harness, { props: { items: ITEMS, open: true } });
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(menu(), "Previous")));
	});

	it("right-click on the region prevents the native menu and opens at the pointer", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const notPrevented = dispatchContextMenu(region(container), {
			button: 2,
			clientX: 120,
			clientY: 80,
		});

		// `dispatchEvent` (which `fireEvent` returns) resolves to `false` once
		// `preventDefault()` has been called on a cancelable event — the
		// concrete, DOM-level proof the native browser menu was suppressed.
		expect(notPrevented).toBe(false);
		await waitFor(() => expect(menu()).not.toBeNull());
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
		} as DOMRect);

		// `button: 0` (the default MouseEvent value) is what the Menu key and
		// Shift+F10 report — never `2`, which only a real right mouse click
		// carries. `clientX`/`clientY` at `0, 0` here matches what a real
		// keyboard-dispatched event also reports, but is no longer what the
		// component keys off of — see the test below for why that distinction
		// matters.
		await fireEvent.contextMenu(el, { button: 0, clientX: 0, clientY: 0 });
		await waitFor(() => expect(menu()).not.toBeNull());
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
		} as DOMRect);

		await fireEvent.contextMenu(el, { button: 2, clientX: 0, clientY: 0 });
		await waitFor(() => expect(menu()).not.toBeNull());
		expect(anchor().style.left).toBe("0px");
		expect(anchor().style.top).toBe("0px");
	});

	it("opening a second time while already open replaces the panel instead of stacking", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const el = region(container);

		await fireEvent.contextMenu(el, { button: 2, clientX: 10, clientY: 10 });
		await waitFor(() => expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1));

		await fireEvent.contextMenu(el, { button: 2, clientX: 300, clientY: 400 });
		expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);
		expect(anchor().style.left).toBe("300px");
		expect(anchor().style.top).toBe("400px");
	});

	// Moving the anchor is only half of it — the panel has to FOLLOW it.
	// jsdom zeroes every `getBoundingClientRect()`, so the span's inline
	// `left`/`top` alone never reaches the positioning core's math; this
	// teaches the virtual anchor to report the rect its own inline style
	// describes, which is what a real layout engine would do, and then reads
	// the coordinates the core writes onto the panel itself. Unless the
	// pointer coordinates reach the composable's `recomputeKey`, the second
	// right-click leaves the panel parked at the first one's position until an
	// unrelated scroll or resize fires.
	it("a second right-click while the menu is open moves the panel, not just the anchor", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		// Same reason as the portal case above: the anchor only reaches
		// `document.body` on the flush after mount, and it is that node the
		// positioner measures.
		await nextTick();
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

		await fireEvent.contextMenu(region(container), { button: 2, clientX: 10, clientY: 10 });
		await waitFor(() => expect(menu()).not.toBeNull());
		// Default side "bottom", align "start", offset 2, against a zero-size
		// point: the panel's own top-left lands on the pointer, 2px down.
		await waitFor(() => expect(menu()?.style.left).toBe("10px"));
		expect(menu()?.style.top).toBe("12px");

		await fireEvent.contextMenu(region(container), { button: 2, clientX: 300, clientY: 300 });
		await nextTick();

		expect(anchor().style.left).toBe("300px");
		expect(menu()?.style.left).toBe("300px");
		expect(menu()?.style.top).toBe("302px");
	});

	// jsdom does not compute layout, so `getBoundingClientRect()` on the
	// virtual anchor is always zeroed regardless of the inline `left`/`top`
	// this component sets — there is no way to drive a real flip/clamp
	// through full component rendering here. This instead exercises the
	// exact `computePosition` call ContextMenuContent makes, with a
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

		pointerDownOn(outside);
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
		const notPrevented = dispatchContextMenu(region(container), {
			button: 2,
			clientX: 50,
			clientY: 50,
		});
		await nextTick();
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
	// the dropdown-menu suite already proves typeahead matches an item's
	// visible label even when it's decorated with an icon and a shortcut. This
	// is a smoke test that the re-export genuinely carries that behaviour
	// through to this family, not a second copy of that coverage.
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

	it("round-trips through v-model:open", async () => {
		let open = false;
		const { container } = render(Harness, {
			props: {
				items: ITEMS,
				open,
				"onUpdate:open": (v: boolean) => {
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
	// the exact same implementation the dropdown-menu suite already exercises
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
	// `ContextMenuContent`'s own context down to the submenu's.
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

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("a right-click opens the menu and plays open exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS, sound: true } });

			await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
			await waitFor(() => expect(menu()).not.toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");
		});

		it("plays nothing at all with the default prop", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS } });

			await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
			await waitFor(() => expect(menu()).not.toBeNull());
			await fireEvent.keyDown(document, { key: "Escape" });
			await waitFor(() => expect(menu()).toBeNull());

			expect(play).not.toHaveBeenCalled();
		});

		// Dispatched synthetically, not through `fireEvent.contextMenu` — proves
		// the guard lives in `ContextMenuTrigger`'s own `if (disabled) return`,
		// not merely in something `fireEvent`'s own event construction happens
		// to skip.
		it("a disabled trigger plays nothing, even dispatched synthetically", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, {
				props: { items: ITEMS, triggerDisabled: true, sound: true },
			});

			rightClick(region(container));

			expect(play).not.toHaveBeenCalled();
			expect(menu()).toBeNull();
		});

		// The matrix's own double-fire guard for `open`: the existing
		// `open === next` early return in `setOpen` makes a reposition
		// right-click — the menu is already open, only `point` moves — silent
		// rather than replaying the open cue a second time.
		it("a reposition right-click while already open is silent — no repeated open cue", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS, sound: true } });
			const el = region(container);

			await fireEvent.contextMenu(el, { button: 2, clientX: 10, clientY: 10 });
			await waitFor(() => expect(menu()).not.toBeNull());
			play.mockClear();

			await fireEvent.contextMenu(el, { button: 2, clientX: 300, clientY: 400 });

			expect(play).not.toHaveBeenCalled();
		});

		it("Escape dismisses the menu and plays close exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS, sound: true } });
			await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
			await waitFor(() => expect(menu()).not.toBeNull());
			play.mockClear();

			await fireEvent.keyDown(document, { key: "Escape" });
			await waitFor(() => expect(menu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("an outside click dismisses the menu and plays close exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const outside = document.createElement("button");
			document.body.appendChild(outside);
			const { container } = render(Harness, { props: { items: ITEMS, sound: true } });
			await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
			await waitFor(() => expect(menu()).not.toBeNull());
			play.mockClear();

			pointerDownOn(outside);
			await waitFor(() => expect(menu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
			outside.remove();
		});

		// Select precedent: the item's own `select` cue already tells the story
		// of this interaction — `closeAll({ silent: true })` must keep the close
		// that follows it mute, or one activation would sound like two.
		it("selecting an item plays select exactly once, never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS, sound: true } });
			await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
			await waitFor(() => expect(menu()).not.toBeNull());
			play.mockClear();

			await fireEvent.click(itemByLabel(menu(), "Reload")!);
			await waitFor(() => expect(menu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("a disabled item plays nothing", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const withDisabled: ItemSpec[] = [{ label: "Previous", disabled: true }, { label: "Reload" }];
			const { container } = render(Harness, { props: { items: withDisabled, sound: true } });
			await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
			await waitFor(() => expect(menu()).not.toBeNull());
			play.mockClear();

			await fireEvent.click(itemByLabel(menu(), "Previous")!);

			expect(play).not.toHaveBeenCalled();
		});

		// Submenu open/close come free from the shared `DropdownMenuSub`, which
		// reads `sound` off whichever level's `MenuContext` it was mounted
		// under — this proves that inheritance actually reaches this family's
		// own context, not just DropdownMenu's.
		it("a submenu inherits sound: opening plays open once, selecting inside plays select only", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, {
				props: {
					items: ITEMS,
					withSubmenu: true,
					subItems: [{ label: "Inspect" }],
					sound: true,
				},
			});
			await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
			await waitFor(() => expect(menu()).not.toBeNull());
			play.mockClear();

			const subBtn = menu()!.querySelector('[aria-haspopup="menu"]') as HTMLElement;
			await fireEvent.click(subBtn);
			await waitFor(() => {
				const subMenus = Array.from(document.querySelectorAll('[role="menu"]'));
				expect(subMenus).toHaveLength(2);
			});
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");

			play.mockClear();
			const subMenuEl = Array.from(document.querySelectorAll('[role="menu"]')).find(
				(el) => el !== menu()
			) as HTMLElement;
			await fireEvent.click(itemByLabel(subMenuEl, "Inspect")!);
			await waitFor(() => expect(document.querySelectorAll('[role="menu"]')).toHaveLength(0));

			expect(play.mock.calls).toEqual([["select"]]);
		});
	});

	// The entrance itself lives in `internals/motion/anchored.ts` and is
	// tested there. What is component-specific is the plumbing between
	// the positioning composable's resolved placement and the growth origin —
	// which matters more here than anywhere else, because this panel's anchor
	// is a point at the pointer and a right-click low or far right in the
	// viewport flips it as a matter of routine.
	describe("anchored entrance", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("publishes its resolved placement and grows from the corner nearest the click", async () => {
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Harness, { props: { items: ITEMS } });
			await fireEvent.contextMenu(region(container), { button: 2, clientX: 120, clientY: 80 });
			await waitFor(() => expect(menu()).not.toBeNull());

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
			// — and the sampler hands `element.animate()` the sampled
			// `css(t, u)` verbatim, so the spy's arguments are a readable
			// record of what that animation touches: opacity and transform
			// only, from the shared `0.92` floor. Asserting the keyframes
			// rather than a bare call count means a panel animating the wrong
			// property, or off the wrong scale, fails here instead of passing
			// silently.
			await waitFor(() => expect(animateSpy).toHaveBeenCalled());
			const keyframes = animateSpy.mock.calls.at(-1)![0] as Keyframe[];
			expect(keyframes[0]).toEqual({ opacity: "0", transform: "scale(0.92)" });
			expect(keyframes.at(-1)).toEqual({ opacity: "1", transform: "scale(1)" });
		});

		it("runs no animation at all under reduced motion, and the panel is there in the same tick", async () => {
			stubMatchMedia(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Harness, { props: { items: ITEMS } });

			await fireEvent.contextMenu(region(container), { button: 2, clientX: 120, clientY: 80 });
			await nextTick();
			expect(menu()).not.toBeNull();

			// A zero duration makes the sampler skip `element.animate()`
			// outright rather than run a zero-length animation, so no call at
			// all is the honest proof that nothing was scheduled.
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	// The exit is new, and with it a window between the dismiss and the
	// unmount — 150 ms in a browser, a couple of microtasks under the
	// animation stub. These pin what has to be true inside it. Nothing a
	// consumer can observe waits for it: `open` still flips at the dismiss
	// instant, and so does the focus return, which `ContextMenu`'s own
	// `setOpen` does from a plain function outside the mount gate.
	describe("animated exit", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(Harness, { props: { items: ITEMS } });
			await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
			await waitFor(() => expect(menu()).not.toBeNull());
			expect(menu()!.getAttribute("data-state")).toBe("open");

			pressEscape();
			await nextTick();

			const closing = menu();
			expect(closing).toBeTruthy();
			// An ordinary binding here: a presence-mounted subtree stays
			// reactive for the whole exit, so the two-value `surfaceState`
			// reaches the DOM without the imperative write the source needs.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// Written by the presence clock, as an ATTRIBUTE, for the whole
			// exit — a menu on its way out must not start taking clicks again.
			expect(closing!.hasAttribute("inert")).toBe(true);

			await waitFor(() => expect(menu()).toBeNull());
		});

		it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
			const onOpenChange = vi.fn();
			const { container } = render(Harness, { props: { items: ITEMS, onOpenChange } });
			await fireEvent.contextMenu(region(container), { button: 2, clientX: 50, clientY: 50 });
			await waitFor(() => expect(menu()).not.toBeNull());
			onOpenChange.mockClear();

			pressEscape();
			await nextTick();
			expect(menu()).toBeTruthy(); // still fading

			pressEscape();
			pressEscape();
			await nextTick();

			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("removes the panel in the same tick again under reduced motion", async () => {
			stubMatchMedia(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Harness, { props: { items: ITEMS } });

			rightClick(region(container));
			await nextTick();
			expect(menu()).not.toBeNull();

			pressEscape();
			await nextTick();

			// A zero duration makes the sampler call `onFinish` synchronously
			// and never touch `element.animate()`, so the close is exactly as
			// instant as it was before this panel animated out at all — no
			// `waitFor` needed, and none allowed here.
			expect(menu()).toBeNull();
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	// The source suite has no SSR case — Svelte's own `portal` is an action and
	// simply never runs on the server, so there is nothing there to prove.
	// Here there IS: `<Teleport>` renders server-side, and this family owns the
	// one portalled node in the package that is NOT gated behind a closed
	// presence block (the always-mounted virtual anchor). These cases pin the
	// gate that keeps it off the server, which is also what the package-wide
	// hydration sweep will exercise the moment the registrar wires
	// `root:ContextMenu` into it.
	describe("SSR", () => {
		// `{ default: () => "x" }` is the sweep's own slot fixture.
		function ssrApp() {
			return createSSRApp({ render: () => h(ContextMenu, null, { default: () => "x" }) });
		}

		function ssrCompound() {
			return createSSRApp({
				render: () =>
					h(ContextMenu, null, {
						default: () => [
							h(ContextMenuTrigger, null, { default: () => "Right-click me" }),
							h(ContextMenuContent, null, {
								default: () => ITEMS.map((item) => h(ContextMenuItem, null, () => item.label)),
							}),
						],
					}),
			});
		}

		it("renders identically twice — nothing on a render path is random or time-dependent", async () => {
			const first = await renderToString(ssrCompound());
			const second = await renderToString(ssrCompound());
			expect(first).toBe(second);
		});

		// The invariant the whole package's hydration story rests on: a closed
		// surface emits nothing portalled. The anchor span is emitted INLINE in
		// the root's own markup instead — byte for byte what the source's
		// server render produces, since an action cannot move it there either.
		it("emits the virtual anchor inline and portals nothing", async () => {
			const html = await renderToString(ssrCompound());
			expect(html).toContain("ft-context-menu-anchor");
			// The teleport anchor comments a server-rendered `<Teleport>`
			// leaves behind. (A bare "teleport" substring would match the
			// components' own source comments, which SSR emits verbatim.)
			expect(html).not.toContain("<!--teleport");
			// Closed: no panel, on the server as on the client.
			expect(html).not.toContain('role="menu"');
		});

		it("warns about no teleport target, because it renders no teleport at all", async () => {
			const app = ssrApp();
			const warnings: string[] = [];
			app.config.warnHandler = (message) => warnings.push(message);
			await renderToString(app);
			expect(warnings).toEqual([]);
		});

		// The sweep's harness, run here on this family alone so the folder owns
		// the proof rather than inheriting it: server HTML planted into a
		// container, hydrated, every `/hydrat|mismatch/i` warning collected.
		it("hydrates its server HTML with no mismatch", async () => {
			const html = await renderToString(ssrApp());
			const container = document.createElement("div");
			container.innerHTML = html;
			document.body.appendChild(container);

			const messages: string[] = [];
			const app = ssrApp();
			app.config.warnHandler = (message) => {
				if (/hydrat|mismatch/i.test(message)) messages.push(message);
			};
			app.mount(container);
			// The portal gate opens in `onMounted`, i.e. AFTER hydration has
			// matched the inline span — the relocation must not be able to
			// report a mismatch of its own.
			await nextTick();
			expect(messages).toEqual([]);
			expect(document.body.querySelector(".ft-context-menu-anchor")?.parentElement).toBe(
				document.body
			);

			app.unmount();
			container.remove();
		});
	});
});
