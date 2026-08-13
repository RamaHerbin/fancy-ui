import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import NavigationMenu from "./NavigationMenu.svelte";
import NavigationMenuLink from "./NavigationMenuLink.svelte";
import Harness from "./NavigationMenuHarness.test.svelte";

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

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
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

function pointerEnter(el: Element) {
	el.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, cancelable: true }));
}

function pointerLeave(el: Element) {
	el.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, cancelable: true }));
}

function pressEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

describe("NavigationMenu", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
		vi.useRealTimers();
	});

	it("defaults the nav's accessible name to Main", () => {
		const { container } = render(NavigationMenu);
		expect(container.querySelector("nav")?.getAttribute("aria-label")).toBe("Main");
	});

	it("uses the given label as the nav's accessible name", () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS, label: "Site" } });
		expect(container.querySelector("nav")?.getAttribute("aria-label")).toBe("Site");
	});

	it("merges the class prop with the base classes on the nav", () => {
		const { container } = render(NavigationMenu, { props: { class: "mt-4" } });
		const nav = container.querySelector("nav");
		expect(nav?.className).toContain("ft-navigation-menu");
		expect(nav?.className).toContain("mt-4");
	});

	it("binds the nav element", () => {
		let ref: HTMLElement | null = null;
		const { container } = render(NavigationMenu, {
			props: {
				get ref() {
					return ref;
				},
				set ref(value: HTMLElement | null) {
					ref = value;
				},
			},
		});
		expect(ref).toBe(container.querySelector("nav"));
	});

	it("renders items as a <ul> of <li>, each holding a real button — never role=menu, closed", () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });

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
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		await fireEvent.click(triggerByLabel(container, "Products"));
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
	});

	it("starts every trigger collapsed, with no aria-controls until the panel exists", () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		for (const button of triggers(container)) {
			expect(button.getAttribute("aria-expanded")).toBe("false");
			expect(button.hasAttribute("aria-controls")).toBe(false);
		}
		expect(panel()).toBeNull();
	});

	it("opens on click, wiring aria-expanded/aria-controls to a real panel id", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const trigger = triggerByLabel(container, "Products");

		await fireEvent.click(trigger);

		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		const controls = trigger.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(panel()?.id).toBe(controls);
		expect(panel()?.getAttribute("aria-labelledby")).toBe(trigger.id);
	});

	it("closes on a second click of the same trigger", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const trigger = triggerByLabel(container, "Products");

		await fireEvent.click(trigger);
		expect(panel()).not.toBeNull();

		await fireEvent.click(trigger);
		expect(panel()).toBeNull();
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
	});

	it("switches to a different trigger on click immediately, with no delay", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		await fireEvent.click(products);
		expect(panelLinks()[0]?.getAttribute("href")).toBe("/components");

		await fireEvent.click(resources);
		expect(products.getAttribute("aria-expanded")).toBe("false");
		expect(resources.getAttribute("aria-expanded")).toBe("true");
		expect(panelLinks()[0]?.getAttribute("href")).toBe("/docs");
	});

	it("does not treat a pointerdown on the open trigger itself as an outside click", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const trigger = triggerByLabel(container, "Products");
		await fireEvent.click(trigger);
		expect(panel()).not.toBeNull();

		await fireEvent.pointerDown(trigger);
		expect(panel()).not.toBeNull();
	});

	it("closes on a pointerdown outside the trigger and the panel", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		await fireEvent.click(triggerByLabel(container, "Products"));
		expect(panel()).not.toBeNull();

		await fireEvent.pointerDown(document.body);
		expect(panel()).toBeNull();
	});

	it("opens after openDelay on pointerenter, not a moment before", async () => {
		const { container } = render(Harness, {
			props: { items: TWO_ITEMS, openDelay: 300 },
		});
		const trigger = triggerByLabel(container, "Products");

		pointerEnter(trigger);
		await vi.advanceTimersByTimeAsync(299);
		expect(panel()).toBeNull();

		await vi.advanceTimersByTimeAsync(1);
		expect(panel()).not.toBeNull();
	});

	it("cancels the scheduled open if the pointer leaves before openDelay elapses", async () => {
		const { container } = render(Harness, {
			props: { items: TWO_ITEMS, openDelay: 300 },
		});
		const trigger = triggerByLabel(container, "Products");

		pointerEnter(trigger);
		await vi.advanceTimersByTimeAsync(150);
		pointerLeave(trigger);
		await vi.advanceTimersByTimeAsync(1000);

		expect(panel()).toBeNull();
	});

	it("closes after closeDelay once the pointer leaves the trigger without reaching the panel", async () => {
		const { container } = render(Harness, {
			props: { items: TWO_ITEMS, closeDelay: 150 },
		});
		const trigger = triggerByLabel(container, "Products");
		await fireEvent.click(trigger);
		expect(panel()).not.toBeNull();

		pointerLeave(trigger);
		await vi.advanceTimersByTimeAsync(149);
		expect(panel()).not.toBeNull();

		await vi.advanceTimersByTimeAsync(1);
		expect(panel()).toBeNull();
	});

	it("stays open when the pointer travels from the trigger into the panel before closeDelay elapses", async () => {
		const { container } = render(Harness, {
			props: { items: TWO_ITEMS, closeDelay: 150 },
		});
		const trigger = triggerByLabel(container, "Products");
		await fireEvent.click(trigger);

		pointerLeave(trigger);
		await vi.advanceTimersByTimeAsync(100);
		pointerEnter(panel()!);
		await vi.advanceTimersByTimeAsync(1000);

		expect(panel()).not.toBeNull();
	});

	it("closes after closeDelay once the pointer leaves the panel behind it", async () => {
		const { container } = render(Harness, {
			props: { items: TWO_ITEMS, closeDelay: 150 },
		});
		const trigger = triggerByLabel(container, "Products");
		await fireEvent.click(trigger);

		pointerLeave(trigger);
		await vi.advanceTimersByTimeAsync(100);
		pointerEnter(panel()!);
		pointerLeave(panel()!);
		await vi.advanceTimersByTimeAsync(149);
		expect(panel()).not.toBeNull();

		await vi.advanceTimersByTimeAsync(1);
		expect(panel()).toBeNull();
	});

	it("switches to a different trigger on hover immediately, with no re-delay, once something is already open", async () => {
		const { container } = render(Harness, {
			props: { items: TWO_ITEMS, openDelay: 300 },
		});
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		pointerEnter(products);
		await vi.advanceTimersByTimeAsync(300);
		expect(panelLinks()[0]?.getAttribute("href")).toBe("/components");

		pointerEnter(resources);
		// No time advanced at all — a real delay here would leave the old
		// panel showing, or nothing at all, for up to `openDelay`.
		await vi.advanceTimersByTimeAsync(0);
		expect(panelLinks()[0]?.getAttribute("href")).toBe("/docs");
		expect(products.getAttribute("aria-expanded")).toBe("false");
	});

	it("opens on Enter and moves focus to the first link in the panel", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const trigger = triggerByLabel(container, "Products");

		await fireEvent.keyDown(trigger, { key: "Enter" });
		await tick();

		expect(panel()).not.toBeNull();
		expect(document.activeElement).toBe(panelLinks()[0]);
	});

	it("opens on ArrowDown the same way as Enter", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const trigger = triggerByLabel(container, "Resources");

		await fireEvent.keyDown(trigger, { key: "ArrowDown" });
		await tick();

		expect(panel()).not.toBeNull();
		expect(document.activeElement).toBe(panelLinks()[0]);
	});

	it("does not open merely by receiving focus — only Enter/Space/ArrowDown do", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const trigger = triggerByLabel(container, "Products");

		trigger.focus();
		await tick();
		expect(panel()).toBeNull();

		// Give a delayed, focus-triggered open every chance to fire too — a
		// handler that schedules through the same hover-intent timer instead
		// of opening synchronously would slip past the assertion above.
		await vi.advanceTimersByTimeAsync(1000);
		expect(panel()).toBeNull();
	});

	it("closes on Escape and returns focus to the trigger", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const trigger = triggerByLabel(container, "Products");
		await fireEvent.keyDown(trigger, { key: "Enter" });
		await tick();
		expect(document.activeElement).not.toBe(trigger);

		pressEscape();
		await tick();

		expect(panel()).toBeNull();
		expect(document.activeElement).toBe(trigger);
	});

	// The failure this pins down: HoverCard-style surfaces that also open on
	// `focusin` reopen themselves the instant Escape returns focus to the
	// trigger, because that programmatic focus() fires a focus event too.
	// NavigationMenuTrigger deliberately has no such handler (see its own
	// comment) — proving the *outcome* here, not just the absence of code,
	// is what catches a regression that adds one back.
	it("does not reopen after Escape just because the pointer is still resting on the trigger", async () => {
		const { container } = render(Harness, {
			props: { items: TWO_ITEMS, openDelay: 300 },
		});
		const trigger = triggerByLabel(container, "Products");

		pointerEnter(trigger);
		await vi.advanceTimersByTimeAsync(300);
		expect(panel()).not.toBeNull();

		pressEscape();
		await tick();
		expect(panel()).toBeNull();
		expect(document.activeElement).toBe(trigger);

		// No new pointerenter is dispatched — the pointer never left, so a
		// real one never fires again either. Only a bug would reopen from here.
		await vi.advanceTimersByTimeAsync(1000);
		expect(panel()).toBeNull();
	});

	it("gives exactly one trigger tabindex 0, defaulting to the first", () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const zeroed = triggers(container).filter((b) => b.getAttribute("tabindex") === "0");
		const negative = triggers(container).filter((b) => b.getAttribute("tabindex") === "-1");

		expect(zeroed).toHaveLength(1);
		expect(zeroed[0].textContent).toContain("Products");
		expect(negative).toHaveLength(1);
	});

	it("moves forward with ArrowRight, wrapping at the end", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		await fireEvent.keyDown(products, { key: "ArrowRight" });
		await tick();
		expect(document.activeElement).toBe(resources);
		expect(resources.getAttribute("tabindex")).toBe("0");
		expect(products.getAttribute("tabindex")).toBe("-1");

		await fireEvent.keyDown(resources, { key: "ArrowRight" });
		await tick();
		expect(document.activeElement).toBe(products);
	});

	it("moves backward with ArrowLeft, wrapping at the start", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		await fireEvent.keyDown(products, { key: "ArrowLeft" });
		await tick();
		expect(document.activeElement).toBe(resources);
	});

	it("jumps to the first and last trigger with Home and End", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		await fireEvent.keyDown(products, { key: "End" });
		await tick();
		expect(document.activeElement).toBe(resources);

		await fireEvent.keyDown(resources, { key: "Home" });
		await tick();
		expect(document.activeElement).toBe(products);
	});

	it("follows an already-open panel to the next trigger on ArrowRight, immediately", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		await fireEvent.click(products);
		expect(panelLinks()[0]?.getAttribute("href")).toBe("/components");

		await fireEvent.keyDown(products, { key: "ArrowRight" });
		await tick();

		expect(document.activeElement).toBe(resources);
		expect(resources.getAttribute("aria-expanded")).toBe("true");
		expect(panelLinks()[0]?.getAttribute("href")).toBe("/docs");
	});

	it("closes a panel that loses focus to somewhere outside it, without stealing focus back", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		// Keyboard-open, not click: focus needs to actually be inside the panel
		// (on its first link) for leaving it to mean anything — a click-open
		// leaves focus on the trigger, outside the panel already.
		await fireEvent.keyDown(triggerByLabel(container, "Products"), { key: "Enter" });
		await tick();
		expect(document.activeElement).toBe(panelLinks()[0]);

		const elsewhere = document.createElement("button");
		document.body.appendChild(elsewhere);
		elsewhere.focus();
		await tick();

		expect(panel()).toBeNull();
		// Focus lands wherever the browser actually put it — nothing here
		// forces it back onto the trigger the way Escape's `close()` does.
		expect(document.activeElement).toBe(elsewhere);
		elsewhere.remove();
	});

	it("does not close when focus moves between two links inside the same panel", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		await fireEvent.keyDown(triggerByLabel(container, "Products"), { key: "Enter" });
		await tick();
		const [, second] = panelLinks();

		second.focus();
		await tick();

		expect(panel()).not.toBeNull();
		expect(document.activeElement).toBe(second);
	});

	it("clears a pending open timer on destroy so it never fires after unmount", async () => {
		const onValueChange = vi.fn();
		const { container, unmount } = render(Harness, {
			props: { items: TWO_ITEMS, onValueChange, openDelay: 300 },
		});
		pointerEnter(triggerByLabel(container, "Products"));

		expect(() => unmount()).not.toThrow();
		await vi.advanceTimersByTimeAsync(1000);

		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("clears a pending close timer on destroy so it never fires after unmount", async () => {
		const onValueChange = vi.fn();
		const { container, unmount } = render(Harness, {
			props: { items: TWO_ITEMS, onValueChange, closeDelay: 300 },
		});
		await fireEvent.click(triggerByLabel(container, "Products"));
		onValueChange.mockClear();
		pointerLeave(triggerByLabel(container, "Products"));

		expect(() => unmount()).not.toThrow();
		await vi.advanceTimersByTimeAsync(1000);

		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("works uncontrolled, with neither value nor onValueChange passed in", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS, value: undefined } });
		await fireEvent.click(triggerByLabel(container, "Products"));
		expect(panel()).not.toBeNull();
	});

	it("round-trips the open value through bind:value", async () => {
		const { container, getByTestId } = render(Harness, { props: { items: TWO_ITEMS } });
		expect(getByTestId("bound-value").textContent).toBe("");

		await fireEvent.click(triggerByLabel(container, "Products"));
		expect(getByTestId("bound-value").textContent).toBe("products");

		await fireEvent.click(triggerByLabel(container, "Products"));
		expect(getByTestId("bound-value").textContent).toBe("");
	});

	it("lets a plain link live in the list alongside the disclosure items", () => {
		const { container } = render(Harness, {
			props: { items: TWO_ITEMS, extraLink: { href: "/pricing", title: "Pricing" } },
		});
		const link = Array.from(container.querySelectorAll("a")).find(
			(a) => a.textContent === "Pricing"
		);
		expect(link?.getAttribute("href")).toBe("/pricing");
	});
});

describe("NavigationMenuLink", () => {
	afterEach(cleanup);

	it("renders the title and description by default", () => {
		const { container } = render(NavigationMenuLink, {
			props: { href: "/x", title: "Themes", description: "Generate palettes" },
		});
		expect(container.textContent).toContain("Themes");
		expect(container.textContent).toContain("Generate palettes");
	});

	it("marks the current page with aria-current, and leaves it off otherwise", () => {
		const { container: current } = render(NavigationMenuLink, {
			props: { href: "/x", title: "X", current: true },
		});
		expect(current.querySelector("a")?.getAttribute("aria-current")).toBe("page");

		const { container: notCurrent } = render(NavigationMenuLink, {
			props: { href: "/x", title: "X", current: false },
		});
		expect(notCurrent.querySelector("a")?.hasAttribute("aria-current")).toBe(false);
	});

	it("opens external links in a new tab with a safe rel, and an sr-only note", () => {
		const { container } = render(NavigationMenuLink, {
			props: { href: "https://example.com", title: "Example", external: true },
		});
		const a = container.querySelector("a");
		expect(a?.getAttribute("target")).toBe("_blank");
		expect(a?.getAttribute("rel")).toBe("noopener noreferrer");
		expect(container.textContent).toContain("(opens in a new tab)");
	});

	it("leaves target/rel unset and skips the note for a normal link", () => {
		const { container } = render(NavigationMenuLink, {
			props: { href: "/x", title: "X", external: false },
		});
		const a = container.querySelector("a");
		expect(a?.hasAttribute("target")).toBe(false);
		expect(a?.hasAttribute("rel")).toBe(false);
		expect(container.textContent).not.toContain("opens in a new tab");
	});

	it("renders a children override instead of title/description when given", () => {
		const { container } = render(NavigationMenuLink, {
			props: {
				href: "/x",
				title: "Ignored",
				description: "Ignored too",
				children: snippet('<span data-testid="custom">Custom row</span>'),
			},
		});
		expect(container.querySelector('[data-testid="custom"]')).toBeTruthy();
		expect(container.textContent).not.toContain("Ignored");
	});

	it("merges the class prop onto the anchor", () => {
		const { container } = render(NavigationMenuLink, {
			props: { href: "/x", title: "X", class: "ft-navigation-menu-feature" },
		});
		expect(container.querySelector("a")?.className).toContain("ft-navigation-menu-feature");
	});
});
