import { cleanup, fireEvent, render, waitFor } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick, ref, type PropType } from "vue";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import NavigationMenu from "./NavigationMenu.vue";
import NavigationMenuList from "./NavigationMenuList.vue";
import NavigationMenuItem from "./NavigationMenuItem.vue";
import NavigationMenuTrigger from "./NavigationMenuTrigger.vue";
import NavigationMenuContent from "./NavigationMenuContent.vue";
import NavigationMenuLink from "./NavigationMenuLink.vue";

/**
 * Transposed assertion-for-assertion from the source component's suite: same
 * cases, same order, same assertions, every one of them made at the same
 * moment the source makes it. Seven shapes changed and nothing else did:
 *
 * - `tick()` becomes `nextTick()`.
 * - The source's `*.test.svelte` rig collapses into the inline `Harness`
 *   below; `bind:value` becomes `v-model:value` on a local ref.
 * - The bindable `ref` is exposed on the instance, so the ref case mounts and
 *   reads `wrapper.vm.ref` rather than binding a local.
 * - `createRawSnippet` becomes a string slot.
 * - This package's jsdom has no `PointerEvent`; `MouseEvent` carries every
 *   field the handlers read.
 * - A fresh mount needs `settleRovingOrder()` before its `tabindex` is read —
 *   see that helper.
 * - The three "switches immediately" cases read `openPanelLinks()` rather than
 *   `panelLinks()` — see that helper. The assertion stays synchronous; only
 *   the way it names the panel changed.
 *
 * No `inert` shim, deliberately (the internals suite and `Select`'s make the
 * same call). jsdom implements no `inert` IDL property, so a prototype
 * getter/setter reflecting it to the attribute would mean the exit case passes
 * against the shim rather than against what the component writes. The presence
 * clock writes the ATTRIBUTE through `toggleAttribute`, so `hasAttribute`
 * observes production behaviour directly.
 */

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

/**
 * Test-only rig. The behaviour under test spans every piece of the compound at
 * once (root timers, an item's own trigger/content pair, the links inside a
 * panel), so proving it needs real instances wired up the way a consumer
 * actually would. `v-model:value` mirrors the source rig's own `bind:value`
 * forwarding, and the bound value is echoed into a `data-testid` span since
 * `@testing-library/vue`'s `render` gives no direct handle onto component
 * state.
 */
const Harness = defineComponent({
	components: {
		NavigationMenu,
		NavigationMenuList,
		NavigationMenuItem,
		NavigationMenuTrigger,
		NavigationMenuContent,
		NavigationMenuLink,
	},
	props: {
		items: { type: Array as PropType<Item[]>, required: true },
		initialValue: { type: String, default: "" },
		onValueChange: {
			type: Function as PropType<(value: string) => void>,
			default: undefined,
		},
		label: { type: String, default: "Test navigation" },
		openDelay: { type: Number, default: 150 },
		closeDelay: { type: Number, default: 200 },
		/** A plain, non-disclosure link rendered after the items — the mockup's "Pricing". */
		extraLink: { type: Object as PropType<Link>, default: undefined },
	},
	setup(props) {
		const value = ref(props.initialValue);
		return { value };
	},
	template: `
		<NavigationMenu
			v-model:value="value"
			:onValueChange="onValueChange"
			:label="label"
			:openDelay="openDelay"
			:closeDelay="closeDelay"
		>
			<NavigationMenuList>
				<NavigationMenuItem v-for="item in items" :key="item.value" :value="item.value">
					<NavigationMenuTrigger>{{ item.label }}</NavigationMenuTrigger>
					<NavigationMenuContent>
						<NavigationMenuLink
							v-for="link in item.links"
							:key="link.href"
							:href="link.href"
							:title="link.title"
							:description="link.description"
							:current="link.current"
						/>
					</NavigationMenuContent>
				</NavigationMenuItem>
				<li v-if="extraLink"><a :href="extraLink.href">{{ extraLink.title }}</a></li>
			</NavigationMenuList>
		</NavigationMenu>
		<span data-testid="bound-value">{{ value }}</span>
	`,
});

function triggers(container: Element): HTMLButtonElement[] {
	return Array.from(container.querySelectorAll<HTMLButtonElement>("[data-ft-nav-trigger]"));
}

function triggerByLabel(container: Element, label: string): HTMLButtonElement {
	return triggers(container).find((b) => b.textContent?.includes(label)) as HTMLButtonElement;
}

function panel(): HTMLElement | null {
	return document.body.querySelector(".ft-navigation-menu-content");
}

function panelLinks(): HTMLAnchorElement[] {
	return Array.from(panel()?.querySelectorAll("a") ?? []);
}

/**
 * The panel that is OPEN, as opposed to the first one in the body. While one
 * trigger's panel hands over to the next, both are in `document.body` at once
 * — the outgoing one is still playing its exit, carrying `data-state="closing"`
 * — and it is the OUTGOING one that comes first in DOM order, so the source's
 * `panel()` would name it. The source's own suite never needs this because its
 * exit is over by the time control returns; here the three "switch immediately"
 * cases name the open panel instead of awaiting the other one's departure, so
 * their assertion stays SYNCHRONOUS, exactly where the source makes it.
 */
function openPanel(): HTMLElement | null {
	return document.body.querySelector('.ft-navigation-menu-content[data-state="open"]');
}

function openPanelLinks(): HTMLAnchorElement[] {
	return Array.from(openPanel()?.querySelectorAll("a") ?? []);
}

/** This package's jsdom version does not implement `PointerEvent`; `MouseEvent`
 * carries every field these handlers read. */
const PointerEventCtor = typeof PointerEvent !== "undefined" ? PointerEvent : MouseEvent;

function pointerEnter(el: Element) {
	el.dispatchEvent(new PointerEventCtor("pointerenter", { bubbles: true, cancelable: true }));
}

function pointerLeave(el: Element) {
	el.dispatchEvent(new PointerEventCtor("pointerleave", { bubbles: true, cancelable: true }));
}

/** Dispatched SYNCHRONOUSLY, unlike `fireEvent.keyDown`, which awaits a tick of
 * its own: the exit window is a couple of microtasks under the animation stub,
 * so anything awaited between the dismiss and the assertion has already drained
 * it and the test would pass for the wrong reason. */
function pressEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

/**
 * Waits the one microtask the roving tab stop needs after a mount, and only
 * after a mount. Each trigger joins the roving order in `onMounted`, the one
 * Vue phase matching both halves of the source's `$effect` (never runs on the
 * server, first client run lands after the DOM exists); the registry is
 * therefore still empty while the tree first renders, on the server and on the
 * client alike, and the `tabindex` patch that follows lands a microtask later
 * — before paint, but after `render()` has returned. Nothing beyond a fresh
 * mount needs this: every later move of the tab stop is driven by an event
 * these tests already await. (`ToggleGroup`'s suite carries the identical
 * helper for the identical reason.)
 */
async function settleRovingOrder(): Promise<void> {
	await nextTick();
}

function stubReducedMotion() {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: true,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
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

	it("exposes the nav element as ref", () => {
		const wrapper = mount(NavigationMenu, { attachTo: document.body });
		expect(wrapper.vm.ref).toBe(wrapper.element);
		wrapper.unmount();
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

		// Checked against `document.body` as a whole, not just `content` — the
		// claim is that nothing in the portalled subtree carries menu
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
		// `aria-expanded` flips synchronously — nothing a consumer can observe
		// waits for the fade. Only the panel's DOM removal is deferred, so only
		// that assertion waits.
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		await waitFor(() => expect(panel()).toBeNull());
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
		expect(openPanelLinks()[0]?.getAttribute("href")).toBe("/docs");
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
		await waitFor(() => expect(panel()).toBeNull());
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

		await waitFor(() => expect(panel()).toBeNull());
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
		await waitFor(() => expect(panel()).toBeNull());
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
		await waitFor(() => expect(panel()).toBeNull());
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
		// No time advanced at all — a real delay here would leave the old panel
		// showing, or nothing at all, for up to `openDelay`.
		await vi.advanceTimersByTimeAsync(0);
		expect(openPanelLinks()[0]?.getAttribute("href")).toBe("/docs");
		expect(products.getAttribute("aria-expanded")).toBe("false");
	});

	it("opens on Enter and moves focus to the first link in the panel", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const trigger = triggerByLabel(container, "Products");

		await fireEvent.keyDown(trigger, { key: "Enter" });
		await nextTick();

		expect(panel()).not.toBeNull();
		expect(document.activeElement).toBe(panelLinks()[0]);
	});

	it("opens on ArrowDown the same way as Enter", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const trigger = triggerByLabel(container, "Resources");

		await fireEvent.keyDown(trigger, { key: "ArrowDown" });
		await nextTick();

		expect(panel()).not.toBeNull();
		expect(document.activeElement).toBe(panelLinks()[0]);
	});

	it("does not open merely by receiving focus — only Enter/Space/ArrowDown do", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const trigger = triggerByLabel(container, "Products");

		trigger.focus();
		await nextTick();
		await waitFor(() => expect(panel()).toBeNull());

		// Give a delayed, focus-triggered open every chance to fire too — a
		// handler that schedules through the same hover-intent timer instead of
		// opening synchronously would slip past the assertion above.
		await vi.advanceTimersByTimeAsync(1000);
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("closes on Escape and returns focus to the trigger", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const trigger = triggerByLabel(container, "Products");
		await fireEvent.keyDown(trigger, { key: "Enter" });
		await nextTick();
		expect(document.activeElement).not.toBe(trigger);

		pressEscape();
		await nextTick();

		// Deliberately asserted BEFORE the panel is gone, and deliberately
		// unwrapped: the focus return is `NavigationMenu`'s own `close()`, a
		// plain function outside the mount gate, so it lands at the dismiss
		// instant rather than at the end of the fade. Wrapping this in
		// `waitFor` would silently delete that requirement.
		expect(document.activeElement).toBe(trigger);
		await waitFor(() => expect(panel()).toBeNull());
	});

	// The failure this pins down: hover-card-style surfaces that also open on
	// focus reopen themselves the instant Escape returns focus to the trigger,
	// because that programmatic focus() fires a focus event too.
	// NavigationMenuTrigger deliberately has no such handler (see its own
	// comment) — proving the *outcome* here, not just the absence of code, is
	// what catches a regression that adds one back.
	it("does not reopen after Escape just because the pointer is still resting on the trigger", async () => {
		const { container } = render(Harness, {
			props: { items: TWO_ITEMS, openDelay: 300 },
		});
		const trigger = triggerByLabel(container, "Products");

		pointerEnter(trigger);
		await vi.advanceTimersByTimeAsync(300);
		expect(panel()).not.toBeNull();

		pressEscape();
		await nextTick();
		// Unwrapped for the same reason as the test above: the return is eager,
		// not deferred to the end of the exit.
		expect(document.activeElement).toBe(trigger);
		await waitFor(() => expect(panel()).toBeNull());

		// No new pointerenter is dispatched — the pointer never left, so a real
		// one never fires again either. Only a bug would reopen from here.
		await vi.advanceTimersByTimeAsync(1000);
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("gives exactly one trigger tabindex 0, defaulting to the first", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		await settleRovingOrder();
		const zeroed = triggers(container).filter((b) => b.getAttribute("tabindex") === "0");
		const negative = triggers(container).filter((b) => b.getAttribute("tabindex") === "-1");

		expect(zeroed).toHaveLength(1);
		expect(zeroed[0]!.textContent).toContain("Products");
		expect(negative).toHaveLength(1);
	});

	it("moves forward with ArrowRight, wrapping at the end", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		await fireEvent.keyDown(products, { key: "ArrowRight" });
		await nextTick();
		expect(document.activeElement).toBe(resources);
		expect(resources.getAttribute("tabindex")).toBe("0");
		expect(products.getAttribute("tabindex")).toBe("-1");

		await fireEvent.keyDown(resources, { key: "ArrowRight" });
		await nextTick();
		expect(document.activeElement).toBe(products);
	});

	it("moves backward with ArrowLeft, wrapping at the start", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		await fireEvent.keyDown(products, { key: "ArrowLeft" });
		await nextTick();
		expect(document.activeElement).toBe(resources);
	});

	it("jumps to the first and last trigger with Home and End", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		await fireEvent.keyDown(products, { key: "End" });
		await nextTick();
		expect(document.activeElement).toBe(resources);

		await fireEvent.keyDown(resources, { key: "Home" });
		await nextTick();
		expect(document.activeElement).toBe(products);
	});

	it("follows an already-open panel to the next trigger on ArrowRight, immediately", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		const products = triggerByLabel(container, "Products");
		const resources = triggerByLabel(container, "Resources");

		await fireEvent.click(products);
		expect(panelLinks()[0]?.getAttribute("href")).toBe("/components");

		await fireEvent.keyDown(products, { key: "ArrowRight" });
		await nextTick();

		expect(document.activeElement).toBe(resources);
		expect(resources.getAttribute("aria-expanded")).toBe("true");
		expect(openPanelLinks()[0]?.getAttribute("href")).toBe("/docs");
	});

	it("closes a panel that loses focus to somewhere outside it, without stealing focus back", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		// Keyboard-open, not click: focus needs to actually be inside the panel
		// (on its first link) for leaving it to mean anything — a click-open
		// leaves focus on the trigger, outside the panel already.
		await fireEvent.keyDown(triggerByLabel(container, "Products"), { key: "Enter" });
		await nextTick();
		expect(document.activeElement).toBe(panelLinks()[0]);

		const elsewhere = document.createElement("button");
		document.body.appendChild(elsewhere);
		elsewhere.focus();
		await nextTick();

		// Focus lands wherever the browser actually put it — nothing here
		// forces it back onto the trigger the way Escape's `close()` does.
		expect(document.activeElement).toBe(elsewhere);
		await waitFor(() => expect(panel()).toBeNull());
		elsewhere.remove();
	});

	it("does not close when focus moves between two links inside the same panel", async () => {
		const { container } = render(Harness, { props: { items: TWO_ITEMS } });
		await fireEvent.keyDown(triggerByLabel(container, "Products"), { key: "Enter" });
		await nextTick();
		const [, second] = panelLinks();

		second!.focus();
		await nextTick();

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
		const { container } = render(Harness, { props: { items: TWO_ITEMS, initialValue: undefined } });
		await fireEvent.click(triggerByLabel(container, "Products"));
		expect(panel()).not.toBeNull();
	});

	it("round-trips the open value through v-model:value", async () => {
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

	// The entrance itself lives in `internals/motion/anchored.ts` and is tested
	// there. What is component-specific is the plumbing: the panel is anchored
	// to the whole list rather than to one trigger, and the growth origin has
	// to follow the side the positioner actually resolved.
	describe("anchored entrance", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("publishes its resolved placement and grows from the edge nearest the list", async () => {
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Harness, { props: { items: TWO_ITEMS } });

			await fireEvent.click(triggerByLabel(container, "Products"));
			expect(panel()).not.toBeNull();

			// jsdom has no layout engine — every rect reads as zeroes — so
			// `computePosition` never overflows and never flips. That makes the
			// un-flipped case the deterministic one to assert here.
			expect(panel()!.getAttribute("data-side")).toBe("bottom");
			expect(panel()!.getAttribute("data-align")).toBe("start");
			// `bottom` + `start`: the panel's own top-left corner, the one
			// touching the list it drops out of. `data-state="open"` is
			// untouched by any of this.
			expect(panel()!.style.transformOrigin).toBe("left top");
			expect(panel()!.getAttribute("data-state")).toBe("open");

			// The sampler turns the transition's `css(t, u)` into a plain
			// `Keyframe[]` and hands it straight to `element.animate()`, so the
			// spy's own arguments say exactly what moves. Two things this pins:
			// the rise starts at the shared `0.92` floor, and the four pixels of
			// `translateY` this panel used to slide are gone for good. It is
			// also the positive control for the reduced-motion case below.
			expect(animateSpy).toHaveBeenCalled();
			const keyframes = animateSpy.mock.calls.at(-1)![0] as Keyframe[];
			expect(keyframes[0]).toEqual({ opacity: "0", transform: "scale(0.92)" });
			expect(keyframes.at(-1)).toEqual({ opacity: "1", transform: "scale(1)" });
			expect(keyframes.some((frame) => String(frame.transform).includes("translate"))).toBe(false);
		});

		it("runs no animation at all under reduced motion, and the panel is there in the same tick", async () => {
			stubReducedMotion();
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Harness, { props: { items: TWO_ITEMS } });

			await fireEvent.click(triggerByLabel(container, "Products"));
			await nextTick();
			expect(panel()).not.toBeNull();

			// A zero duration makes the sampler skip `element.animate()`
			// outright rather than run a zero-length animation, so no call at
			// all is the honest proof that nothing was scheduled.
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});

	// The exit brings with it a window between the dismiss and the unmount —
	// 150 ms in a browser, a couple of microtasks under the animation stub.
	// These pin what has to be true inside it. Nothing a consumer can observe
	// waits for it: `value` still flips at the dismiss instant, so do the
	// triggers' `aria-expanded`, and so does the focus return, which
	// `NavigationMenu`'s own `close()` does from a plain function outside the
	// mount gate.
	describe("animated exit", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(Harness, { props: { items: TWO_ITEMS } });
			await fireEvent.click(triggerByLabel(container, "Products"));
			expect(panel()!.getAttribute("data-state")).toBe("open");

			pressEscape();
			await nextTick();

			const closing = panel();
			expect(closing).toBeTruthy();
			// An ordinary binding here, carrying the surface vocabulary's TWO
			// values: a presence-mounted subtree stays reactive for the whole
			// exit, so nothing has to be written imperatively.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// Written by the presence clock, as an attribute, for the whole
			// exit — a panel on its way out must not still be handing out
			// clickable links.
			expect(closing!.hasAttribute("inert")).toBe(true);

			await waitFor(() => expect(panel()).toBeNull());
		});

		it("swallows a second Escape during the exit — onValueChange fires exactly once", async () => {
			const onValueChange = vi.fn();
			const { container } = render(Harness, { props: { items: TWO_ITEMS, onValueChange } });
			await fireEvent.click(triggerByLabel(container, "Products"));
			onValueChange.mockClear();

			pressEscape();
			await nextTick();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape();
			pressEscape();
			await nextTick();

				expect(onValueChange).toHaveBeenCalledTimes(1);
			expect(onValueChange).toHaveBeenCalledWith("");
		});

		it("removes the panel in the same tick again under reduced motion", async () => {
			stubReducedMotion();
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Harness, { props: { items: TWO_ITEMS } });

			await fireEvent.click(triggerByLabel(container, "Products"));
			await nextTick();
			expect(panel()).not.toBeNull();

			pressEscape();
			await nextTick();

			// A zero duration makes the sampler call the transition's
			// `onFinish` synchronously and never touch `element.animate()`, so
			// the close is exactly as instant as it was before this panel
			// animated out at all — no `waitFor` needed, and none allowed here.
			expect(panel()).toBeNull();
			expect(animateSpy).not.toHaveBeenCalled();
		});
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

	it("renders a slot override instead of title/description when given", () => {
		const { container } = render(NavigationMenuLink, {
			props: { href: "/x", title: "Ignored", description: "Ignored too" },
			slots: { default: '<span data-testid="custom">Custom row</span>' },
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
