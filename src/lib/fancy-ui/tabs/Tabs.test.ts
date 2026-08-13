import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
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

describe("Tabs", () => {
	afterEach(cleanup);

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
});
