import { Fragment, useState } from "react";
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import { resetSoundForTests, sound } from "../../sound/sound.js";
import { __dismissableLayerCount } from "../../internals/dismissable.js";
import { FakeAnimation } from "../../test-setup.js";

// Spies on the real `attachAnchorPosition` core instead of replacing it, so
// positioning assertions check what a panel asked for while the core itself
// still runs for real (jsdom doesn't compute layout, but the core must not
// throw either). `use-anchor-position.ts` imports this module by the same
// specifier, so the hook picks the spy up — and the `onPlacement` the hook
// hands the core is the hook's OWN callback, which is what lets a test drive a
// flip that jsdom's zeroed rects could never produce.
vi.mock("../../internals/anchor-position.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../internals/anchor-position.js")>();
	return { ...actual, attachAnchorPosition: vi.fn(actual.attachAnchorPosition) };
});

import { attachAnchorPosition } from "../../internals/anchor-position.js";
import type { Align } from "../../internals/anchor-position.js";
import { DropdownMenu } from "./DropdownMenu.js";
import { DropdownMenuTrigger } from "./DropdownMenuTrigger.js";
import { DropdownMenuContent } from "./DropdownMenuContent.js";
import { DropdownMenuItem } from "./DropdownMenuItem.js";
import { DropdownMenuSeparator } from "./DropdownMenuSeparator.js";
import { DropdownMenuLabel } from "./DropdownMenuLabel.js";
import { DropdownMenuSub } from "./DropdownMenuSub.js";
import { DropdownMenuSubTrigger } from "./DropdownMenuSubTrigger.js";
import { DropdownMenuSubContent } from "./DropdownMenuSubContent.js";

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
	variant?: "default" | "destructive";
	shortcut?: string;
	icon?: string;
	closeOnSelect?: boolean;
}

interface HarnessProps {
	items: ItemSpec[];
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onSelect?: (label: string) => void;
	align?: Align;
	loop?: boolean;
	triggerDisabled?: boolean;
	labelText?: string;
	separatorBeforeIndex?: number;
	withSubmenu?: boolean;
	subItems?: ItemSpec[];
	subTriggerDisabled?: boolean;
	sound?: boolean;
}

/**
 * The source's `DropdownMenuHarness.test.svelte`, as a plain component.
 *
 * This family's behaviour lives across the root, the trigger, the content and
 * its items together, so proving any of it needs real instances of all of
 * them, wired up the way a consumer actually would. Every prop a test might
 * need to vary is a parameter here, never hardcoded. A `.test.svelte` file
 * existed only because Svelte components need their own file; React declares
 * the rig inline (contract §9.2).
 */
function Harness({
	items,
	open,
	onOpenChange,
	onSelect,
	align,
	loop = true,
	triggerDisabled = false,
	labelText,
	separatorBeforeIndex,
	withSubmenu = false,
	subItems = [],
	subTriggerDisabled = false,
	sound: soundProp = false,
}: HarnessProps) {
	return (
		<DropdownMenu
			open={open}
			onOpenChange={onOpenChange}
			align={align}
			loop={loop}
			sound={soundProp}
		>
			<DropdownMenuTrigger disabled={triggerDisabled}>Open menu</DropdownMenuTrigger>
			<DropdownMenuContent>
				{labelText ? <DropdownMenuLabel>{labelText}</DropdownMenuLabel> : null}
				{items.map((item, index) => (
					<Fragment key={item.label}>
						{separatorBeforeIndex === index ? <DropdownMenuSeparator /> : null}
						<DropdownMenuItem
							disabled={item.disabled}
							variant={item.variant}
							shortcut={item.shortcut}
							closeOnSelect={item.closeOnSelect}
							icon={item.icon}
							onSelect={() => onSelect?.(item.label)}
						>
							{item.label}
						</DropdownMenuItem>
					</Fragment>
				))}
				{withSubmenu ? (
					<DropdownMenuSub>
						<DropdownMenuSubTrigger disabled={subTriggerDisabled}>
							More tools
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							{subItems.map((item) => (
								<DropdownMenuItem
									key={item.label}
									disabled={item.disabled}
									onSelect={() => onSelect?.(item.label)}
								>
									{item.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

const ITEMS: ItemSpec[] = [
	{ label: "Rename", shortcut: "⌘R" },
	{ label: "Duplicate", shortcut: "⌘D" },
	{ label: "Share" },
	{ label: "Delete", variant: "destructive" },
];

function trigger(): HTMLButtonElement {
	return document.querySelector(".ft-dropdown-menu-trigger") as HTMLButtonElement;
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
 * override installed before the panel opens is the one that decides whether
 * the motion runs at all — entrance and exit alike.
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

/** The options the anchor core was last attached with for a given requested side. */
function anchorCallFor(side: string) {
	return vi
		.mocked(attachAnchorPosition)
		.mock.calls.filter(([, opts]) => opts.side === side)
		.at(-1);
}

describe("DropdownMenu", () => {
	afterEach(() => {
		cleanup();
		expect(__dismissableLayerCount()).toBe(0);
		document.body.innerHTML = "";
		vi.mocked(attachAnchorPosition).mockClear();
		vi.unstubAllGlobals();
		// `vi.spyOn` on an already-mocked property reuses the existing mock
		// rather than layering a new one, so without this a later
		// `expect(animateSpy).not.toHaveBeenCalled()` would see an earlier
		// test's calls too.
		vi.restoreAllMocks();
	});

	it("renders closed by default: aria-haspopup menu, aria-expanded false, no aria-controls, no panel", () => {
		render(<Harness items={ITEMS} />);
		const btn = trigger();

		expect(btn.getAttribute("aria-haspopup")).toBe("menu");
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(btn.hasAttribute("aria-controls")).toBe(false);
		expect(rootMenu()).toBeNull();
	});

	it("opens on trigger click; aria-controls appears and points at the panel's real id, then disappears on close", async () => {
		render(<Harness items={ITEMS} />);
		const btn = trigger();

		fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("true");
		const controls = btn.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(rootMenu()?.id).toBe(controls);
		expect(rootMenu()?.getAttribute("aria-labelledby")).toBe(btn.id);
		await settleLegs();

		fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(btn.hasAttribute("aria-controls")).toBe(false);
		await waitFor(() => expect(rootMenu()).toBeNull());
	});

	it("Enter, Space and ArrowDown on the trigger open the menu and focus the first item", async () => {
		for (const key of ["Enter", " ", "ArrowDown"]) {
			const { unmount } = render(<Harness items={ITEMS} />);
			fireEvent.keyDown(trigger(), { key });
			await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename")));
			unmount();
			document.body.querySelectorAll('[role="menu"]').forEach((el) => el.remove());
		}
	});

	it("ArrowUp on the trigger opens the menu and focuses the last item", async () => {
		render(<Harness items={ITEMS} />);
		fireEvent.keyDown(trigger(), { key: "ArrowUp" });
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Delete")));
	});

	it("ArrowDown/ArrowUp move focus among items and wrap by default", async () => {
		render(<Harness items={ITEMS} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename")));

		fireEvent.keyDown(rootMenu()!, { key: "ArrowUp" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Delete"));

		fireEvent.keyDown(rootMenu()!, { key: "ArrowDown" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename"));
	});

	it("does not wrap when loop is false", async () => {
		render(<Harness items={ITEMS} loop={false} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename")));

		fireEvent.keyDown(rootMenu()!, { key: "ArrowUp" });
		// Nothing before the first item to move to — focus stays put.
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename"));
	});

	it("Home and End jump to the first and last item", async () => {
		render(<Harness items={ITEMS} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename")));

		fireEvent.keyDown(rootMenu()!, { key: "End" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Delete"));

		fireEvent.keyDown(rootMenu()!, { key: "Home" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename"));
	});

	it("typeahead focuses the item whose label starts with the typed character", async () => {
		render(<Harness items={ITEMS} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		fireEvent.keyDown(rootMenu()!, { key: "s" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Share"));
	});

	// This item's icon and shortcut are both `aria-hidden`, which is exactly
	// the convention the menu core's typeahead fallback relies on (visible
	// text only, skipping `aria-hidden` subtrees) — the same convention this
	// component follows without needing `data-typeahead-label` to state its
	// label explicitly. Uses `document.activeElement` directly rather than
	// `itemByLabel` so the assertion reflects what the core actually focused,
	// not a test helper's own lookup.
	it("typeahead still matches the visible label when an item is decorated with an icon and a shortcut", async () => {
		const decorated: ItemSpec[] = [
			{ label: "Archive" },
			{ label: "Rename", icon: "✎", shortcut: "⌘R" },
		];
		render(<Harness items={decorated} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		fireEvent.keyDown(rootMenu()!, { key: "r" });
		expect(document.activeElement?.textContent).toContain("Rename");
	});

	// A submenu trigger is a normal item in its *parent's* typeahead — its
	// icon and caret are `aria-hidden` siblings of the label too, same
	// convention.
	it("typeahead still matches a submenu trigger's visible label, ignoring its icon and caret", async () => {
		render(<Harness items={[{ label: "Reload" }]} withSubmenu subItems={[{ label: "Inspect" }]} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		fireEvent.keyDown(rootMenu()!, { key: "m" });
		expect(document.activeElement?.textContent).toContain("More tools");
	});

	// Font-size lives on the panel, not the item: `DropdownMenuItem` pins no
	// size of its own and inherits from `DropdownMenuContent`'s `text-[13px]`
	// via normal CSS (they're DOM ancestor/descendant once portalled, rendered
	// into the same container) — a leaf-level `text-[13px]` would make another
	// family's distinct density unreachable.
	it("the panel carries the item font-size; items carry none of their own", async () => {
		render(<Harness items={ITEMS} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		expect(rootMenu()?.className).toContain("text-[13px]");
		expect(itemByLabel(rootMenu(), "Rename")?.className).not.toMatch(/text-\[\d+px\]/);
	});

	it("Escape closes the menu and returns focus to the trigger", async () => {
		render(<Harness items={ITEMS} />);
		const btn = trigger();
		btn.focus();

		fireEvent.click(btn);
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename")));

		fireEvent.keyDown(document, { key: "Escape" });
		await waitFor(() => expect(rootMenu()).toBeNull());
		expect(document.activeElement).toBe(btn);
	});

	// Tab is never `preventDefault`ed: the browser's own traversal is what moves
	// focus on, and it moves on from wherever focus SITS. The panel is portalled
	// to `document.body`, so the item holding focus is a DOM sibling of the whole
	// app — a Tab resuming from there, or from `<body>` once the panel is gone,
	// walks straight past every control that follows the trigger. Focus is
	// therefore handed back to the trigger synchronously, inside the keydown, so
	// the default action starts from the right place. jsdom implements no Tab
	// default action at all, so that handoff is exactly what is provable here.
	it("Tab closes the menu and hands focus back to the trigger for the browser's own traversal", async () => {
		render(<Harness items={ITEMS} />);
		const btn = trigger();

		fireEvent.click(btn);
		await waitFor(() => expect(rootMenu()).not.toBeNull());
		await waitFor(() => expect(rootMenu()!.contains(document.activeElement)).toBe(true));

		// Dispatched on the focused ITEM, the way a real key press arrives — the
		// item is the node the browser would resume its traversal from.
		fireEvent.keyDown(document.activeElement!, { key: "Tab" });
		expect(document.activeElement).toBe(btn);
		await waitFor(() => expect(rootMenu()).toBeNull());
	});

	it("Shift+Tab does the same, so the traversal backward resumes at the trigger too", async () => {
		render(<Harness items={ITEMS} />);
		const btn = trigger();

		fireEvent.click(btn);
		await waitFor(() => expect(rootMenu()).not.toBeNull());
		await waitFor(() => expect(rootMenu()!.contains(document.activeElement)).toBe(true));

		fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
		expect(document.activeElement).toBe(btn);
		await waitFor(() => expect(rootMenu()).toBeNull());
	});

	it("selecting an item fires onSelect and closes the menu by default", async () => {
		const onSelect = vi.fn();
		render(<Harness items={ITEMS} onSelect={onSelect} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		fireEvent.click(itemByLabel(rootMenu(), "Duplicate")!);
		expect(onSelect).toHaveBeenCalledWith("Duplicate");
		await waitFor(() => expect(rootMenu()).toBeNull());
	});

	it("closeOnSelect: false keeps the menu open after selection", async () => {
		const onSelect = vi.fn();
		const pinnedItems: ItemSpec[] = [{ label: "Keep open", closeOnSelect: false }];
		render(<Harness items={pinnedItems} onSelect={onSelect} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		fireEvent.click(itemByLabel(rootMenu(), "Keep open")!);
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
		render(<Harness items={pinnedItems} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "First")));

		fireEvent.click(itemByLabel(rootMenu(), "Third")!);
		expect(rootMenu()).not.toBeNull();

		// If focus were still tracked at "First" (unmoved by the click),
		// ArrowDown would land on "Second". Landing on "First" instead proves
		// the click moved the tracked position to "Third" first, then wrapped.
		fireEvent.keyDown(rootMenu()!, { key: "ArrowDown" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "First"));
	});

	it("a disabled item does not fire onSelect on click, and is skipped by arrow-key navigation", async () => {
		const onSelect = vi.fn();
		const withDisabled: ItemSpec[] = [
			{ label: "First" },
			{ label: "Blocked", disabled: true },
			{ label: "Last" },
		];
		render(<Harness items={withDisabled} onSelect={onSelect} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "First")));

		fireEvent.click(itemByLabel(rootMenu(), "Blocked")!);
		expect(onSelect).not.toHaveBeenCalled();

		fireEvent.keyDown(rootMenu()!, { key: "ArrowDown" });
		expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Last"));
	});

	it("renders the destructive variant with data-variant and the destructive text class", async () => {
		render(<Harness items={ITEMS} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		const destructive = itemByLabel(rootMenu(), "Delete")!;
		expect(destructive.getAttribute("data-variant")).toBe("destructive");
		expect(destructive.className).toContain("text-destructive");
	});

	it("renders a shortcut as an aria-hidden kbd, display-only", async () => {
		render(<Harness items={ITEMS} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		const rename = itemByLabel(rootMenu(), "Rename")!;
		const kbd = rename.querySelector("kbd");
		expect(kbd?.textContent).toBe("⌘R");
		expect(kbd?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders a group label that is not a menuitem", async () => {
		render(<Harness items={ITEMS} labelText="Actions" />);
		fireEvent.click(trigger());
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		expect(rootMenu()?.textContent).toContain("Actions");
		expect(items(rootMenu()).some((el) => el.textContent?.trim() === "Actions")).toBe(false);
	});

	it("renders a separator with role=separator", async () => {
		render(<Harness items={ITEMS} separatorBeforeIndex={2} />);
		fireEvent.click(trigger());
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		expect(rootMenu()?.querySelector('[role="separator"]')).not.toBeNull();
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		render(<Harness items={ITEMS} />);

		fireEvent.click(trigger());
		await waitFor(() => expect(rootMenu()).not.toBeNull());

		pointerDownOn(outside);
		await waitFor(() => expect(rootMenu()).toBeNull());
		outside.remove();
	});

	it("a disabled trigger never opens the menu, by click or by keyboard", () => {
		render(<Harness items={ITEMS} triggerDisabled />);
		const btn = trigger();

		fireEvent.click(btn);
		expect(rootMenu()).toBeNull();

		fireEvent.keyDown(btn, { key: "ArrowDown" });
		expect(rootMenu()).toBeNull();
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
		render(<Controlled />);

		fireEvent.click(trigger());
		expect(observed).toBe(true);
		expect(rootMenu()).not.toBeNull();
		await settleLegs();
	});

	it("works uncontrolled with only onOpenChange", async () => {
		const onOpenChange = vi.fn();
		render(<Harness items={ITEMS} onOpenChange={onOpenChange} />);

		fireEvent.click(trigger());
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(rootMenu()).not.toBeNull();
		await settleLegs();
	});

	describe("submenu", () => {
		const SUB_ITEMS: ItemSpec[] = [{ label: "Screenshot" }, { label: "Inspect" }];

		it("opens on click and focuses its first item, carrying aria-haspopup/expanded/controls", async () => {
			render(<Harness items={ITEMS} withSubmenu subItems={SUB_ITEMS} />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;
			expect(subBtn.getAttribute("aria-haspopup")).toBe("menu");
			expect(subBtn.getAttribute("aria-expanded")).toBe("false");

			fireEvent.click(subBtn);
			await waitFor(() => expect(subMenu()).not.toBeNull());
			expect(subBtn.getAttribute("aria-expanded")).toBe("true");
			expect(subBtn.getAttribute("aria-controls")).toBe(subMenu()!.id);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);
		});

		// WAI-ARIA's menu-button/submenu pattern requires a submenu panel to be
		// named by the row that opened it — without it, a screen-reader user who
		// arrows into a submenu hears only an anonymous "menu" and loses which
		// item they drilled into.
		it("names the submenu panel after its own sub-trigger via aria-labelledby", async () => {
			render(<Harness items={ITEMS} withSubmenu subItems={SUB_ITEMS} />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			fireEvent.click(subBtn);
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
			render(<Harness items={ITEMS} withSubmenu subItems={SUB_ITEMS} />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() => expect(subMenu()).not.toBeNull());

			expect(subMenu()?.className).toContain("text-[13px]");
		});

		it("ArrowRight opens the submenu from the trigger", async () => {
			render(<Harness items={ITEMS} withSubmenu subItems={SUB_ITEMS} />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;
			subBtn.focus();

			fireEvent.keyDown(subBtn, { key: "ArrowRight" });
			await waitFor(() => expect(subMenu()).not.toBeNull());
		});

		it("ArrowLeft closes the submenu and returns focus to its trigger", async () => {
			render(<Harness items={ITEMS} withSubmenu subItems={SUB_ITEMS} />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			fireEvent.click(subBtn);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);

			fireEvent.keyDown(subMenu()!, { key: "ArrowLeft" });
			await waitFor(() => expect(subMenu()).toBeNull());
			expect(document.activeElement).toBe(subBtn);
		});

		// The two keys below are the ones that expose a React-only hazard the
		// source cannot have: both panels are portalled to `document.body`, so
		// they are DOM siblings, but the submenu's panel stays a React-tree
		// DESCENDANT of the root panel's `onKeyDown` and React propagates
		// synthetic events through a portal. Every key that ends in a real
		// `.focus()` therefore gets a second dispatch against the ROOT level's
		// focus core, which drags the highlight out of the submenu and leaves
		// it unnavigable. ArrowRight/ArrowLeft never showed it — their key
		// strings are longer than one character, so the root's typeahead
		// fallback ignores them — and Tab did not either, both levels' `onTab`
		// being idempotent. Only arrow navigation and typeahead do.
		it("ArrowDown inside an open submenu moves within that submenu, never back into the root panel", async () => {
			render(<Harness items={ITEMS} withSubmenu subItems={SUB_ITEMS} />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);

			// Dispatched on the focused ITEM, the way a real key press arrives,
			// rather than on the panel — the panel is what the root handler's
			// own dispatch would target, and aiming at it would hide the bug.
			fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });

			expect(document.activeElement).toBe(itemByLabel(subMenu(), "Inspect"));
			expect(subMenu()!.contains(document.activeElement)).toBe(true);
		});

		it("typeahead inside an open submenu matches that submenu's items, not the root's", async () => {
			// "Delete cache" and the root's own "Delete"/"Duplicate" all start
			// with the same character on purpose: the keystroke has a real
			// match at BOTH levels, so the assertion tells the two apart
			// instead of passing on a root core that simply found nothing.
			render(
				<Harness
					items={ITEMS}
					withSubmenu
					subItems={[{ label: "Screenshot" }, { label: "Delete cache" }]}
				/>
			);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);

			fireEvent.keyDown(document.activeElement!, { key: "d" });

			expect(document.activeElement).toBe(itemByLabel(subMenu(), "Delete cache"));
			expect(subMenu()!.contains(document.activeElement)).toBe(true);
		});

		it("opens after a hover intent delay, not instantly", async () => {
			render(<Harness items={ITEMS} withSubmenu subItems={SUB_ITEMS} />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			fireEvent.mouseEnter(subBtn);
			expect(subMenu()).toBeNull();
			await waitFor(() => expect(subMenu()).not.toBeNull());
		});

		it("selecting a submenu item closes the entire tree, not just the submenu", async () => {
			const onSelect = vi.fn();
			render(<Harness items={ITEMS} withSubmenu subItems={SUB_ITEMS} onSelect={onSelect} />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);

			fireEvent.click(itemByLabel(subMenu(), "Screenshot")!);
			expect(onSelect).toHaveBeenCalledWith("Screenshot");
			await waitFor(() => expect(subMenu()).toBeNull());
			// Both levels fade on the same clock, so the root's removal is not
			// guaranteed to have landed by the time the submenu's has — this
			// waits for it rather than relying on the order two exits happen to
			// resolve in.
			await waitFor(() => expect(rootMenu()).toBeNull());
		});

		it("a disabled submenu trigger does not open on click or ArrowRight", async () => {
			render(<Harness items={ITEMS} withSubmenu subItems={SUB_ITEMS} subTriggerDisabled />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			fireEvent.click(subBtn);
			expect(subMenu()).toBeNull();
			fireEvent.keyDown(subBtn, { key: "ArrowRight" });
			expect(subMenu()).toBeNull();
		});

		it("reports a placement flip through onPlacement so the trigger's caret can mirror it", async () => {
			render(<Harness items={ITEMS} withSubmenu subItems={SUB_ITEMS} />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			fireEvent.click(subBtn);
			await waitFor(() => expect(subMenu()).not.toBeNull());

			// `attachAnchorPosition` ran for real when the submenu panel mounted
			// (it's spied on, not replaced) — this inspects what it was asked to
			// do, then drives the `onPlacement` the hook handed it, since jsdom's
			// zeroed `getBoundingClientRect()` can never produce a real flip on
			// its own.
			const call = anchorCallFor("right");
			expect(call).toBeTruthy();
			const opts = call![1];
			expect(subBtn.textContent).toContain("›");

			act(() => {
				opts.onPlacement?.("left", "start");
			});
			expect(subBtn.textContent).toContain("‹");
		});

		// A submenu's hover-intent timers (the open-intent one on
		// `DropdownMenuSubTrigger`, the close-intent one on `DropdownMenuSub`)
		// are only ever cleared from event handlers — mouseenter/mouseleave —
		// unless an unmount cleanup clears them too. Neither leaving one armed
		// crashes on a whole-tree unmount (every downstream call it could reach
		// already guards against a stale/detached target), so this can't assert
		// a crash — it instead spies on `clearTimeout` around the unmount call
		// itself and checks the pending timer is torn down.
		it("clears the open-intent timer on unmount rather than leaving it armed", async () => {
			const { unmount } = render(<Harness items={ITEMS} withSubmenu subItems={SUB_ITEMS} />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			// Starts the open-intent timer without letting it fire.
			fireEvent.mouseEnter(subBtn);

			const clearSpy = vi.spyOn(window, "clearTimeout");
			unmount();
			expect(clearSpy).toHaveBeenCalled();
			clearSpy.mockRestore();
		});

		it("clears the submenu's close-intent timer on unmount rather than leaving it armed", async () => {
			const { unmount } = render(<Harness items={ITEMS} withSubmenu subItems={SUB_ITEMS} />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			const subBtn = subTriggerEl(rootMenu())!;

			// Opens the submenu, then leaves it — starting the close-intent
			// timer — without letting it fire.
			fireEvent.click(subBtn);
			await waitFor(() => expect(subMenu()).not.toBeNull());
			fireEvent.mouseLeave(subBtn);

			const clearSpy = vi.spyOn(window, "clearTimeout");
			unmount();
			expect(clearSpy).toHaveBeenCalled();
			clearSpy.mockRestore();
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

		it("trigger click plays open exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<Harness items={ITEMS} sound />);

			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
		});

		// Enter on the trigger opens through the very same `setOpen`
		// (`openWithFocus` → `setOpen`) as a click does, guarded by its own
		// `open === next` early return — so even if a real browser also fired a
		// native click from the same Enter keypress, the second call would see
		// `open` already `true` and play nothing.
		it("keyboard Enter on the trigger opens with exactly one cue, no synthetic double", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<Harness items={ITEMS} sound />);

			fireEvent.keyDown(trigger(), { key: "Enter" });
			await waitFor(() => expect(rootMenu()).not.toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
		});

		it("trigger click to close plays close exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<Harness items={ITEMS} sound />);
			const btn = trigger();
			fireEvent.click(btn);
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			play.mockClear();

			fireEvent.click(btn);
			await waitFor(() => expect(rootMenu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("Escape plays close exactly once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<Harness items={ITEMS} sound />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			play.mockClear();

			fireEvent.keyDown(document, { key: "Escape" });
			await waitFor(() => expect(rootMenu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("item activation by click plays select exactly once, never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<Harness items={ITEMS} sound />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			play.mockClear();

			fireEvent.click(itemByLabel(rootMenu(), "Duplicate")!);
			await waitFor(() => expect(rootMenu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		// A native button also fires a real `click` event for a real Enter
		// keypress while it holds focus — the same activation `handleClick`
		// already handles for a pointer click, with no separate keydown path of
		// its own to double it. There is no jsdom-simulable difference between
		// "click" and "Enter while a button holds focus" to assert on directly.
		it("item activation by keyboard (Enter) plays select exactly once, never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<Harness items={ITEMS} sound />);
			fireEvent.click(trigger());
			await waitFor(() => expect(document.activeElement).toBe(itemByLabel(rootMenu(), "Rename")));
			play.mockClear();

			fireEvent.click(itemByLabel(rootMenu(), "Rename")!);
			await waitFor(() => expect(rootMenu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("closeOnSelect: false still plays select and nothing else", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const pinnedItems: ItemSpec[] = [{ label: "Keep open", closeOnSelect: false }];
			render(<Harness items={pinnedItems} sound />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			play.mockClear();

			fireEvent.click(itemByLabel(rootMenu(), "Keep open")!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
			expect(rootMenu()).not.toBeNull();
		});

		it("a disabled item plays nothing", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const withDisabled: ItemSpec[] = [{ label: "Locked", disabled: true }];
			render(<Harness items={withDisabled} sound />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			play.mockClear();

			fireEvent.click(itemByLabel(rootMenu(), "Locked")!);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing at all with the default prop", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<Harness items={ITEMS} />);

			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			fireEvent.click(itemByLabel(rootMenu(), "Duplicate")!);
			await waitFor(() => expect(rootMenu()).toBeNull());

			expect(play).not.toHaveBeenCalled();
		});

		it("a submenu item inherits sound: select plays once, closes the whole tree silently", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<Harness items={ITEMS} withSubmenu subItems={[{ label: "Screenshot" }]} sound />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);
			play.mockClear();

			fireEvent.click(itemByLabel(subMenu(), "Screenshot")!);
			await waitFor(() => expect(rootMenu()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("opening a submenu plays open once; ArrowLeft back out plays close once", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<Harness items={ITEMS} withSubmenu subItems={[{ label: "Screenshot" }]} sound />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			play.mockClear();

			fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);

			play.mockClear();
			fireEvent.keyDown(itemByLabel(subMenu(), "Screenshot")!, { key: "ArrowLeft" });
			await waitFor(() => expect(subMenu()).toBeNull());
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("Escape closes one layer at a time, each with exactly one close cue", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<Harness items={ITEMS} withSubmenu subItems={[{ label: "Screenshot" }]} sound />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);
			play.mockClear();

			fireEvent.keyDown(document.activeElement!, { key: "Escape" });
			await waitFor(() => expect(subMenu()).toBeNull());
			expect(play.mock.calls).toEqual([["close", undefined]]);

			play.mockClear();
			fireEvent.keyDown(document.activeElement!, { key: "Escape" });
			await waitFor(() => expect(rootMenu()).toBeNull());
			expect(play.mock.calls).toEqual([["close", undefined]]);
		});

		it("selecting inside a submenu closes the whole tree with select only — no close from any level", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<Harness items={ITEMS} withSubmenu subItems={[{ label: "Screenshot" }]} sound />);
			fireEvent.click(trigger());
			await waitFor(() => expect(rootMenu()).not.toBeNull());
			fireEvent.click(subTriggerEl(rootMenu())!);
			await waitFor(() =>
				expect(document.activeElement).toBe(itemByLabel(subMenu(), "Screenshot"))
			);
			play.mockClear();

			fireEvent.click(itemByLabel(subMenu(), "Screenshot")!);
			await waitFor(() => expect(rootMenu()).toBeNull());
			expect(play.mock.calls).toEqual([["select", undefined]]);
		});
	});

	// The entrance itself lives in `internals/motion/anchored.ts` and is tested
	// there. What is component-specific — and so what these cover — is the
	// plumbing: which side the panel asked for, which side it was told it
	// actually got, and the growth origin that follows from the pair.
	describe("anchored entrance", () => {
		it("publishes its resolved placement and grows from the panel edge nearest the trigger", async () => {
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			render(<Harness items={ITEMS} />);
			fireEvent.click(trigger());
			await settleLegs();
			expect(rootMenu()).not.toBeNull();

			// The transition sampler evaluates the transition's `css(t, u)` into
			// a plain `Keyframe[]` and hands it straight to `element.animate()`,
			// so the spy's own arguments are a readable record of what the
			// entrance animates: opacity and transform, nothing else, from the
			// shared `0.92` floor. This doubles as the positive control for the
			// reduced-motion test at the bottom of this block — without it,
			// `not.toHaveBeenCalled()` down there could be measuring a jsdom
			// quirk rather than the preference.
			expect(animateSpy).toHaveBeenCalled();
			const keyframes = animateSpy.mock.calls.at(-1)![0] as Keyframe[];
			expect(keyframes.at(0)).toMatchObject({ opacity: "0", transform: "scale(0.92)" });
			expect(keyframes.at(-1)).toMatchObject({ opacity: "1", transform: "scale(1)" });

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

		// The entrance pins `transform: scale(0.92)` on the panel in the commit
		// its node attaches, and the node reaches the positioning core one
		// commit later — so a placement measured off `getBoundingClientRect()`
		// would size the panel 8% small and leave it there, since the entrance
		// settles and nothing recomputes. The core measures `offsetWidth`/
		// `offsetHeight` instead, which a transform does not touch. Here the
		// painted rect is jsdom's zeroed one and the layout box is 200x100:
		// with `align="end"` the panel's RIGHT edge is what lands on the
		// trigger's, so the width it was measured at is legible in `left`.
		it("places the panel from its LAYOUT box, not the box the entrance transform paints", async () => {
			const originalWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
			const originalHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
			const isPanel = (el: HTMLElement) => el.classList.contains("ft-dropdown-menu-content");
			Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
				configurable: true,
				get(this: HTMLElement) {
					return isPanel(this) ? 200 : 0;
				},
			});
			Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
				configurable: true,
				get(this: HTMLElement) {
					return isPanel(this) ? 100 : 0;
				},
			});

			try {
				render(<Harness items={ITEMS} align="end" />);
				const btn = trigger();
				vi.spyOn(btn, "getBoundingClientRect").mockReturnValue({
					left: 400,
					top: 100,
					right: 500,
					bottom: 140,
					width: 100,
					height: 40,
					x: 400,
					y: 100,
					toJSON() {
						return this;
					},
				} as DOMRect);

				fireEvent.click(btn);
				await waitFor(() => expect(rootMenu()).not.toBeNull());

				// `align="end"`: 500 (the trigger's right edge) minus the panel's
				// own 200 of layout width. A painted measurement reads 0 here and
				// would park the panel at 500px.
				expect(rootMenu()!.style.left).toBe("300px");
				// `side="bottom"` with this family's default 4px offset.
				expect(rootMenu()!.style.top).toBe("144px");
				await settleLegs();
			} finally {
				if (originalWidth) {
					Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalWidth);
				}
				if (originalHeight) {
					Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalHeight);
				}
			}
		});

		it("moves the growth origin to the other edge when the placement flips", async () => {
			render(<Harness items={ITEMS} />);
			fireEvent.click(trigger());
			await settleLegs();

			// Same technique as the submenu caret test above: the anchor core
			// ran for real (it is spied on, not replaced), so this drives the
			// `onPlacement` the hook handed it — jsdom's zeroed rects can never
			// produce a genuine flip.
			const call = anchorCallFor("bottom");
			expect(call).toBeTruthy();
			act(() => {
				call![1].onPlacement?.("top", "start");
			});

			const panel = rootMenu()!;
			expect(panel.getAttribute("data-side")).toBe("top");
			// A panel that flipped above its trigger has to grow downwards out
			// of its own bottom edge, or it would appear to come from the wrong
			// direction entirely.
			expect(panel.style.transformOrigin).toBe("left bottom");
		});

		it("gives the submenu's caret, data-side and growth origin one single source of truth", async () => {
			render(<Harness items={ITEMS} withSubmenu subItems={[{ label: "Screenshot" }]} />);
			fireEvent.click(trigger());
			await settleLegs();
			const subBtn = subTriggerEl(rootMenu())!;
			const beforeSubOpened = FakeAnimation.instances.length;
			fireEvent.click(subBtn);
			await settleLegs();
			expect(subMenu()).not.toBeNull();

			// The submenu's own positive control, and the reason it lives here
			// rather than in a test of its own: everything else this test reads
			// — `data-side`, `data-align`, `transform-origin`, the caret — comes
			// off `SubContext.resolvedSide`, so all of it would still be correct
			// if the transition were dropped from `DropdownMenuSubContent`
			// entirely, and the reduced-motion test below only asserts an
			// absence. Counting the animation opening the submenu added,
			// checking it was made on the submenu panel itself, and reading its
			// keyframes is what actually pins the entrance to this component.
			const panel = subMenu()!;
			const subEnter = FakeAnimation.instances
				.slice(beforeSubOpened)
				.filter((animation) => animation.target === panel)
				.filter((animation) => (animation.keyframes as Keyframe[]).length > 0)
				.at(-1);
			expect(subEnter).toBeTruthy();
			const keyframes = subEnter!.keyframes as Keyframe[];
			expect(keyframes.at(0)).toMatchObject({ opacity: "0", transform: "scale(0.92)" });
			expect(keyframes.at(-1)).toMatchObject({ opacity: "1", transform: "scale(1)" });

			expect(panel.getAttribute("data-side")).toBe("right");
			expect(panel.getAttribute("data-align")).toBe("start");
			expect(panel.style.transformOrigin).toBe("left top");
			expect(subBtn.textContent).toContain("›");

			// `SubContext.resolvedSide` feeds the caret glyph AND the panel's
			// origin — one flip has to move both, which is why this panel keeps
			// no local placement state of its own.
			const call = anchorCallFor("right");
			act(() => {
				call![1].onPlacement?.("left", "start");
			});

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
			render(<Harness items={ITEMS} withSubmenu subItems={[{ label: "Screenshot" }]} />);
			fireEvent.click(trigger());
			await settleLegs();
			fireEvent.click(subTriggerEl(rootMenu())!);
			await settleLegs();

			const panel = subMenu()!;
			const beforeRootClosed = FakeAnimation.instances.length;

			// Selecting a root item closes the whole menu — the submenu is never
			// told anything of its own.
			fireEvent.click(itemByLabel(rootMenu(), "Rename")!);
			await waitFor(() => expect(rootMenu()).toBeNull());

			const subExit = FakeAnimation.instances
				.slice(beforeRootClosed)
				.filter((animation) => animation.target === panel)
				.filter((animation) => (animation.keyframes as Keyframe[]).length > 0)
				.at(-1);

			expect(subExit).toBeTruthy();
			const keyframes = subExit!.keyframes as Keyframe[];
			// The exit floor (0.96), not the entrance floor (0.92).
			expect(keyframes.at(0)).toMatchObject({ opacity: "1", transform: "scale(1)" });
			expect(keyframes.at(-1)).toMatchObject({ opacity: "0", transform: "scale(0.96)" });
		});

		it("runs no animation at all under reduced motion, and both panels are there in the same tick", () => {
			stubMatchMedia(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			render(<Harness items={ITEMS} withSubmenu subItems={[{ label: "Screenshot" }]} />);

			fireEvent.click(trigger());
			expect(rootMenu()).not.toBeNull();

			fireEvent.click(subTriggerEl(rootMenu())!);
			expect(subMenu()).not.toBeNull();

			// A zero duration makes the sampler skip `element.animate()`
			// outright rather than run a zero-length animation, so the absence
			// of any call is the honest proof that nothing was scheduled.
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	// The exit opens a window between the dismiss and the unmount — 150 ms in a
	// browser, a couple of microtasks under the animation stub. These pin what
	// has to be true inside it. Everything a consumer can observe still flips at
	// the dismiss instant: `open`, the trigger's `aria-expanded`, and the focus
	// return (which this family does from `DropdownMenu`'s own `setOpen`,
	// outside the mount gate, and so needs no eager-return handle of its own).
	describe("animated exit", () => {
		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			render(<Harness items={ITEMS} />);
			fireEvent.click(trigger());
			await settleLegs();
			expect(rootMenu()!.getAttribute("data-state")).toBe("open");

			pressEscape();

			const closing = rootMenu();
			expect(closing).toBeTruthy();
			// An ordinary React attribute here (divergence D-2), carrying
			// `surfaceState`'s two values — never `"opening"` (convention C-5).
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// `usePresence` sets this on every registered node for the whole
			// exit. Asserted here so nobody removes the transition without
			// noticing that a menu on its way out would start taking clicks
			// again.
			expect(closing!.inert).toBe(true);

			await waitFor(() => expect(rootMenu()).toBeNull());
		});

		it("fades both levels of a nested menu together, neither blinking out ahead of the other", async () => {
			render(<Harness items={ITEMS} withSubmenu subItems={[{ label: "Screenshot" }]} />);
			fireEvent.click(trigger());
			await settleLegs();
			fireEvent.click(subTriggerEl(rootMenu())!);
			await settleLegs();
			expect(subMenu()).not.toBeNull();

			// Closing the root starts the submenu's exit in the very same commit
			// — `live` folds the root's state in — so both panels are still on
			// screen, both marked closing, for the same window.
			act(() => {
				itemByLabel(rootMenu(), "Rename")!.click();
			});

			expect(rootMenu()!.getAttribute("data-state")).toBe("closing");
			expect(subMenu()!.getAttribute("data-state")).toBe("closing");

			await waitFor(() => expect(rootMenu()).toBeNull());
			await waitFor(() => expect(subMenu()).toBeNull());
		});

		it("swallows a second Escape during the exit — onOpenChange fires exactly once", async () => {
			const onOpenChange = vi.fn();
			render(<Harness items={ITEMS} onOpenChange={onOpenChange} />);
			fireEvent.click(trigger());
			await settleLegs();
			onOpenChange.mockClear();

			pressEscape();
			expect(rootMenu()).toBeTruthy(); // still fading

			pressEscape();
			pressEscape();

			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(false);
			await waitFor(() => expect(rootMenu()).toBeNull());
		});

		it("removes the panel in the same tick again under reduced motion", () => {
			stubMatchMedia(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			render(<Harness items={ITEMS} />);
			fireEvent.click(trigger());
			expect(rootMenu()).not.toBeNull();

			pressEscape();

			// A zero duration makes `runTransition` call its `onFinish`
			// synchronously and never touch `element.animate()`, so the close is
			// exactly as instant as it was before this component animated out at
			// all — no `waitFor` needed, and none allowed here.
			expect(rootMenu()).toBeNull();
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	// The one block with no counterpart in the source suite: React's own
	// double-invoke, which has no Svelte equivalent to transpose.
	describe("React layer", () => {
		it("mounts, opens and closes cleanly under StrictMode — one panel per level, and the dismiss stack drains", async () => {
			render(
				<StrictMode>
					<Harness items={ITEMS} withSubmenu subItems={[{ label: "Screenshot" }]} />
				</StrictMode>
			);

			fireEvent.click(trigger());
			await settleLegs();
			// A registration that survived the double-invoke would show up as a
			// second panel, or as duplicate items inside the one panel.
			expect(menus()).toHaveLength(1);
			expect(items(rootMenu())).toHaveLength(ITEMS.length + 1); // items + the submenu row

			fireEvent.click(subTriggerEl(rootMenu())!);
			await settleLegs();
			expect(menus()).toHaveLength(2);
			expect(__dismissableLayerCount()).toBe(2);

			pressEscape();
			await waitFor(() => expect(subMenu()).toBeNull());
			pressEscape();
			await waitFor(() => expect(rootMenu()).toBeNull());
			expect(__dismissableLayerCount()).toBe(0);
		});
	});
});
