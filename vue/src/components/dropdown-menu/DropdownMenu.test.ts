import { render, cleanup, fireEvent, waitFor } from "@testing-library/vue";
import { defineComponent, h, nextTick, type PropType, type VNode } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";

import { sound } from "../../sound/sound.js";

/**
 * Transposed assertion-for-assertion from the source component's suite. Four
 * shapes changed and nothing else did:
 *
 * - The source's `.test.svelte` rig is an inline `defineComponent` + `h()`
 *   here (contract §9.2); every prop it varies is the same one.
 * - `tick()` becomes `nextTick()`, and the source's snippet props are slots.
 * - The bindable `open` is `v-model:open`, so the round-trip case passes an
 *   `onUpdate:open` listener instead of a getter/setter pair. The rig omits
 *   both keys entirely when a test does not drive them — a vnode carrying
 *   `open` AND `onUpdate:open` is a CONTROLLED model, and a `v-model` left
 *   undefined would silently stop the menu opening at all.
 * - `element.inert` is read as the `inert` ATTRIBUTE. jsdom implements no
 *   `inert` IDL property, and the presence clock writes the attribute through
 *   `toggleAttribute`, so `hasAttribute` observes production behaviour rather
 *   than a shim (the same call the rest of this package's suites make).
 *
 * One fixture also changed, marked at its call site: this package's jsdom has
 * no `PointerEvent`.
 */

// Spies on the real `anchorPosition` core instead of replacing it, so
// positioning assertions check what a panel asked for while the core itself
// still runs for real (jsdom doesn't compute layout, but the core must not
// throw either). `use-anchor-position.ts` imports this module by the same
// specifier, so the composable picks the spy up — and the `onPlacement` it
// hands the core is the composable's OWN callback, which is what lets a test
// drive a flip that jsdom's zeroed rects could never produce.
vi.mock("../../internals/anchor-position.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../internals/anchor-position.js")>();
	return { ...actual, anchorPosition: vi.fn(actual.anchorPosition) };
});

import { anchorPosition } from "../../internals/anchor-position.js";
import DropdownMenu from "./DropdownMenu.vue";
import DropdownMenuTrigger from "./DropdownMenuTrigger.vue";
import DropdownMenuContent from "./DropdownMenuContent.vue";
import DropdownMenuItem from "./DropdownMenuItem.vue";
import DropdownMenuSeparator from "./DropdownMenuSeparator.vue";
import DropdownMenuLabel from "./DropdownMenuLabel.vue";
import DropdownMenuSub from "./DropdownMenuSub.vue";
import DropdownMenuSubTrigger from "./DropdownMenuSubTrigger.vue";
import DropdownMenuSubContent from "./DropdownMenuSubContent.vue";

interface ItemSpec {
	label: string;
	disabled?: boolean;
	variant?: "default" | "destructive";
	shortcut?: string;
	icon?: string;
	closeOnSelect?: boolean;
}

/**
 * Test-only rig. `DropdownMenu`'s behaviour lives across the root, the
 * trigger, the content and its items together, so proving any of it needs real
 * instances of all of them, wired up the way a consumer actually would. Every
 * prop a test might need to vary is a parameter here, never hardcoded.
 */
const Harness = defineComponent({
	name: "DropdownMenuHarness",
	props: {
		items: { type: Array as PropType<ItemSpec[]>, required: true },
		open: { type: Boolean, default: undefined },
		"onUpdate:open": {
			type: Function as PropType<(open: boolean) => void>,
			default: undefined,
		},
		onOpenChange: { type: Function as PropType<(open: boolean) => void>, default: undefined },
		onSelect: { type: Function as PropType<(label: string) => void>, default: undefined },
		loop: { type: Boolean, default: true },
		triggerDisabled: { type: Boolean, default: false },
		labelText: { type: String, default: undefined },
		separatorBeforeIndex: { type: Number, default: undefined },
		withSubmenu: { type: Boolean, default: false },
		subItems: { type: Array as PropType<ItemSpec[]>, default: () => [] },
		subTriggerDisabled: { type: Boolean, default: false },
		sound: { type: Boolean, default: false },
	},
	setup(props) {
		function itemNode(item: ItemSpec): VNode {
			return h(
				DropdownMenuItem,
				{
					key: item.label,
					disabled: item.disabled,
					variant: item.variant,
					shortcut: item.shortcut,
					closeOnSelect: item.closeOnSelect,
					onSelect: () => props.onSelect?.(item.label),
				},
				item.icon
					? { icon: () => item.icon, default: () => item.label }
					: { default: () => item.label }
			);
		}

		return () => {
			const rows: VNode[] = [];
			if (props.labelText) {
				rows.push(h(DropdownMenuLabel, null, { default: () => props.labelText }));
			}
			props.items.forEach((item, index) => {
				if (props.separatorBeforeIndex === index) {
					rows.push(h(DropdownMenuSeparator, { key: `sep-${index}` }));
				}
				rows.push(itemNode(item));
			});
			if (props.withSubmenu) {
				rows.push(
					h(DropdownMenuSub, null, {
						default: () => [
							h(
								DropdownMenuSubTrigger,
								{ disabled: props.subTriggerDisabled },
								{ default: () => "More tools" }
							),
							h(DropdownMenuSubContent, null, {
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
				loop: props.loop,
				sound: props.sound,
			};
			if (props.open !== undefined) rootProps.open = props.open;
			if (props["onUpdate:open"]) rootProps["onUpdate:open"] = props["onUpdate:open"];

			return h(DropdownMenu, rootProps, {
				default: () => [
					h(
						DropdownMenuTrigger,
						{ disabled: props.triggerDisabled },
						{ default: () => "Open menu" }
					),
					h(DropdownMenuContent, null, { default: () => rows }),
				],
			});
		};
	},
});

const ITEMS: ItemSpec[] = [
	{ label: "Rename", shortcut: "⌘R" },
	{ label: "Duplicate", shortcut: "⌘D" },
	{ label: "Share" },
	{ label: "Delete", variant: "destructive" },
];

function trigger(container: Element): HTMLButtonElement {
	return container.querySelector(".ft-dropdown-menu-trigger") as HTMLButtonElement;
}

function menus(): HTMLElement[] {
	return Array.from(document.querySelectorAll('[role="menu"]'));
}

// Both the root panel and a submenu panel carry `aria-labelledby` — the root
// points at the real trigger button, a submenu points at its own sub-trigger
// row — so telling the two apart when both are portalled to `document.body`
// at once comes down to what kind of element each one's label actually is:
// the root trigger carries the trigger class, a sub-trigger is a
// `role="menuitem"` row instead.
function labelFor(el: HTMLElement): HTMLElement | null {
	const id = el.getAttribute("aria-labelledby");
	return id ? document.getElementById(id) : null;
}

function rootMenu(): HTMLElement | null {
	return menus().find((el) => labelFor(el)?.classList.contains("ft-dropdown-menu-trigger")) ?? null;
}

function subMenu(): HTMLElement | null {
	return menus().find((el) => labelFor(el)?.getAttribute("role") === "menuitem") ?? null;
}

function items(root: HTMLElement | null): HTMLElement[] {
	return root ? Array.from(root.querySelectorAll('[role="menuitem"]')) : [];
}

// Visible text only, skipping `aria-hidden="true"` subtrees — the same
// definition the menu core's own typeahead fallback uses, so this helper finds
// a row by the label a sighted user actually reads, not by raw `textContent`
// (which would include a leading icon glyph or a trailing shortcut and stop
// matching the moment a row has either).
function visibleText(el: HTMLElement): string {
	let text = "";
	for (const node of Array.from(el.childNodes)) {
		if (node.nodeType === Node.TEXT_NODE) {
			text += node.textContent ?? "";
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			const child = node as HTMLElement;
			if (child.getAttribute("aria-hidden") === "true") continue;
			text += visibleText(child);
		}
	}
	return text;
}

function itemByLabel(root: HTMLElement | null, label: string): HTMLElement | undefined {
	return items(root).find((el) => visibleText(el).trim().startsWith(label));
}

function subTriggerEl(root: HTMLElement | null): HTMLElement | undefined {
	return root?.querySelector<HTMLElement>('[aria-haspopup="menu"]') ?? undefined;
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

// This package's jsdom version does not implement `PointerEvent` (the source
// suite's jsdom does); the dismiss layer only reads `event.target`, so a
// same-typed `MouseEvent` is an equivalent stand-in.
function pointerDownOn(target: HTMLElement) {
	const PointerDownCtor = typeof PointerEvent !== "undefined" ? PointerEvent : MouseEvent;
	target.dispatchEvent(new PointerDownCtor("pointerdown", { bubbles: true, cancelable: true }));
}

// Replaces `window.matchMedia` wholesale, the pattern the rest of the repo
// uses. `anchored()` resolves it fresh every time a transition starts, so an
// override installed before the panel opens is the one that decides whether
// the motion runs at all — entrance and exit alike.
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

/** The options the anchor core was last attached with for a given requested side. */
function anchorCallFor(side: string) {
	return vi
		.mocked(anchorPosition)
		.mock.calls.filter(([, opts]) => opts.side === side)
		.at(-1);
}

describe("DropdownMenu", () => {
	afterEach(() => {
		cleanup();
		document.body.querySelectorAll('[role="menu"]').forEach((el) => el.remove());
		vi.mocked(anchorPosition).mockClear();
	});

	it("renders closed by default: aria-haspopup menu, aria-expanded false, no aria-controls, no panel", () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const btn = trigger(container);

		expect(btn.getAttribute("aria-haspopup")).toBe("menu");
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(btn.hasAttribute("aria-controls")).toBe(false);
		expect(rootMenu()).toBeNull();
	});

	it("opens on trigger click; aria-controls appears and points at the panel's real id, then disappears on close", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const btn = trigger(container);

		await fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("true");
		const controls = btn.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(rootMenu()?.id).toBe(controls);
		expect(rootMenu()?.getAttribute("aria-labelledby")).toBe(btn.id);

		await fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(btn.hasAttribute("aria-controls")).toBe(false);
		await waitFor(() => expect(rootMenu()).toBeNull());
	});

	it("Enter, Space and ArrowDown on the trigger open the menu and focus the first item", async () => {
		for (const key of ["Enter", " ", "ArrowDown"]) {
			const { container, unmount } = render(Harness, { props: { items: ITEMS } });
			const btn = trigger(container);
			await fireEvent.keyDown(btn, { key });
			await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename")));
			unmount();
			document.body.querySelectorAll('[role="menu"]').forEach((el) => el.remove());
		}
	});

	it("ArrowUp on the trigger opens the menu and focuses the last item", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		await fireEvent.keyDown(trigger(container), { key: "ArrowUp" });
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Delete")));
	});

	it("ArrowDown/ArrowUp move focus among items and wrap by default", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename")));

		await fireEvent.keyDown(rootMenu()!, { key: "ArrowUp" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Delete"));

		await fireEvent.keyDown(rootMenu()!, { key: "ArrowDown" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename"));
	});

	it("does not wrap when loop is false", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, loop: false } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename")));

		await fireEvent.keyDown(rootMenu()!, { key: "ArrowUp" });
		// Nothing before the first item to move to — focus stays put.
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename"));
	});

	it("Home and End jump to the first and last item", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename")));

		await fireEvent.keyDown(rootMenu()!, { key: "End" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Delete"));

		await fireEvent.keyDown(rootMenu()!, { key: "Home" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename"));
	});

	it("typeahead focuses the item whose label starts with the typed character", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		await fireEvent.keyDown(rootMenu()!, { key: "s" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Share"));
	});

	// This item's icon and shortcut are both `aria-hidden`, which is exactly
	// the convention the menu core's typeahead fallback relies on (visible text
	// only, skipping `aria-hidden` subtrees) — the same convention this
	// component follows without needing `data-typeahead-label` to state its
	// label explicitly. Uses `document.activeElement` directly rather than
	// `itemByLabel` so the assertion reflects what the core actually focused,
	// not a test helper's own lookup.
	it("typeahead still matches the visible label when an item is decorated with an icon and a shortcut", async () => {
		const decorated: ItemSpec[] = [
			{ label: "Archive" },
			{ label: "Rename", icon: "✎", shortcut: "⌘R" },
		];
		const { container } = render(Harness, { props: { items: decorated } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		await fireEvent.keyDown(rootMenu()!, { key: "r" });
		expect(document.activeElement?.textContent).toContain("Rename");
	});

	// A submenu trigger is a normal item in its *parent's* typeahead (see
	// `DropdownMenuSubTrigger`'s own registration watcher) — its icon and caret
	// are `aria-hidden` siblings of the label too, same convention.
	it("typeahead still matches a submenu trigger's visible label, ignoring its icon and caret", async () => {
		const { container } = render(Harness, {
			props: { items: [{ label: "Reload" }], withSubmenu: true, subItems: [{ label: "Inspect" }] },
		});
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		await fireEvent.keyDown(rootMenu()!, { key: "m" });
		expect(document.activeElement?.textContent).toContain("More tools");
	});

	// Font-size lives on the panel, not the item: `DropdownMenuItem` pins no
	// size of its own and inherits from `DropdownMenuContent`'s `text-[13px]`
	// via normal CSS (they're DOM ancestor/descendant once portalled, moved
	// together as one subtree) — see `DropdownMenuContent`'s own comment.
	it("the panel carries the item font-size; items carry none of their own", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		expect(rootMenu()?.className).toContain("text-[13px]");
		expect(itemByLabel(rootMenu(), "Rename")?.className).not.toMatch(/text-\[\d+px\]/);
	});

	it("Escape closes the menu and returns focus to the trigger", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const btn = trigger(container);
		btn.focus();

		await fireEvent.click(btn);
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename")));

		await fireEvent.keyDown(document, { key: "Escape" });
		await waitFor(() => expect(rootMenu()).toBeNull());
		expect(document.activeElement).toBe(btn);
	});

	// Tab is never `preventDefault`ed, so real browsers continue their own Tab
	// traversal from whatever the menu core left focused — jsdom does not
	// implement that default action (it does not move focus on Tab at all), so
	// this test can only prove the menu closes and that, unlike Escape, this
	// component does not force focus back onto the trigger.
	it("Tab closes the menu without forcing focus back to the trigger", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const btn = trigger(container);

		await fireEvent.click(btn);
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		await fireEvent.keyDown(rootMenu()!, { key: "Tab" });
		await waitFor(() => expect(rootMenu()).toBeNull());
		expect(document.activeElement).not.toBe(btn);
	});

	it("selecting an item fires onSelect and closes the menu by default", async () => {
		const onSelect = vi.fn();
		const { container } = render(Harness, { props: { items: ITEMS, onSelect } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		await fireEvent.click(itemByLabel(rootMenu(), "Duplicate")!);
		expect(onSelect).toHaveBeenCalledWith("Duplicate");
		await waitFor(() => expect(rootMenu()).toBeNull());
	});

	it("closeOnSelect: false keeps the menu open after selection", async () => {
		const onSelect = vi.fn();
		const pinnedItems: ItemSpec[] = [{ label: "Keep open", closeOnSelect: false }];
		const { container } = render(Harness, { props: { items: pinnedItems, onSelect } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		await fireEvent.click(itemByLabel(rootMenu(), "Keep open")!);
		expect(onSelect).toHaveBeenCalledWith("Keep open");
		expect(rootMenu()).not.toBeNull();
	});

	// `fireEvent.click` in jsdom fires only the click event, never a preceding
	// `mouseenter` — exactly the gap a touch tap leaves in a real browser too.
	// Without syncing the menu core's tracked focus position on click,
	// arrow-key navigation after a `closeOnSelect: false` selection would still
	// start from wherever focus was *before* the click (here, the first item
	// from opening), not from the row the user just acted on.
	it("clicking an item syncs the menu's tracked focus position even without a prior hover", async () => {
		const pinnedItems: ItemSpec[] = [
			{ label: "First", closeOnSelect: false },
			{ label: "Second", closeOnSelect: false },
			{ label: "Third", closeOnSelect: false },
		];
		const { container } = render(Harness, { props: { items: pinnedItems } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "First")));

		await fireEvent.click(itemByLabel(rootMenu(), "Third")!);
		expect(rootMenu()).not.toBeNull();

		// If focus were still tracked at "First" (unmoved by the click),
		// ArrowDown would land on "Second". Landing on "First" instead proves
		// the click moved the tracked position to "Third" first, then wrapped.
		await fireEvent.keyDown(rootMenu()!, { key: "ArrowDown" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "First"));
	});

	it("a disabled item does not fire onSelect on click, and is skipped by arrow-key navigation", async () => {
		const onSelect = vi.fn();
		const withDisabled: ItemSpec[] = [
			{ label: "First" },
			{ label: "Blocked", disabled: true },
			{ label: "Last" },
		];
		const { container } = render(Harness, { props: { items: withDisabled, onSelect } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "First")));

		await fireEvent.click(itemByLabel(rootMenu(), "Blocked")!);
		expect(onSelect).not.toHaveBeenCalled();

		await fireEvent.keyDown(rootMenu()!, { key: "ArrowDown" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Last"));
	});

	it("renders the destructive variant with data-variant and the destructive text class", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		const destructive = itemByLabel(rootMenu(), "Delete")!;
		expect(destructive.getAttribute("data-variant")).toBe("destructive");
		expect(destructive.className).toContain("text-destructive");
	});

	it("renders a shortcut as an aria-hidden kbd, display-only", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		const rename = itemByLabel(rootMenu(), "Rename")!;
		const kbd = rename.querySelector("kbd");
		expect(kbd?.textContent).toBe("⌘R");
		expect(kbd?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders a group label that is not a menuitem", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, labelText: "Actions" } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		expect(rootMenu()?.textContent).toContain("Actions");
		expect(items(rootMenu()).some((el) => el.textContent?.trim() === "Actions")).toBe(false);
	});

	it("renders a separator with role=separator", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, separatorBeforeIndex: 2 } });
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		expect(rootMenu()?.querySelector('[role="separator"]')).not.toBeNull();
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(Harness, { props: { items: ITEMS } });

		await fireEvent.click(trigger(container));
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		pointerDownOn(outside);
		await waitFor(() => expect(rootMenu()).toBeNull());
		outside.remove();
	});

	it("a disabled trigger never opens the menu, by click or by keyboard", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, triggerDisabled: true } });
		const btn = trigger(container);

		await fireEvent.click(btn);
		expect(rootMenu()).toBeNull();

		await fireEvent.keyDown(btn, { key: "ArrowDown" });
		expect(rootMenu()).toBeNull();
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

		await fireEvent.click(trigger(container));
		expect(open).toBe(true);
	});

	it("works uncontrolled with only onOpenChange", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(Harness, { props: { items: ITEMS, onOpenChange } });

		await fireEvent.click(trigger(container));
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(rootMenu()).not.toBeNull();
	});

	describe("submenu", () => {
		const SUB_ITEMS: ItemSpec[] = [{ label: "Screenshot" }, { label: "Inspect" }];

		it("opens on click and focuses its first item, carrying aria-haspopup/expanded/controls", async () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems: SUB_ITEMS },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;
			expect(subBtn.getAttribute("aria-haspopup")).toBe("menu");
			expect(subBtn.getAttribute("aria-expanded")).toBe("false");

			await fireEvent.click(subBtn);
			await waitFor(() => expect(subMenu()).not.toBeNull());
			expect(subBtn.getAttribute("aria-expanded")).toBe("true");
			expect(subBtn.getAttribute("aria-controls")).toBe(subMenu()!.id);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);
		});

		// The menu-button/submenu pattern requires a submenu panel to be named
		// by the row that opened it — without it, a screen-reader user who
		// arrows into a submenu hears only an anonymous "menu" and loses which
		// item they drilled into.
		it("names the submenu panel after its own sub-trigger via aria-labelledby", async () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems: SUB_ITEMS },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			await fireEvent.click(subBtn);
			await waitFor(() => expect(subMenu()).not.toBeNull());

			expect(subBtn.id).not.toBe("");
			expect(subMenu()!.getAttribute("aria-labelledby")).toBe(subBtn.id);
		});

		// `DropdownMenuSubContent` is portalled independently of the root panel
		// — once both are open they're DOM *siblings* under `document.body`,
		// not ancestor/descendant, so the submenu can't pick up `text-[13px]`
		// through plain CSS inheritance the way a top-level item does. It has
		// to come through `MenuContext.itemTextClass` instead, forwarded from
		// the root's own context.
		it("a submenu's panel carries the same item font-size as its root, forwarded through context rather than CSS", async () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems: SUB_ITEMS },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			await fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() => expect(subMenu()).not.toBeNull());

			expect(subMenu()?.className).toContain("text-[13px]");
		});

		it("ArrowRight opens the submenu from the trigger", async () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems: SUB_ITEMS },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;
			subBtn.focus();

			await fireEvent.keyDown(subBtn, { key: "ArrowRight" });
			await waitFor(() => expect(subMenu()).not.toBeNull());
		});

		it("ArrowLeft closes the submenu and returns focus to its trigger", async () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems: SUB_ITEMS },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			await fireEvent.click(subBtn);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);

			await fireEvent.keyDown(subMenu()!, { key: "ArrowLeft" });
			await waitFor(() => expect(subMenu()).toBeNull());
			expect(document.activeElement).toBe(subBtn);
		});

		it("opens after a hover intent delay, not instantly", async () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems: SUB_ITEMS },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			await fireEvent.mouseEnter(subBtn);
			expect(subMenu()).toBeNull();
			await waitFor(() => expect(subMenu()).not.toBeNull());
		});

		it("selecting a submenu item closes the entire tree, not just the submenu", async () => {
			const onSelect = vi.fn();
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems: SUB_ITEMS, onSelect },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			await fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);

			await fireEvent.click(itemByLabel(subMenu(), "Screenshot")!);
			expect(onSelect).toHaveBeenCalledWith("Screenshot");
			await waitFor(() => expect(subMenu()).toBeNull());
			// Both levels fade on the same clock, so the root's removal is not
			// guaranteed to have landed by the time the submenu's has — this
			// waits for it rather than relying on the order two exits happen to
			// resolve in.
			await waitFor(() => expect(rootMenu()).toBeNull());
		});

		it("a disabled submenu trigger does not open on click or ArrowRight", async () => {
			const { container } = render(Harness, {
				props: {
					items: ITEMS,
					withSubmenu: true,
					subItems: SUB_ITEMS,
					subTriggerDisabled: true,
				},
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			await fireEvent.click(subBtn);
			expect(subMenu()).toBeNull();
			await fireEvent.keyDown(subBtn, { key: "ArrowRight" });
			expect(subMenu()).toBeNull();
		});

		it("reports a placement flip through onPlacement so the trigger's caret can mirror it", async () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems: SUB_ITEMS },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			await fireEvent.click(subBtn);
			await waitFor(() => expect(subMenu()).not.toBeNull());

			// The core ran for real when `SubContent` mounted (it's spied on,
			// not replaced) — this inspects what it was asked to do, then drives
			// the composable's own `onPlacement` callback directly, since
			// jsdom's zeroed `getBoundingClientRect()` can never produce a real
			// flip on its own.
			const call = anchorCallFor("right");
			expect(call).toBeTruthy();
			const opts = call![1];
			expect(subBtn.textContent).toContain("›");

			opts.onPlacement?.("left", "start");
			await nextTick();
			expect(subBtn.textContent).toContain("‹");
		});

		// A submenu's hover-intent timers (the open-intent one on
		// `DropdownMenuSubTrigger`, the close-intent one on `DropdownMenuSub`)
		// are only ever cleared from event handlers — mouseenter/mouseleave —
		// unless an unmount hook clears them on destroy too. Neither leaving one
		// armed crashes on a whole-tree unmount (every downstream call it could
		// reach already guards against a stale/detached target), so this can't
		// assert a crash — it instead spies on `clearTimeout` around the unmount
		// call itself and checks the pending timer is torn down, which is what
		// the fix actually does.
		it("clears the open-intent timer on unmount rather than leaving it armed", async () => {
			const { container, unmount } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems: SUB_ITEMS },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			// Starts the open-intent timer without letting it fire.
			await fireEvent.mouseEnter(subBtn);

			const clearSpy = vi.spyOn(window, "clearTimeout");
			unmount();
			expect(clearSpy).toHaveBeenCalled();
			clearSpy.mockRestore();
		});

		it("clears the submenu's close-intent timer on unmount rather than leaving it armed", async () => {
			const { container, unmount } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems: SUB_ITEMS },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			// Opens the submenu, then leaves it — starting the close-intent
			// timer — without letting it fire.
			await fireEvent.click(subBtn);
			await waitFor(() => expect(subMenu()).not.toBeNull());
			await fireEvent.mouseLeave(subBtn);

			const clearSpy = vi.spyOn(window, "clearTimeout");
			unmount();
			expect(clearSpy).toHaveBeenCalled();
			clearSpy.mockRestore();
		});
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("trigger click plays open exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS, sound: true } });

			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");
		});

		// Enter on the trigger opens through the very same `setOpen`
		// (`openWithFocus` → `setOpen`) as a click does, guarded by its own
		// `open === next` early return — so even if a real browser also fired a
		// native click from the same Enter keypress, the second call would see
		// `open` already `true` and play nothing.
		it("keyboard Enter on the trigger opens with exactly one cue, no synthetic double", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS, sound: true } });

			await fireEvent.keyDown(trigger(container), { key: "Enter" });
			await waitFor(() => expect(rootMenu()).not.toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");
		});

		it("trigger click to close plays close exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS, sound: true } });
			const btn = trigger(container);
			await fireEvent.click(btn);
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			play.mockClear();

			await fireEvent.click(btn);
			await waitFor(() => expect(rootMenu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("Escape plays close exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS, sound: true } });
			const btn = trigger(container);
			await fireEvent.click(btn);
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			play.mockClear();

			await fireEvent.keyDown(document, { key: "Escape" });
			await waitFor(() => expect(rootMenu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("item activation by click plays select exactly once, never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS, sound: true } });
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			play.mockClear();

			await fireEvent.click(itemByLabel(rootMenu(), "Duplicate")!);
			await waitFor(() => expect(rootMenu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		// A native button also fires a real `click` event for a real Enter
		// keypress while it holds focus — the same activation `handleClick`
		// already handles for a pointer click, with no separate keydown path of
		// its own to double it. Documented (rather than left implicit) because
		// there is no jsdom-simulable difference between "click" and "Enter
		// while a button holds focus" to assert on directly here.
		it("item activation by keyboard (Enter) plays select exactly once, never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS, sound: true } });
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename")));
			play.mockClear();

			await fireEvent.click(itemByLabel(rootMenu(), "Rename")!);
			await waitFor(() => expect(rootMenu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("closeOnSelect: false still plays select and nothing else", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const pinnedItems: ItemSpec[] = [{ label: "Keep open", closeOnSelect: false }];
			const { container } = render(Harness, { props: { items: pinnedItems, sound: true } });
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			play.mockClear();

			await fireEvent.click(itemByLabel(rootMenu(), "Keep open")!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
			expect(rootMenu()).not.toBeNull();
		});

		it("a disabled item plays nothing", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const withDisabled: ItemSpec[] = [{ label: "Locked", disabled: true }];
			const { container } = render(Harness, { props: { items: withDisabled, sound: true } });
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			play.mockClear();

			await fireEvent.click(itemByLabel(rootMenu(), "Locked")!);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing at all with the default prop", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { items: ITEMS } });
			const btn = trigger(container);

			await fireEvent.click(btn);
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			await fireEvent.click(itemByLabel(rootMenu(), "Duplicate")!);

			expect(play).not.toHaveBeenCalled();
		});

		it("a submenu item inherits sound: select plays once, closes the whole tree silently", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const subItems: ItemSpec[] = [{ label: "Screenshot" }];
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems, sound: true },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			await fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);
			play.mockClear();

			await fireEvent.click(itemByLabel(subMenu(), "Screenshot")!);
			await waitFor(() => expect(rootMenu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("opening a submenu plays open once; ArrowLeft back out plays close once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const subItems: ItemSpec[] = [{ label: "Screenshot" }];
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems, sound: true },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			play.mockClear();

			await fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");

			play.mockClear();
			await fireEvent.keyDown(itemByLabel(subMenu(), "Screenshot")!, { key: "ArrowLeft" });
			await waitFor(() => expect(subMenu()).toBeNull());
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("Escape closes one layer at a time, each with exactly one close cue", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const subItems: ItemSpec[] = [{ label: "Screenshot" }];
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems, sound: true },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			await fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);
			play.mockClear();

			await fireEvent.keyDown(document.activeElement!, { key: "Escape" });
			await waitFor(() => expect(subMenu()).toBeNull());
			expect(play.mock.calls).toEqual([["close"]]);

			play.mockClear();
			await fireEvent.keyDown(document.activeElement!, { key: "Escape" });
			await waitFor(() => expect(rootMenu()).toBeNull());
			expect(play.mock.calls).toEqual([["close"]]);
		});

		it("selecting inside a submenu closes the whole tree with select only — no close from any level", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const subItems: ItemSpec[] = [{ label: "Screenshot" }];
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems, sound: true },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			await fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);
			play.mockClear();

			await fireEvent.click(itemByLabel(subMenu(), "Screenshot")!);
			await waitFor(() => expect(rootMenu()).toBeNull());
			expect(play.mock.calls).toEqual([["select"]]);
		});
	});

	// The entrance itself lives in `internals/motion/anchored.ts` and is tested
	// there. What is component-specific — and so what these cover — is the
	// plumbing: which side the panel asked for, which side it was told it
	// actually got, and the growth origin that follows from the pair.
	describe("anchored entrance", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("publishes its resolved placement and grows from the panel edge nearest the trigger", async () => {
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Harness, { props: { items: ITEMS } });
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			await waitFor(() => expect(animateSpy.mock.calls.length).toBeGreaterThan(1));

			// The sampler turns the transition's `css(t, u)` into a plain
			// `Keyframe[]` and hands it to `element.animate()`, so the spy's own
			// arguments are a readable record of what the entrance animates:
			// opacity and transform, nothing else, from the shared `0.92` floor.
			// This doubles as the positive control for the reduced-motion test
			// at the bottom of this block — without it,
			// `not.toHaveBeenCalled()` down there could be measuring a jsdom
			// quirk rather than the preference.
			const keyframes = animateSpy.mock.calls.at(-1)![0] as Keyframe[];
			expect(keyframes[0]).toEqual({ opacity: "0", transform: "scale(0.92)" });
			expect(keyframes.at(-1)).toEqual({ opacity: "1", transform: "scale(1)" });

			// jsdom reports every rect as zeroes, so `computePosition` never
			// overflows and never flips — which makes the un-flipped case the
			// deterministic one to assert here, precisely because there is no
			// layout engine to disagree with it.
			const panel = rootMenu()!;
			expect(panel.getAttribute("data-side")).toBe("bottom");
			expect(panel.getAttribute("data-align")).toBe("start");
			// `bottom` + `start`: the panel's own top-left corner, the one
			// touching the trigger it drops out of.
			expect(panel.style.transformOrigin).toBe("left top");
		});

		it("moves the growth origin to the other edge when the placement flips", async () => {
			const { container } = render(Harness, { props: { items: ITEMS } });
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());

			// Same technique as the submenu caret test above: the core ran for
			// real (it is spied on, not replaced), so this drives its own
			// `onPlacement` callback directly — jsdom's zeroed rects can never
			// produce a genuine flip.
			const call = anchorCallFor("bottom");
			expect(call).toBeTruthy();
			call![1].onPlacement?.("top", "start");
			await nextTick();

			const panel = rootMenu()!;
			expect(panel.getAttribute("data-side")).toBe("top");
			// A panel that flipped above its trigger has to grow downwards out
			// of its own bottom edge, or it would appear to come from the wrong
			// direction entirely.
			expect(panel.style.transformOrigin).toBe("left bottom");
		});

		it("gives the submenu's caret, data-side and growth origin one single source of truth", async () => {
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const subItems: ItemSpec[] = [{ label: "Screenshot" }];
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;
			const beforeSubOpened = animateSpy.mock.calls.length;
			await fireEvent.click(subBtn);
			await waitFor(() => expect(subMenu()).not.toBeNull());
			await waitFor(() => expect(animateSpy.mock.contexts.at(-1)).toBe(subMenu()));

			// The submenu's own positive control, and the reason it lives here
			// rather than in a test of its own: everything else this test reads
			// — `data-side`, `data-align`, `transform-origin`, the caret —
			// comes off `SubContext.resolvedSide`, so all of it would still be
			// correct if the entrance were dropped from
			// `DropdownMenuSubContent` entirely, and the reduced-motion test
			// below only asserts an absence.
			expect(animateSpy.mock.calls.length).toBeGreaterThan(beforeSubOpened);
			const keyframes = animateSpy.mock.calls.at(-1)![0] as Keyframe[];
			expect(keyframes[0]).toEqual({ opacity: "0", transform: "scale(0.92)" });
			expect(keyframes.at(-1)).toEqual({ opacity: "1", transform: "scale(1)" });

			expect(subMenu()!.getAttribute("data-side")).toBe("right");
			expect(subMenu()!.getAttribute("data-align")).toBe("start");
			expect(subMenu()!.style.transformOrigin).toBe("left top");
			expect(subBtn.textContent).toContain("›");

			// `SubContext.resolvedSide` feeds the caret glyph AND the panel's
			// origin — one flip has to move both, which is why this panel keeps
			// no local placement state of its own.
			const call = anchorCallFor("right");
			call![1].onPlacement?.("left", "start");
			await nextTick();

			expect(subBtn.textContent).toContain("‹");
			expect(subMenu()!.getAttribute("data-side")).toBe("left");
			expect(subMenu()!.style.transformOrigin).toBe("right top");
		});

		// Closing the ROOT while a submenu is open flips only the root's own
		// state, so `sub.open` stays true for the whole global outro. Reading it
		// as liveness made the submenu leave on the ENTRANCE curve — the 0.92
		// floor, the arrival easing — while its parent faded out beside it on
		// the exit curve. The same predicate gates the dismiss layer, so a
		// fading submenu also went on claiming the top layer.
		it("leaves on the exit curve when the ROOT closes underneath it", async () => {
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const subItems: ItemSpec[] = [{ label: "Screenshot" }];
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			await fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() => expect(subMenu()).not.toBeNull());

			const panel = subMenu()!;
			const beforeRootClosed = animateSpy.mock.calls.length;

			// Selecting a root item closes the whole menu — the submenu is never
			// told anything of its own. Raw `.click()`, not `fireEvent.click`,
			// for the same reason `pressEscape` exists: an awaited helper drains
			// the stub's exit and there would be nothing left to look at.
			itemByLabel(rootMenu(), "Rename")!.click();
			await nextTick();

			const subExit = animateSpy.mock.calls
				.map((call, index) => ({ call, context: animateSpy.mock.contexts[index] }))
				.filter(({ context }, index) => context === panel && index >= beforeRootClosed)
				.at(-1);

			expect(subExit).toBeTruthy();
			const keyframes = subExit!.call[0] as Keyframe[];
			// The exit floor (0.96), not the entrance floor (0.92).
			expect(keyframes[0]).toEqual({ opacity: "1", transform: "scale(1)" });
			expect(keyframes.at(-1)).toEqual({ opacity: "0", transform: "scale(0.96)" });
		});

		it("runs no animation at all under reduced motion, and both panels are there in the same tick", async () => {
			stubMatchMedia(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const subItems: ItemSpec[] = [{ label: "Screenshot" }];
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems },
			});

			await fireEvent.click(trigger(container));
			await nextTick();
			expect(rootMenu()).not.toBeNull();

			await fireEvent.click(subTriggerEl(rootMenu())!);
			await nextTick();
			expect(subMenu()).not.toBeNull();

			// A zero duration makes the sampler skip `element.animate()`
			// outright rather than run a zero-length animation, so the absence
			// of any call is the honest proof that nothing was scheduled.
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	// The exit has a window between the dismiss and the unmount — 150 ms in a
	// browser, a couple of microtasks under the animation stub. These pin what
	// has to be true inside it. Everything a consumer can observe still flips at
	// the dismiss instant: `open`, the trigger's `aria-expanded`, and the focus
	// return (which this family does from `DropdownMenu`'s own `setOpen`,
	// outside the mount gate, and so needs no eager-return handle of its own).
	describe("animated exit", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(Harness, { props: { items: ITEMS } });
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			expect(rootMenu()!.getAttribute("data-state")).toBe("open");

			pressEscape();
			await nextTick();

			const closing = rootMenu();
			expect(closing).toBeTruthy();
			// An ordinary binding here (D-V7): a presence-mounted subtree stays
			// reactive for the whole exit, so the two-value `surfaceState`
			// reaches the DOM without the imperative write the source needs.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// Written by the presence clock, as an ATTRIBUTE, for the whole
			// exit. Asserted here so nobody removes the transition without
			// noticing that a menu on its way out would start taking clicks
			// again.
			expect(closing!.hasAttribute("inert")).toBe(true);

			await waitFor(() => expect(rootMenu()).toBeNull());
		});

		it("fades both levels of a nested menu together, neither blinking out ahead of the other", async () => {
			const subItems: ItemSpec[] = [{ label: "Screenshot" }];
			const { container } = render(Harness, {
				props: { items: ITEMS, withSubmenu: true, subItems },
			});
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			await fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() => expect(subMenu()).not.toBeNull());

			// Closing the root starts the submenu's own exit in the same flush,
			// so both panels are still on screen, both marked closing, for the
			// same window. Raw `.click()`, not `fireEvent.click`, for the same
			// reason `pressEscape` exists.
			itemByLabel(rootMenu(), "Rename")!.click();
			await nextTick();

			expect(rootMenu()!.getAttribute("data-state")).toBe("closing");
			expect(subMenu()!.getAttribute("data-state")).toBe("closing");

			await waitFor(() => expect(rootMenu()).toBeNull());
			await waitFor(() => expect(subMenu()).toBeNull());
		});

		it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
			const onOpenChange = vi.fn();
			const { container } = render(Harness, { props: { items: ITEMS, onOpenChange } });
			await fireEvent.click(trigger(container));
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			onOpenChange.mockClear();

			pressEscape();
			await nextTick();
			expect(rootMenu()).toBeTruthy(); // still fading

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
			await fireEvent.click(trigger(container));
			await nextTick();
			expect(rootMenu()).not.toBeNull();

			pressEscape();
			await nextTick();

			// A zero duration makes the sampler call `onFinish` synchronously
			// and never touch `element.animate()`, so the close is exactly as
			// instant as it was before this component animated out at all — no
			// `waitFor` needed, and none allowed here.
			expect(rootMenu()).toBeNull();
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});
});
