import { StrictMode } from "react";
import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMenuFocus, useMenuFocus, useMenuFocusedIndex, useMenuItemRef } from "./menu.js";
import type { MenuFocusState } from "./menu.js";

/**
 * The React layer only. Everything the factory does — DOM order, disabled
 * skipping, typeahead — is covered framework-free in `menu.test.ts`; what is
 * left to prove here is that the hook holds `loop` live, that the handle's
 * identity never changes, that unmount closes the typeahead timer the Svelte
 * side leaks (D-5), and that a ref-callback registration survives React's
 * detach-then-attach protocol.
 */

/** Containers built by hand, removed one by one so RTL's own cleanup is never
 *  handed a DOM it no longer recognises. */
const created: HTMLElement[] = [];

function mountItems(labels: string[]): { container: HTMLElement; items: HTMLElement[] } {
	const container = document.createElement("div");
	container.setAttribute("role", "menu");
	const items = labels.map((label) => {
		const item = document.createElement("div");
		item.setAttribute("role", "menuitem");
		item.tabIndex = -1;
		item.textContent = label;
		container.appendChild(item);
		return item;
	});
	document.body.appendChild(container);
	created.push(container);
	return { container, items };
}

function registerAll(menu: MenuFocusState, items: HTMLElement[]): void {
	for (const item of items) menu.register(item);
}

afterEach(() => {
	for (const container of created) container.remove();
	created.length = 0;
	vi.useRealTimers();
});

function Item({ menu, label }: { menu: MenuFocusState; label: string }) {
	const ref = useMenuItemRef(menu);
	return (
		<div role="menuitem" tabIndex={-1} ref={ref}>
			{label}
		</div>
	);
}

function Probe({ menu }: { menu: MenuFocusState }) {
	const index = useMenuFocusedIndex(menu);
	return <span data-testid="focused-index">{index}</span>;
}

describe("useMenuFocus", () => {
	it("returns a handle whose identity never changes", () => {
		const { result, rerender } = renderHook(() => useMenuFocus());
		const first = result.current;
		rerender();
		rerender();
		expect(result.current).toBe(first);
	});

	it("reads `loop` as a plain value at navigation time, not at creation time", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const { result, rerender } = renderHook(
			({ loop }: { loop: boolean }) => useMenuFocus({ loop }),
			{
				initialProps: { loop: true },
			}
		);
		registerAll(result.current, items);

		result.current.move(1);
		result.current.move(1);
		expect(result.current.focusedIndex).toBe(1);

		// The same handle, a later render's option value.
		rerender({ loop: false });
		result.current.move(1);
		expect(result.current.focusedIndex).toBe(1);
	});

	it("calls the most recent onFocusChange, not the one captured at mount", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const first = vi.fn();
		const second = vi.fn();
		const { result, rerender } = renderHook(
			({ cb }: { cb: (index: number, element: HTMLElement) => void }) =>
				useMenuFocus({ onFocusChange: cb }),
			{ initialProps: { cb: first } }
		);
		registerAll(result.current, items);

		rerender({ cb: second });
		result.current.move(1);

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledWith(0, items[0]);
	});

	it("clears a pending typeahead timer on unmount", () => {
		vi.useFakeTimers();
		const { items } = mountItems(["Save", "Hide"]);
		const { result, unmount } = renderHook(() => useMenuFocus());
		registerAll(result.current, items);

		// A delta rather than an absolute count: jsdom's own `focus()` leaves a
		// timer behind, and the claim here is about exactly one of them.
		result.current.typeahead("s");
		const pending = vi.getTimerCount();
		unmount();
		expect(vi.getTimerCount()).toBe(pending - 1);

		// And the buffer went with it, so the next character starts fresh —
		// the leak `DropdownMenuContent` has on the Svelte side (D-5).
		result.current.typeahead("h");
		expect(document.activeElement).toBe(items[1]);
	});
});

describe("useMenuItemRef", () => {
	it("registers items so they navigate in document order", () => {
		const menu = createMenuFocus();
		render(
			<div role="menu">
				<Item menu={menu} label="Rename" />
				<Item menu={menu} label="Duplicate" />
			</div>
		);
		const items = screen.getAllByRole("menuitem");

		menu.move(1);
		expect(document.activeElement).toBe(items[0]);
		menu.move(1);
		expect(document.activeElement).toBe(items[1]);
	});

	it("registers each item exactly once through StrictMode's detach-then-attach", () => {
		const menu = createMenuFocus();
		render(
			<StrictMode>
				<div role="menu">
					<Item menu={menu} label="Rename" />
					<Item menu={menu} label="Duplicate" />
				</div>
			</StrictMode>
		);
		const items = screen.getAllByRole("menuitem");

		// A lost re-registration would make the first press do nothing; a
		// duplicated one would make the second press focus the same item again.
		menu.move(1);
		expect(document.activeElement).toBe(items[0]);
		menu.move(1);
		expect(document.activeElement).toBe(items[1]);
	});

	it("drops an item that unmounts, so it is never a focus target", () => {
		const menu = createMenuFocus();
		function Menu({ labels }: { labels: string[] }) {
			return (
				<div role="menu">
					{labels.map((label) => (
						<Item key={label} menu={menu} label={label} />
					))}
				</div>
			);
		}
		const { rerender } = render(<Menu labels={["Rename", "Duplicate", "Share"]} />);

		rerender(<Menu labels={["Rename", "Share"]} />);
		const items = screen.getAllByRole("menuitem");

		menu.move(1);
		menu.move(1);
		expect(document.activeElement).toBe(items[1]);
		expect(items[1]).toHaveTextContent("Share");
	});
});

describe("useMenuFocusedIndex", () => {
	it("starts at -1 and follows the focused item", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		render(<Probe menu={menu} />);

		expect(screen.getByTestId("focused-index")).toHaveTextContent("-1");

		act(() => {
			menu.move(1);
		});
		expect(screen.getByTestId("focused-index")).toHaveTextContent("0");

		act(() => {
			menu.focusItem(items[1]!);
		});
		expect(screen.getByTestId("focused-index")).toHaveTextContent("1");
	});

	it("returns to -1 when the menu clears its focused item", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const menu = createMenuFocus();
		registerAll(menu, items);
		render(<Probe menu={menu} />);

		act(() => {
			menu.move(1);
		});
		act(() => {
			menu.clear();
		});
		expect(screen.getByTestId("focused-index")).toHaveTextContent("-1");
	});

	it("returns to -1 when the focused item unregisters", () => {
		const { items } = mountItems(["Rename", "Duplicate"]);
		const menu = createMenuFocus();
		const unregisterFirst = menu.register(items[0]!);
		menu.register(items[1]!);
		render(<Probe menu={menu} />);

		act(() => {
			menu.move(1);
		});
		expect(screen.getByTestId("focused-index")).toHaveTextContent("0");

		act(() => {
			unregisterFirst();
		});
		expect(screen.getByTestId("focused-index")).toHaveTextContent("-1");
	});
});
