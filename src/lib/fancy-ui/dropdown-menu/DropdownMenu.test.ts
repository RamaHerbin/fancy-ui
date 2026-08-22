import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { sound } from "../sound/sound.svelte.js";

// Spies on the real `anchorPosition` action instead of replacing it, so
// positioning assertions check what a submenu asked for while the action
// itself still runs for real (jsdom doesn't compute layout, but the action
// must not throw either) — the same setup `Popover.test.ts` uses, needed
// here only for the submenu placement-flip test below.
vi.mock("../_internals/anchor-position.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../_internals/anchor-position.js")>();
	return { ...actual, anchorPosition: vi.fn(actual.anchorPosition) };
});

import { anchorPosition } from "../_internals/anchor-position.js";
import Harness from "./DropdownMenuHarness.test.svelte";

interface ItemSpec {
	label: string;
	disabled?: boolean;
	variant?: "default" | "destructive";
	shortcut?: string;
	icon?: string;
	closeOnSelect?: boolean;
}

const ITEMS: ItemSpec[] = [
	{ label: "Rename", shortcut: "⌘R" },
	{ label: "Duplicate", shortcut: "⌘D" },
	{ label: "Share" },
	{ label: "Delete", variant: "destructive" },
];

function trigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector(".ft-dropdown-menu-trigger") as HTMLButtonElement;
}

function menus(): HTMLElement[] {
	return Array.from(document.querySelectorAll('[role="menu"]'));
}

// The root content is the only one carrying `aria-labelledby` (it points at
// the real trigger button; a submenu has no equivalent single label to
// point at) — the one reliable way to tell the two apart when both are
// portalled to `document.body` at once.
function rootMenu(): HTMLElement | null {
	return menus().find((el) => el.hasAttribute("aria-labelledby")) ?? null;
}

function subMenu(): HTMLElement | null {
	return menus().find((el) => !el.hasAttribute("aria-labelledby")) ?? null;
}

function items(root: HTMLElement | null): HTMLElement[] {
	return root ? Array.from(root.querySelectorAll('[role="menuitem"]')) : [];
}

// Visible text only, skipping `aria-hidden="true"` subtrees — the same
// definition `menu.svelte.ts`'s own typeahead fallback uses, so this helper
// finds a row by the label a sighted user actually reads, not by raw
// `textContent` (which would include a leading icon glyph or a trailing
// shortcut and stop matching the moment a row has either).
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
	// the convention `menu.svelte.ts`'s typeahead fallback relies on (visible
	// text only, skipping `aria-hidden` subtrees) — the same convention this
	// component follows without needing `data-typeahead-label` to state its
	// label explicitly. Uses `document.activeElement` directly rather than
	// `itemByLabel` so the assertion reflects what the core actually
	// focused, not a test helper's own lookup.
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
	// `DropdownMenuSubTrigger`'s own registration effect) — its icon and
	// caret are `aria-hidden` siblings of the label too, same convention.
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
	// together as one subtree) — see `DropdownMenuContent`'s own comment for
	// why a leaf-level `text-[13px]` would have made `ContextMenuContent`'s
	// distinct 12px unreachable.
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

	// Tab is never `preventDefault`ed, so real browsers continue their own
	// Tab traversal from whatever the menu core left focused — jsdom does
	// not implement that default action (it does not move focus on Tab at
	// all), so this test can only prove the menu closes and that, unlike
	// Escape, this component does not force focus back onto the trigger.
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

	// `fireEvent.click` in jsdom fires only the click event, never a
	// preceding `mouseenter` — exactly the gap a touch tap leaves in a real
	// browser too. Without syncing the menu core's tracked focus position on
	// click, arrow-key navigation after a `closeOnSelect: false` selection
	// would still start from wherever focus was *before* the click (here,
	// the first item from opening), not from the row the user just acted on.
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

		await fireEvent.pointerDown(outside);
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

		// `DropdownMenuSubContent` is portalled independently of the root
		// panel — once both are open they're DOM *siblings* under
		// `document.body`, not ancestor/descendant, so the submenu can't pick
		// up `text-[13px]` through plain CSS inheritance the way a top-level
		// item does. It has to come through `MenuContext.itemTextClass`
		// instead, forwarded from the root's own context.
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
			expect(rootMenu()).toBeNull();
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

			// `anchorPosition` ran for real when `SubContent` mounted (it's
			// spied on, not replaced) — this inspects what it was asked to do,
			// then drives its own `onPlacement` callback directly, since
			// jsdom's zeroed `getBoundingClientRect()` can never produce a real
			// flip on its own.
			const call = vi.mocked(anchorPosition).mock.calls.find(([, opts]) => opts.side === "right");
			expect(call).toBeTruthy();
			const opts = call![1];
			expect(subBtn.textContent).toContain("›");

			opts.onPlacement?.("left");
			await tick();
			expect(subBtn.textContent).toContain("‹");
		});

		// A submenu's hover-intent timers (the open-intent one on
		// `DropdownMenuSubTrigger`, the close-intent one on `DropdownMenuSub`)
		// are only ever cleared from event handlers — mouseenter/mouseleave —
		// unless a mount-effect cleanup clears them on destroy too. Neither
		// leaving one armed crashes on a whole-tree unmount (every downstream
		// call it could reach already guards against a stale/detached
		// target), so this can't assert a crash — it instead spies on
		// `clearTimeout` around the unmount call itself and checks the
		// pending timer is torn down, which is what the fix actually does.
		// The scenario this really protects — a keyed `{#each}` reorder
		// destroying one `Sub`/`SubTrigger` while the parent context and its
		// siblings stay mounted — isn't reachable through this harness (it
		// only ever renders one optional submenu, not a dynamic list of
		// them), so it's covered by this narrower, still-real proxy instead.
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
		// `open === next` early return — so even if a real browser also fired
		// a native click from the same Enter keypress, the second call would
		// see `open` already `true` and play nothing. Nothing here can drive
		// two separate opens in this environment, so this proves the single
		// path fires exactly once.
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
		// already handles for a pointer click, with no separate keydown path
		// of its own to double it. Documented (rather than left implicit)
		// because there is no jsdom-simulable difference between "click" and
		// "Enter while a button holds focus" to assert on directly here — see
		// the analogous note on the existing keyboard-activation tests above.
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
});
