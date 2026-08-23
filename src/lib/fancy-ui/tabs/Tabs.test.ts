import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { DURATIONS } from "../_internals/motion/tokens.js";
import Tabs from "./Tabs.svelte";
import TabsTrigger from "./TabsTrigger.svelte";
import TabsContent from "./TabsContent.svelte";
import Harness from "./TabsHarness.test.svelte";

interface Item {
	value: string;
	label: string;
	disabled?: boolean;
}

const ITEMS: Item[] = [
	{ value: "account", label: "Account" },
	{ value: "security", label: "Security" },
	{ value: "billing", label: "Billing" },
];

function tablist(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="tablist"]') as HTMLElement;
}

function tabs(container: HTMLElement): HTMLButtonElement[] {
	return Array.from(container.querySelectorAll('[role="tab"]'));
}

function panels(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll('[role="tabpanel"]'));
}

function byLabel(container: HTMLElement, label: string): HTMLButtonElement {
	return tabs(container).find((b) => b.textContent === label) as HTMLButtonElement;
}

function tabbable(container: HTMLElement): HTMLButtonElement | undefined {
	return tabs(container).find((b) => b.getAttribute("tabindex") === "0");
}

function indicator(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-tabs-indicator") as HTMLElement;
}

/** Mirrors `TabsList`'s own backstop: the transition's token plus a slack
 * margin. Imported rather than hardcoded so the two cannot drift apart. */
const WILL_CHANGE_RELEASE = DURATIONS.fast + 50;

const GEOMETRY_PROPS = ["offsetLeft", "offsetTop", "offsetWidth", "offsetHeight"] as const;

interface GeometryOptions {
	/** Every trigger's size across the rail — its height in a horizontal
	 * tablist, its width in a vertical one. */
	thickness?: number;
	/** Stack the triggers down the rail instead of across it. */
	vertical?: boolean;
}

/**
 * jsdom lays nothing out, so every `offset*` reads 0 and the indicator's
 * arithmetic has nothing to chew on. Installs geometry the same way this
 * suite's neighbours install an observer — a configurable prototype getter,
 * restored by the function returned here, never left behind for the next
 * test file in the same worker.
 *
 * `sizes` is keyed by each trigger's `value` and measures along the rail's
 * own axis; every trigger's offset is the sum of the ones before it in DOM
 * order, which is what a flex row (or column) with no gap actually produces.
 * Only elements carrying `data-ft-tabs-trigger` get a size — the indicator
 * and the list itself keep jsdom's zeroes.
 */
function stubGeometry(
	sizes: Record<string, number>,
	{ thickness = 32, vertical = false }: GeometryOptions = {}
): () => void {
	const originals = GEOMETRY_PROPS.map((prop) =>
		Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop)
	);

	const isTrigger = (el: HTMLElement) => el.hasAttribute("data-ft-tabs-trigger");
	const sizeOf = (el: HTMLElement) => sizes[el.dataset.value ?? ""] ?? 0;

	function offsetAlongRail(el: HTMLElement): number {
		const siblings = Array.from(
			el.parentElement?.querySelectorAll<HTMLElement>("[data-ft-tabs-trigger]") ?? []
		);
		const index = siblings.indexOf(el);
		if (index === -1) return 0;
		return siblings.slice(0, index).reduce((sum, prev) => sum + sizeOf(prev), 0);
	}

	function define(prop: (typeof GEOMETRY_PROPS)[number], read: (el: HTMLElement) => number) {
		Object.defineProperty(HTMLElement.prototype, prop, {
			configurable: true,
			get(this: HTMLElement) {
				return isTrigger(this) ? read(this) : 0;
			},
		});
	}

	define("offsetWidth", (el) => (vertical ? thickness : sizeOf(el)));
	define("offsetHeight", (el) => (vertical ? sizeOf(el) : thickness));
	define("offsetLeft", (el) => (vertical ? 0 : offsetAlongRail(el)));
	define("offsetTop", (el) => (vertical ? offsetAlongRail(el) : 0));

	return () => {
		GEOMETRY_PROPS.forEach((prop, index) => {
			const original = originals[index];
			if (original) Object.defineProperty(HTMLElement.prototype, prop, original);
		});
	};
}

/** Replaces `window.matchMedia` wholesale. `prefersReducedMotion()` resolves
 * it fresh on every call, so an override installed before the selection moves
 * is the one the placement effect sees. */
function stubReducedMotion(matches: boolean): void {
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

describe("Tabs", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	// Regression guard for the same reactivity loop ToggleGroup already paid
	// for: register/unregister run inside each trigger's own `$effect`, and
	// registration is fully synchronous, so the roving-focus registry has to
	// be correct the instant `render()` returns, with no extra `tick()`.
	it("settles registration in one pass on mount, including with a disabled item in the mix", async () => {
		const items: Item[] = [
			{ value: "a", label: "A" },
			{ value: "b", label: "B", disabled: true },
			{ value: "c", label: "C" },
		];
		const { container } = render(Harness, { props: { items } });

		const zeroed = tabs(container).filter((b) => b.getAttribute("tabindex") === "0");
		expect(zeroed).toHaveLength(1);
		expect(zeroed[0].textContent).toBe("A");

		await fireEvent.keyDown(byLabel(container, "A"), { key: "ArrowRight" });
		await tick();
		expect(document.activeElement).toBe(byLabel(container, "C"));
	});

	it("renders a tablist with tabs carrying role and aria-selected", () => {
		const { container } = render(Harness, { props: { items: ITEMS, value: "account" } });
		expect(tablist(container)).toBeTruthy();
		expect(tabs(container)).toHaveLength(3);
		for (const tab of tabs(container)) {
			expect(tab.getAttribute("type")).toBe("button");
			expect(tab.hasAttribute("aria-selected")).toBe(true);
		}
		expect(byLabel(container, "Account").getAttribute("aria-selected")).toBe("true");
		expect(byLabel(container, "Security").getAttribute("aria-selected")).toBe("false");
	});

	it("wires aria-controls on the tab to the same id the panel renders", () => {
		const { container } = render(Harness, { props: { items: ITEMS, value: "account" } });
		const trigger = byLabel(container, "Account");
		const panel = panels(container)[0];

		expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
		expect(panel.getAttribute("aria-labelledby")).toBe(trigger.id);
	});

	it("gives exactly one tab tabindex 0, defaulting to the first", () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const zeroed = tabs(container).filter((b) => b.getAttribute("tabindex") === "0");
		const negative = tabs(container).filter((b) => b.getAttribute("tabindex") === "-1");

		expect(zeroed).toHaveLength(1);
		expect(zeroed[0].textContent).toBe("Account");
		expect(negative).toHaveLength(2);
	});

	it("defaults the roving position to the already-selected tab", () => {
		const { container } = render(Harness, { props: { items: ITEMS, value: "security" } });
		expect(tabbable(container)?.textContent).toBe("Security");
	});

	it("shows only the active panel by default, unmounting the others entirely", () => {
		const { container } = render(Harness, { props: { items: ITEMS, value: "account" } });
		const rendered = panels(container);

		expect(rendered).toHaveLength(1);
		expect(rendered[0].textContent).toBe("Panel Account");
	});

	it("keeps every panel mounted and hidden, not just the active one, with forceMount", () => {
		const { container } = render(Harness, {
			props: { items: ITEMS, value: "account", forceMount: true },
		});
		const rendered = panels(container);

		expect(rendered).toHaveLength(3);
		const active = rendered.find((p) => p.textContent === "Panel Account") as HTMLElement;
		const inactive = rendered.find((p) => p.textContent === "Panel Security") as HTMLElement;
		expect(active.hasAttribute("hidden")).toBe(false);
		expect(inactive.hasAttribute("hidden")).toBe(true);
	});

	it("makes the active panel focusable so Tab from the tablist lands in content", () => {
		const { container } = render(Harness, { props: { items: ITEMS, value: "account" } });
		expect(panels(container)[0].getAttribute("tabindex")).toBe("0");
	});

	// The panel entrance is `in:` only, deliberately: an outgoing panel has
	// nowhere to be stacked (these are siblings the caller places by hand), so
	// it cuts away exactly as it always did while the arriving one fades in.
	// That is also why not one assertion above had to learn to wait — `in:`
	// never delays an unmount.
	describe("panel entrance", () => {
		it("fades the arriving panel in, and leaves the first render alone", async () => {
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			try {
				const { container } = render(Harness, { props: { items: ITEMS, value: "account" } });
				await tick();
				// A panel that starts selected simply appears: a local `in:`
				// runs only once the block that owns it has already run.
				expect(animateSpy).not.toHaveBeenCalled();

				// A raw click, then ONE tick: `fireEvent` awaits a tick of its
				// own, which is enough for the stubbed Web Animations API to
				// resolve and for the assertion below to miss the window.
				byLabel(container, "Security").click();
				await tick();

				const arrived = panels(container);
				// The panel being left is gone in the same tick, not lingering
				// behind the new one for the length of the fade.
				expect(arrived).toHaveLength(1);
				expect(arrived[0].textContent).toBe("Panel Security");
				expect(animateSpy.mock.contexts).toContain(arrived[0]);
			} finally {
				animateSpy.mockRestore();
			}
		});

		it("reduced motion: the arriving panel is swapped in without animating at all", async () => {
			stubReducedMotion(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			try {
				const { container } = render(Harness, { props: { items: ITEMS, value: "account" } });
				await tick();

				byLabel(container, "Security").click();
				await tick();

				expect(panels(container)[0].textContent).toBe("Panel Security");
				// `duration: 0` makes Svelte call its own finish callback
				// synchronously and never touch `element.animate()`.
				expect(animateSpy).not.toHaveBeenCalled();
			} finally {
				animateSpy.mockRestore();
			}
		});
	});

	it("selects on click and moves both the roving tabindex and DOM focus there", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Harness, {
			props: { items: ITEMS, value: "account", onValueChange },
		});
		const security = byLabel(container, "Security");

		await fireEvent.click(security);

		expect(security.getAttribute("aria-selected")).toBe("true");
		expect(onValueChange).toHaveBeenLastCalledWith("security");
		expect(document.activeElement).toBe(security);
		expect(security.getAttribute("tabindex")).toBe("0");
		expect(byLabel(container, "Account").getAttribute("tabindex")).toBe("-1");
	});

	describe("automatic activation (default)", () => {
		it("selects the tab the arrow keys land on, without a separate Enter/Space", async () => {
			const onValueChange = vi.fn();
			const { container } = render(Harness, {
				props: { items: ITEMS, value: "account", onValueChange },
			});

			await fireEvent.keyDown(byLabel(container, "Account"), { key: "ArrowRight" });
			await tick();

			expect(document.activeElement).toBe(byLabel(container, "Security"));
			expect(byLabel(container, "Security").getAttribute("aria-selected")).toBe("true");
			expect(onValueChange).toHaveBeenLastCalledWith("security");
		});

		it("selects on Home/End too, not only single-step arrows", async () => {
			const { container } = render(Harness, { props: { items: ITEMS, value: "account" } });

			await fireEvent.keyDown(byLabel(container, "Account"), { key: "End" });
			await tick();

			expect(byLabel(container, "Billing").getAttribute("aria-selected")).toBe("true");
			expect(panels(container)[0].textContent).toBe("Panel Billing");
		});
	});

	describe("manual activation", () => {
		it("only moves focus on arrow keys, leaving the selection untouched", async () => {
			const onValueChange = vi.fn();
			const { container } = render(Harness, {
				props: { items: ITEMS, value: "account", activation: "manual", onValueChange },
			});

			await fireEvent.keyDown(byLabel(container, "Account"), { key: "ArrowRight" });
			await tick();

			expect(document.activeElement).toBe(byLabel(container, "Security"));
			expect(byLabel(container, "Security").getAttribute("aria-selected")).toBe("false");
			expect(byLabel(container, "Account").getAttribute("aria-selected")).toBe("true");
			expect(onValueChange).not.toHaveBeenCalled();
		});

		it("selects the focused tab on Enter, via the native button activation", async () => {
			const onValueChange = vi.fn();
			const { container } = render(Harness, {
				props: { items: ITEMS, value: "account", activation: "manual", onValueChange },
			});
			const security = byLabel(container, "Security");

			await fireEvent.keyDown(byLabel(container, "Account"), { key: "ArrowRight" });
			await tick();
			// jsdom does not synthesise a click from a real Enter keypress on a
			// button the way a browser does, so this drives the same click
			// handler a browser's own Enter activation would fire.
			await fireEvent.click(security);

			expect(security.getAttribute("aria-selected")).toBe("true");
			expect(onValueChange).toHaveBeenLastCalledWith("security");
		});
	});

	it("moves forward with ArrowRight and wraps at the end, horizontal orientation", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const account = byLabel(container, "Account");

		await fireEvent.keyDown(account, { key: "ArrowRight" });
		await tick();
		expect(document.activeElement).toBe(byLabel(container, "Security"));

		await fireEvent.keyDown(byLabel(container, "Security"), { key: "ArrowRight" });
		await tick();
		expect(document.activeElement).toBe(byLabel(container, "Billing"));

		await fireEvent.keyDown(byLabel(container, "Billing"), { key: "ArrowRight" });
		await tick();
		expect(document.activeElement).toBe(account);
	});

	it("ignores ArrowUp/ArrowDown in horizontal orientation", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const account = byLabel(container, "Account");

		await fireEvent.keyDown(account, { key: "ArrowDown" });
		await tick();
		expect(document.activeElement).not.toBe(byLabel(container, "Security"));
	});

	it("moves with ArrowUp/ArrowDown and ignores ArrowLeft/ArrowRight in vertical orientation", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, orientation: "vertical" } });
		const account = byLabel(container, "Account");

		await fireEvent.keyDown(account, { key: "ArrowRight" });
		await tick();
		expect(document.activeElement).not.toBe(byLabel(container, "Security"));

		await fireEvent.keyDown(account, { key: "ArrowDown" });
		await tick();
		expect(document.activeElement).toBe(byLabel(container, "Security"));
	});

	it("sets aria-orientation on the tablist only when vertical", () => {
		const { container: horizontal } = render(Harness, { props: { items: ITEMS } });
		expect(tablist(horizontal).hasAttribute("aria-orientation")).toBe(false);

		const { container: vertical } = render(Harness, {
			props: { items: ITEMS, orientation: "vertical" },
		});
		expect(tablist(vertical).getAttribute("aria-orientation")).toBe("vertical");
	});

	it("jumps to the first and last enabled tab with Home and End", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const security = byLabel(container, "Security");

		await fireEvent.keyDown(security, { key: "End" });
		await tick();
		expect(document.activeElement).toBe(byLabel(container, "Billing"));

		await fireEvent.keyDown(byLabel(container, "Billing"), { key: "Home" });
		await tick();
		expect(document.activeElement).toBe(byLabel(container, "Account"));
	});

	it("skips disabled tabs with the arrows and with Home/End", async () => {
		const items: Item[] = [
			{ value: "account", label: "Account" },
			{ value: "security", label: "Security", disabled: true },
			{ value: "billing", label: "Billing" },
		];
		const { container } = render(Harness, { props: { items } });
		const account = byLabel(container, "Account");

		await fireEvent.keyDown(account, { key: "ArrowRight" });
		await tick();
		expect(document.activeElement).toBe(byLabel(container, "Billing"));

		await fireEvent.keyDown(byLabel(container, "Billing"), { key: "Home" });
		await tick();
		expect(document.activeElement).toBe(account);
	});

	it("never gives a disabled tab tabindex 0, even when it is first in the list", () => {
		const items: Item[] = [
			{ value: "account", label: "Account", disabled: true },
			{ value: "security", label: "Security" },
		];
		const { container } = render(Harness, { props: { items } });

		expect(byLabel(container, "Account").getAttribute("tabindex")).toBe("-1");
		expect(byLabel(container, "Security").getAttribute("tabindex")).toBe("0");
	});

	it("marks a disabled tab with the native disabled attribute and blocks its click", async () => {
		const onValueChange = vi.fn();
		const items: Item[] = [{ value: "a", label: "A", disabled: true }];
		const { container } = render(Harness, { props: { items, onValueChange } });
		const a = byLabel(container, "A");

		expect(a.disabled).toBe(true);
		await fireEvent.click(a);
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("moves DOM focus to the inheriting tab when the focused, selected tab becomes disabled", async () => {
		const { container, rerender } = render(Harness, { props: { items: ITEMS, value: "account" } });
		const account = byLabel(container, "Account");
		account.focus();
		await tick();
		expect(document.activeElement).toBe(account);

		await rerender({
			items: ITEMS.map((item) => (item.value === "account" ? { ...item, disabled: true } : item)),
			value: "account",
		});
		await tick();

		// This is the assertion that catches the bug: the roving tabindex
		// already moved to Security (checked below), but DOM focus dragging
		// along with it is the part a passing handler-was-called assertion
		// would miss entirely.
		expect(document.activeElement).toBe(byLabel(container, "Security"));
		expect(byLabel(container, "Security").getAttribute("tabindex")).toBe("0");

		// Disabling the selected tab changes neither the selection nor the
		// visible panel — only where DOM focus lands.
		expect(account.getAttribute("aria-selected")).toBe("true");
		expect(container.querySelector('[role="tabpanel"]')?.textContent).toBe("Panel Account");
	});

	it("does not yank focus into the tablist when disabling a tab whose roving position is stale", async () => {
		// The roving position (`focusedValueState`) and real DOM focus are two
		// different things: focusing Billing sets the former, but a user is
		// free to tab or click away to something outside the tablist entirely
		// afterwards, leaving the roving position pointing at Billing while
		// DOM focus has moved on. This is the scenario the guard exists for —
		// disabling Account later must not treat Billing's stale roving
		// position as a green light to yank focus back into the tablist.
		const { container, rerender } = render(Harness, { props: { items: ITEMS, value: "account" } });
		const billing = byLabel(container, "Billing");
		billing.focus();
		await tick();

		const elsewhere = document.createElement("input");
		document.body.appendChild(elsewhere);
		elsewhere.focus();
		await tick();
		expect(document.activeElement).toBe(elsewhere);

		await rerender({
			items: ITEMS.map((item) => (item.value === "account" ? { ...item, disabled: true } : item)),
			value: "account",
		});
		await tick();

		// Account never held focus, so disabling it must leave focus exactly
		// where the user actually was — moving it here would be a worse bug
		// than the one this fixes.
		expect(document.activeElement).toBe(elsewhere);

		elsewhere.remove();
	});

	it("stays inert with no crash when every tab is disabled", async () => {
		const items: Item[] = [
			{ value: "a", label: "A", disabled: true },
			{ value: "b", label: "B", disabled: true },
		];
		const { container } = render(Harness, { props: { items } });
		const all = tabs(container);

		expect(all).toHaveLength(2);
		for (const tab of all) {
			expect(tab.disabled).toBe(true);
			expect(tab.getAttribute("tabindex")).toBe("-1");
		}

		await fireEvent.keyDown(all[0], { key: "ArrowRight" });
		await fireEvent.keyDown(all[0], { key: "Home" });
		await tick();
		expect(document.activeElement).toBe(document.body);
	});

	it("sizes the underline variant's triggers per the mockup: 8px/13px, not the segmented pill's box", () => {
		const { container } = render(Harness, { props: { items: ITEMS, value: "account" } });
		const account = byLabel(container, "Account");

		expect(account.className).toContain("py-2");
		expect(account.className).toContain("text-[13px]");
		expect(account.className).not.toContain("py-[6px]");
		expect(account.className).not.toContain("text-[12px]");
	});

	it("sizes the segmented variant's triggers per the mockup: 6px/12px, not the underline tab's box", () => {
		const { container } = render(Harness, {
			props: { items: ITEMS, value: "account", variant: "segmented" },
		});
		const account = byLabel(container, "Account");

		expect(account.className).toContain("py-[6px]");
		expect(account.className).toContain("text-[12px]");
		expect(account.className).not.toContain("py-2");
		expect(account.className).not.toContain("text-[13px]");
	});

	it("reassigns the roving position when the tab holding it unmounts", async () => {
		const { container, rerender } = render(Harness, { props: { items: ITEMS } });
		const security = byLabel(container, "Security");
		await fireEvent.focus(security);
		await tick();
		expect(tabbable(container)).toBe(security);

		await rerender({ items: ITEMS.filter((item) => item.value !== "security") });
		await tick();

		expect(tabbable(container)).toBeTruthy();
		expect(tabbable(container)?.textContent).not.toBe("Security");
	});

	it("round-trips the selection through bind:value", async () => {
		let value = "account";
		const { container } = render(Harness, {
			props: {
				items: ITEMS,
				get value() {
					return value;
				},
				set value(next: string) {
					value = next;
				},
			},
		});

		await fireEvent.click(byLabel(container, "Billing"));
		expect(value).toBe("billing");
	});

	it("merges the class prop with the base classes on the root", () => {
		const { container } = render(Tabs, { props: { class: "mt-4" } });
		const root = container.querySelector(".ft-tabs") as HTMLElement;

		expect(root.className).toContain("ft-tabs");
		expect(root.className).toContain("mt-4");
	});

	it("binds the root element", () => {
		let ref: HTMLDivElement | null = null;
		const { container } = render(Tabs, {
			props: {
				get ref() {
					return ref;
				},
				set ref(value: HTMLDivElement | null) {
					ref = value;
				},
			},
		});

		expect(ref).toBe(container.querySelector(".ft-tabs"));
	});

	it("renders a trigger outside a Tabs root harmlessly, unselected and without a roving tabindex", async () => {
		const { container } = render(TabsTrigger, { props: { value: "solo" } });
		const el = container.querySelector('[role="tab"]') as HTMLButtonElement;

		expect(el.getAttribute("aria-selected")).toBe("false");
		expect(el.hasAttribute("tabindex")).toBe(false);

		await fireEvent.click(el);
		expect(el.getAttribute("aria-selected")).toBe("false");
	});

	it("renders no content for a trigger-less panel outside a Tabs root unless forceMount is set", () => {
		const { container: bare } = render(TabsContent, { props: { value: "solo" } });
		expect(bare.querySelector('[role="tabpanel"]')).toBeFalsy();

		const { container: forced } = render(TabsContent, {
			props: { value: "solo", forceMount: true },
		});
		const panel = forced.querySelector('[role="tabpanel"]');
		expect(panel).toBeTruthy();
		expect(panel?.hasAttribute("hidden")).toBe(true);
	});

	describe("sliding indicator", () => {
		// Every assertion below pins the *exact* inline transform string
		// rather than a substring: the whole point of the indicator is that
		// one transform carries both where the bar is and how long it is, so
		// a partial match would let either half rot silently.

		it("renders one aria-hidden bar carrying the tablist's own variant and orientation", () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, value: "account", variant: "segmented" },
			});
			const bar = indicator(container);

			expect(bar).toBeTruthy();
			expect(container.querySelectorAll(".ft-tabs-indicator")).toHaveLength(1);
			expect(bar.getAttribute("aria-hidden")).toBe("true");
			expect(bar.hasAttribute("role")).toBe(false);
			expect(bar.hasAttribute("tabindex")).toBe(false);
			expect(bar.dataset.variant).toBe(tablist(container).dataset.variant);
			expect(bar.dataset.orientation).toBe(tablist(container).dataset.orientation);
		});

		it("snaps to the selected trigger on first paint, leaving the element transitionable afterwards", () => {
			const restore = stubGeometry({ account: 80, security: 90, billing: 70 });
			try {
				const { container } = render(Harness, { props: { items: ITEMS, value: "account" } });
				const bar = indicator(container);

				expect(bar.style.transform).toBe("translateX(0px) scaleX(80)");
				expect(bar.style.opacity).toBe("1");
				// The suspend/restore ran to completion: had the restore been
				// skipped, `transition: none` would still be sitting here and
				// the bar would never tween again.
				expect(bar.style.transition).toBe("");
				// First paint is a snap, so the compositor was never armed.
				expect(bar.style.willChange).toBe("");
			} finally {
				restore();
			}
		});

		it("slides to the newly selected trigger and hints the compositor for the tween", async () => {
			const restore = stubGeometry({ account: 80, security: 90, billing: 70 });
			try {
				const { container } = render(Harness, { props: { items: ITEMS, value: "account" } });
				const bar = indicator(container);

				await fireEvent.click(byLabel(container, "Security"));
				expect(bar.style.transform).toBe("translateX(80px) scaleX(90)");
				expect(bar.style.willChange).toBe("transform");

				await fireEvent.click(byLabel(container, "Billing"));
				expect(bar.style.transform).toBe("translateX(170px) scaleX(70)");
			} finally {
				restore();
			}
		});

		it("measures the vertical axis, never the horizontal one, in a vertical tablist", async () => {
			const restore = stubGeometry({ account: 30, security: 34, billing: 28 }, { vertical: true });
			try {
				const { container } = render(Harness, {
					props: { items: ITEMS, value: "account", orientation: "vertical" },
				});
				const bar = indicator(container);

				expect(bar.style.transform).toBe("translateY(0px) scaleY(30)");

				await fireEvent.click(byLabel(container, "Security"));
				expect(bar.style.transform).toBe("translateY(30px) scaleY(34)");
				expect(bar.style.transform).not.toContain("translateX");
			} finally {
				restore();
			}
		});

		it("stretches on both axes for the segmented variant and publishes its scale factors", async () => {
			const restore = stubGeometry({ account: 60, security: 40, billing: 70 }, { thickness: 26 });
			try {
				const { container } = render(Harness, {
					props: { items: ITEMS, value: "account", variant: "segmented" },
				});
				const bar = indicator(container);

				await fireEvent.click(byLabel(container, "Security"));

				expect(bar.style.transform).toBe("translate(60px, 0px) scale(40, 26)");
				// These two feed the `calc()` that divides the pill's radius
				// back down, so a stretched 1x1 box still renders a 6px corner.
				expect(bar.style.getPropertyValue("--ft-tabs-indicator-sx")).toBe("40");
				expect(bar.style.getPropertyValue("--ft-tabs-indicator-sy")).toBe("26");
			} finally {
				restore();
			}
		});

		it("snaps rather than slides when the geometry itself changes", async () => {
			const restore = stubGeometry({ account: 60, security: 40, billing: 70 }, { thickness: 26 });
			try {
				const { container, rerender } = render(Harness, {
					props: { items: ITEMS, value: "account" },
				});
				const bar = indicator(container);

				expect(bar.style.transform).toBe("translateX(0px) scaleX(60)");

				await fireEvent.click(byLabel(container, "Security"));
				expect(bar.style.willChange).toBe("transform");

				// Both at once — a new selection *and* a new variant. A variant
				// change on its own already snaps for the duller reason that the
				// selection did not move; this is the case the `geometryChanged`
				// guard alone catches. A different variant is a different
				// geometry, not a journey: the bar stops measuring one axis and
				// starts measuring two, so there is no path between the two
				// transforms worth tweening.
				await rerender({ items: ITEMS, value: "billing", variant: "segmented" });
				expect(bar.style.transform).toBe("translate(100px, 0px) scale(70, 26)");
				expect(bar.style.willChange).toBe("");
				expect(bar.style.transition).toBe("");
			} finally {
				restore();
			}
		});

		it("leaves a slide in flight alone while focus walks to another tab", async () => {
			const restore = stubGeometry({ account: 80, security: 90, billing: 70 });
			try {
				const { container } = render(Harness, {
					props: { items: ITEMS, value: "account", activation: "manual" },
				});
				const bar = indicator(container);

				await fireEvent.click(byLabel(container, "Security"));
				expect(bar.style.willChange).toBe("transform");

				// Manual activation moves focus without moving the selection, and
				// the placement effect watches the roving registry, so it re-runs
				// here. Re-placing the bar would suspend its transition mid-flight
				// and teleport it to the destination it is already travelling to —
				// and, in a browser, force a layout on every arrow keystroke.
				await fireEvent.keyDown(byLabel(container, "Security"), { key: "ArrowRight" });
				await tick();

				expect(document.activeElement).toBe(byLabel(container, "Billing"));
				expect(bar.style.transform).toBe("translateX(80px) scaleX(90)");
				expect(bar.style.willChange).toBe("transform");
			} finally {
				restore();
			}
		});

		it("stays hidden and writes no transform while nothing has a measurable size", () => {
			// No geometry stub at all: this is jsdom's own zero, and it stands
			// in for the real case the guard exists for — a first paint the
			// browser has not laid out yet, or a `display: none` ancestor.
			const { container } = render(Harness, { props: { items: ITEMS, value: "account" } });
			const bar = indicator(container);

			expect(bar.style.opacity).toBe("0");
			expect(bar.style.transform).toBe("");
		});

		it("still tracks the selection under reduced motion, without arming the compositor", async () => {
			stubReducedMotion(true);
			const restore = stubGeometry({ account: 80, security: 90, billing: 70 });
			try {
				const { container } = render(Harness, { props: { items: ITEMS, value: "account" } });
				const bar = indicator(container);

				await fireEvent.click(byLabel(container, "Security"));

				// It tracks: the bar is under the right tab, it just got there
				// without a tween.
				expect(bar.style.transform).toBe("translateX(80px) scaleX(90)");
				expect(bar.style.willChange).toBe("");
				expect(bar.style.transition).toBe("");
			} finally {
				restore();
			}
		});

		it("disconnects the ResizeObserver and clears the will-change timer on unmount", async () => {
			const disconnect = vi.fn();
			// Overrides `test-setup.ts`'s no-op class for this test only, so
			// the teardown can be observed rather than assumed.
			vi.stubGlobal(
				"ResizeObserver",
				class {
					observe() {}
					unobserve() {}
					disconnect = disconnect;
				}
			);
			const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
			const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
			const restore = stubGeometry({ account: 80, security: 90, billing: 70 });
			try {
				const { container, unmount } = render(Harness, {
					props: { items: ITEMS, value: "account" },
				});
				await fireEvent.click(byLabel(container, "Security"));

				expect(indicator(container).style.willChange).toBe("transform");

				// jsdom books 0 ms timers of its own whenever something takes
				// focus (it collapses the selection), so the indicator's
				// release is picked out by the delay it was booked with rather
				// than by counting whatever happens to be pending.
				const booked = setTimeoutSpy.mock.calls.findIndex(
					(call) => call[1] === WILL_CHANGE_RELEASE
				);
				expect(booked).toBeGreaterThanOrEqual(0);
				const handle = setTimeoutSpy.mock.results[booked]?.value;

				unmount();

				expect(disconnect).toHaveBeenCalledTimes(1);
				expect(clearTimeoutSpy).toHaveBeenCalledWith(handle);
			} finally {
				restore();
				setTimeoutSpy.mockRestore();
				clearTimeoutSpy.mockRestore();
			}
		});

		it("hides the bar when nothing is selected, and still tracks a selected trigger that went disabled", async () => {
			const restore = stubGeometry({ account: 80, security: 90, billing: 70 });
			try {
				const { container, rerender } = render(Harness, { props: { items: ITEMS, value: "" } });
				const bar = indicator(container);

				expect(bar.style.opacity).toBe("0");
				expect(bar.style.transform).toBe("");

				// Disabling the selected trigger changes neither the selection
				// nor the visible panel, so the bar must not desert it either —
				// a bar that vanished here would say "nothing is selected",
				// which is not what happened.
				await rerender({ items: ITEMS, value: "security" });
				expect(bar.style.transform).toBe("translateX(80px) scaleX(90)");
				// This is the first *successful* placement, so there is no
				// transform to leave from: it snaps. Were it to tween, it would
				// tween from the identity matrix — a 1x1 box flying in from the
				// list's own origin.
				expect(bar.style.willChange).toBe("");

				await rerender({
					items: ITEMS.map((item) =>
						item.value === "security" ? { ...item, disabled: true } : item
					),
					value: "security",
				});
				expect(bar.style.opacity).toBe("1");
				expect(bar.style.transform).toBe("translateX(80px) scaleX(90)");
			} finally {
				restore();
			}
		});
	});
});
