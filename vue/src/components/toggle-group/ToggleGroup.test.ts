import { render, cleanup, fireEvent } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { defineComponent, nextTick, ref, type PropType } from "vue";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import ToggleGroup from "./ToggleGroup.vue";
import ToggleGroupItem from "./ToggleGroupItem.vue";
import { sound } from "../../sound/sound.js";

interface Item {
	value: string;
	label: string;
	disabled?: boolean;
}

const ITEMS: Item[] = [
	{ value: "left", label: "Left" },
	{ value: "center", label: "Center" },
	{ value: "right", label: "Right" },
];

function group(container: Element): HTMLElement {
	return container.querySelector('[role="group"]') as HTMLElement;
}

function buttons(container: Element): HTMLButtonElement[] {
	return Array.from(container.querySelectorAll("button"));
}

function byLabel(container: Element, label: string): HTMLButtonElement {
	return buttons(container).find((b) => b.textContent === label) as HTMLButtonElement;
}

function tabbable(container: Element): HTMLButtonElement | undefined {
	return buttons(container).find((b) => b.getAttribute("tabindex") === "0");
}

/**
 * Waits the one microtask the roving tab stop needs after a mount, and only
 * after a mount — see the divergence note in README.md. Each item joins the
 * roving order in `onMounted`, which is the only Vue phase that matches both
 * halves of Svelte's `$effect` (never runs on the server, first client run
 * lands after the DOM exists); the registry is therefore still empty while
 * the tree first renders, on the server and on the client alike, and the
 * `tabindex` patch that follows lands a microtask later — before paint, but
 * after `render()` has returned. Nothing beyond a fresh mount needs this:
 * every later move of the tab stop is driven by an event these tests already
 * await.
 */
async function settleRovingOrder(): Promise<void> {
	await nextTick();
}

/**
 * Test-only rig. The keyboard model lives across ToggleGroup and
 * ToggleGroupItem together, so proving it needs real instances of both,
 * wired up the way a consumer actually would — a raw markup string carries
 * no context and no event handlers. `v-model:value` mirrors the Svelte
 * harness's own `bind:value` forwarding a bindable prop through to the
 * child; the bound value is also mirrored into a `data-testid` span since
 * `@testing-library/vue`'s `render` gives no direct handle onto component
 * state (the `Toggle` harness in this package uses the same trick).
 */
const Harness = defineComponent({
	components: { ToggleGroup, ToggleGroupItem },
	props: {
		items: { type: Array as PropType<Item[]>, required: true },
		type: { type: String as PropType<"single" | "multiple">, default: "single" },
		initialValue: { type: [String, Array] as PropType<string | string[]>, default: "" },
		onValueChange: { type: Function as PropType<(value: string | string[]) => void>, default: undefined },
		disabled: { type: Boolean, default: false },
		size: { type: String as PropType<"sm" | "md" | "lg">, default: "md" },
		orientation: { type: String as PropType<"horizontal" | "vertical">, default: "horizontal" },
		label: { type: String, default: "Test group" },
		sound: { type: Boolean, default: false },
	},
	setup(props) {
		const value = ref<string | string[]>(props.initialValue);
		return { value };
	},
	template: `
		<ToggleGroup
			v-model:value="value"
			:type="type"
			:onValueChange="onValueChange"
			:disabled="disabled"
			:size="size"
			:orientation="orientation"
			:label="label"
			:sound="sound"
		>
			<ToggleGroupItem v-for="item in items" :key="item.value" :value="item.value" :disabled="item.disabled">
				{{ item.label }}
			</ToggleGroupItem>
		</ToggleGroup>
		<span data-testid="bound-value">{{ JSON.stringify(value) }}</span>
	`,
});

function boundValue(container: Element): string | string[] {
	const raw = container.querySelector('[data-testid="bound-value"]')?.textContent ?? '""';
	return JSON.parse(raw);
}

describe("ToggleGroup", () => {
	afterEach(cleanup);

	// Regression guard for a reactivity loop the Svelte source once shipped:
	// `register`/`unregister` run inside each item's own effect, and reading
	// the shared registry there — even just the lookup, leaving the mutating
	// call itself untracked — makes that effect depend on the very array its
	// own call mutates, alternating register/unregister forever. Vue's
	// `watch` here is not keyed on `registeredOrder` at all, so the loop
	// cannot recur structurally, but the observable it produced is still
	// worth pinning: registration settles in a bounded number of passes — one
	// `settleRovingOrder()` and no more, never an unbounded alternation.
	it("settles registration in one pass on mount, including with a disabled item in the mix", async () => {
		const items: Item[] = [
			{ value: "a", label: "A" },
			{ value: "b", label: "B", disabled: true },
			{ value: "c", label: "C" },
		];
		const { container } = render(Harness, { props: { items } });
		await settleRovingOrder();

		const zeroed = buttons(container).filter((b) => b.getAttribute("tabindex") === "0");
		expect(zeroed).toHaveLength(1);
		expect(zeroed[0]!.textContent?.trim()).toBe("A");

		await fireEvent.keyDown(byLabel(container, "A"), { key: "ArrowRight" });
		await nextTick();
		expect(document.activeElement).toBe(byLabel(container, "C"));
	});

	it("renders a group with the given accessible name and the items inside it", () => {
		const { container } = render(Harness, { props: { items: ITEMS, label: "Text alignment" } });
		const root = group(container);

		expect(root).toBeTruthy();
		expect(root.getAttribute("aria-label")).toBe("Text alignment");
		expect(buttons(container)).toHaveLength(3);
	});

	it("renders items as real buttons carrying aria-pressed", () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		for (const button of buttons(container)) {
			expect(button.getAttribute("type")).toBe("button");
			expect(button.hasAttribute("aria-pressed")).toBe(true);
		}
	});

	it("gives exactly one item tabindex 0, defaulting to the first", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		await settleRovingOrder();
		const zeroed = buttons(container).filter((b) => b.getAttribute("tabindex") === "0");
		const negative = buttons(container).filter((b) => b.getAttribute("tabindex") === "-1");

		expect(zeroed).toHaveLength(1);
		expect(zeroed[0]!.textContent?.trim()).toBe("Left");
		expect(negative).toHaveLength(2);
	});

	it("defaults the roving position to the already-selected item", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, initialValue: "center" } });
		await settleRovingOrder();
		expect(tabbable(container)?.textContent?.trim()).toBe("Center");
	});

	it("selects on click and deselects the same item on a second click, single type", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Harness, { props: { items: ITEMS, onValueChange } });
		const center = byLabel(container, "Center");

		await fireEvent.click(center);
		expect(center.getAttribute("aria-pressed")).toBe("true");
		expect(onValueChange).toHaveBeenLastCalledWith("center");

		await fireEvent.click(center);
		expect(center.getAttribute("aria-pressed")).toBe("false");
		expect(onValueChange).toHaveBeenLastCalledWith("");
	});

	it("moves the selection to a different item, single type, clearing the previous one", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, initialValue: "left" } });
		expect(byLabel(container, "Left").getAttribute("aria-pressed")).toBe("true");

		await fireEvent.click(byLabel(container, "Right"));
		expect(byLabel(container, "Left").getAttribute("aria-pressed")).toBe("false");
		expect(byLabel(container, "Right").getAttribute("aria-pressed")).toBe("true");
	});

	it("toggles independently and fires onValueChange with an array, multiple type", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Harness, {
			props: { items: ITEMS, type: "multiple", onValueChange },
		});

		await fireEvent.click(byLabel(container, "Left"));
		await fireEvent.click(byLabel(container, "Right"));

		expect(byLabel(container, "Left").getAttribute("aria-pressed")).toBe("true");
		expect(byLabel(container, "Center").getAttribute("aria-pressed")).toBe("false");
		expect(byLabel(container, "Right").getAttribute("aria-pressed")).toBe("true");
		expect(onValueChange).toHaveBeenLastCalledWith(["left", "right"]);

		await fireEvent.click(byLabel(container, "Left"));
		expect(byLabel(container, "Left").getAttribute("aria-pressed")).toBe("false");
		expect(onValueChange).toHaveBeenLastCalledWith(["right"]);
	});

	it("moves forward with ArrowRight and ArrowDown, wrapping at the end", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const left = byLabel(container, "Left");

		await fireEvent.keyDown(left, { key: "ArrowRight" });
		await nextTick();
		expect(document.activeElement).toBe(byLabel(container, "Center"));

		await fireEvent.keyDown(byLabel(container, "Center"), { key: "ArrowDown" });
		await nextTick();
		expect(document.activeElement).toBe(byLabel(container, "Right"));

		await fireEvent.keyDown(byLabel(container, "Right"), { key: "ArrowRight" });
		await nextTick();
		expect(document.activeElement).toBe(left);
	});

	it("moves backward with ArrowLeft and ArrowUp, wrapping at the start", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const left = byLabel(container, "Left");

		await fireEvent.keyDown(left, { key: "ArrowLeft" });
		await nextTick();
		expect(document.activeElement).toBe(byLabel(container, "Right"));

		await fireEvent.keyDown(byLabel(container, "Right"), { key: "ArrowUp" });
		await nextTick();
		expect(document.activeElement).toBe(byLabel(container, "Center"));
	});

	it("keeps both arrow-key pairs working in vertical orientation", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, orientation: "vertical" } });
		const left = byLabel(container, "Left");

		await fireEvent.keyDown(left, { key: "ArrowDown" });
		await nextTick();
		expect(document.activeElement).toBe(byLabel(container, "Center"));

		await fireEvent.keyDown(byLabel(container, "Center"), { key: "ArrowRight" });
		await nextTick();
		expect(document.activeElement).toBe(byLabel(container, "Right"));
	});

	it("jumps to the first and last item with Home and End", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const center = byLabel(container, "Center");

		await fireEvent.keyDown(center, { key: "End" });
		await nextTick();
		expect(document.activeElement).toBe(byLabel(container, "Right"));

		await fireEvent.keyDown(byLabel(container, "Right"), { key: "Home" });
		await nextTick();
		expect(document.activeElement).toBe(byLabel(container, "Left"));
	});

	it("moves the roving tabindex along with DOM focus, not just internal state", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		const left = byLabel(container, "Left");

		await fireEvent.keyDown(left, { key: "ArrowRight" });
		await nextTick();

		expect(document.activeElement).toBe(byLabel(container, "Center"));
		expect(byLabel(container, "Left").getAttribute("tabindex")).toBe("-1");
		expect(byLabel(container, "Center").getAttribute("tabindex")).toBe("0");
	});

	it("moves DOM focus and the roving tabindex to the clicked item, not just the selection", async () => {
		// jsdom's fireEvent.click does not synthesise a focus event the way a
		// real click does in most browsers, and macOS Safari does not focus a
		// clicked <button> even in the real thing — so this only passes if
		// ToggleGroupItem's click handler moves focus itself rather than
		// leaving it to an incidental focus handler. Deleting the explicit
		// `.focus()` call would leave every other test in this file green.
		const { container } = render(Harness, { props: { items: ITEMS } });
		const right = byLabel(container, "Right");

		await fireEvent.click(right);

		expect(document.activeElement).toBe(right);
		expect(right.getAttribute("tabindex")).toBe("0");
		expect(byLabel(container, "Left").getAttribute("tabindex")).toBe("-1");
	});

	it("skips disabled items with the arrows and with Home/End", async () => {
		const items: Item[] = [
			{ value: "left", label: "Left" },
			{ value: "center", label: "Center", disabled: true },
			{ value: "right", label: "Right" },
		];
		const { container } = render(Harness, { props: { items } });
		const left = byLabel(container, "Left");

		await fireEvent.keyDown(left, { key: "ArrowRight" });
		await nextTick();
		expect(document.activeElement).toBe(byLabel(container, "Right"));

		await fireEvent.keyDown(byLabel(container, "Right"), { key: "Home" });
		await nextTick();
		expect(document.activeElement).toBe(left);

		await fireEvent.keyDown(left, { key: "End" });
		await nextTick();
		expect(document.activeElement).toBe(byLabel(container, "Right"));
	});

	it("never gives a disabled item tabindex 0, even when it is first in the list", async () => {
		const items: Item[] = [
			{ value: "left", label: "Left", disabled: true },
			{ value: "right", label: "Right" },
		];
		const { container } = render(Harness, { props: { items } });
		await settleRovingOrder();

		expect(byLabel(container, "Left").getAttribute("tabindex")).toBe("-1");
		expect(byLabel(container, "Right").getAttribute("tabindex")).toBe("0");
	});

	it("marks a disabled item with the native disabled attribute and blocks its click", async () => {
		const onValueChange = vi.fn();
		const items: Item[] = [{ value: "a", label: "A", disabled: true }];
		const { container } = render(Harness, { props: { items, onValueChange } });
		const a = byLabel(container, "A");

		expect(a.disabled).toBe(true);
		await fireEvent.click(a);
		expect(onValueChange).not.toHaveBeenCalled();
		expect(a.getAttribute("aria-pressed")).toBe("false");
	});

	it("lets a single item be disabled independent of the group", () => {
		const items: Item[] = [
			{ value: "a", label: "A", disabled: true },
			{ value: "b", label: "B" },
		];
		const { container } = render(Harness, { props: { items } });

		expect(byLabel(container, "A").disabled).toBe(true);
		expect(byLabel(container, "B").disabled).toBe(false);
	});

	it("stays inert with no crash when every item is disabled", async () => {
		// `orderedEnabledButtons()` filters before the index math in `move`/
		// `moveToEdge`, so an empty result should no-op rather than throw —
		// the classic version of that bug is an infinite loop, and this
		// component has already shipped one, so this is pinned rather than
		// assumed.
		const items: Item[] = [
			{ value: "a", label: "A", disabled: true },
			{ value: "b", label: "B", disabled: true },
			{ value: "c", label: "C", disabled: true },
		];
		const { container } = render(Harness, { props: { items } });
		const all = buttons(container);

		expect(all).toHaveLength(3);
		for (const button of all) {
			expect(button.disabled).toBe(true);
			expect(button.getAttribute("tabindex")).toBe("-1");
		}

		await fireEvent.keyDown(all[0]!, { key: "ArrowRight" });
		await fireEvent.keyDown(all[0]!, { key: "Home" });
		await fireEvent.keyDown(all[0]!, { key: "End" });
		await nextTick();
		expect(document.activeElement).toBe(document.body);
	});

	it("keeps a single-type group down to one active item even if value arrives as an array", () => {
		// Guards `toArray`'s type-based branch: `type="single"` must take at
		// most the first entry, not let every id in a stray array read as
		// selected.
		const { container } = render(Harness, {
			props: { items: ITEMS, initialValue: ["left", "right"] },
		});

		expect(byLabel(container, "Left").getAttribute("aria-pressed")).toBe("true");
		expect(byLabel(container, "Right").getAttribute("aria-pressed")).toBe("false");
	});

	it("disables every item when the group itself is disabled", () => {
		const { container } = render(Harness, { props: { items: ITEMS, disabled: true } });
		expect(buttons(container).every((b) => b.disabled)).toBe(true);
	});

	it("keeps the arrow sequence in DOM order after items are reordered, not registration order", async () => {
		const { container, rerender } = render(Harness, { props: { items: ITEMS } });

		// Registration order is still Left, Center, Right — only the DOM order
		// changes.
		await rerender({ items: [ITEMS[2], ITEMS[1], ITEMS[0]] });

		const left = byLabel(container, "Left");
		await fireEvent.keyDown(left, { key: "ArrowRight" });
		await nextTick();

		// Left is now the last button on screen, so the next one, wrapping, is
		// the first — Right. Stale registration order would have said Center.
		expect(document.activeElement).toBe(byLabel(container, "Right"));
	});

	it("reassigns the roving position when the item holding it unmounts", async () => {
		const { container, rerender } = render(Harness, { props: { items: ITEMS } });
		const center = byLabel(container, "Center");
		await fireEvent.focus(center);
		await nextTick();
		expect(tabbable(container)).toBe(center);

		await rerender({ items: ITEMS.filter((item) => item.value !== "center") });
		await nextTick();

		expect(tabbable(container)).toBeTruthy();
		expect(tabbable(container)?.textContent?.trim()).not.toBe("Center");
	});

	it("round-trips a single selection through v-model:value", async () => {
		const { container } = render(Harness, { props: { items: ITEMS } });

		await fireEvent.click(byLabel(container, "Center"));
		expect(boundValue(container)).toBe("center");

		await fireEvent.click(byLabel(container, "Center"));
		expect(boundValue(container)).toBe("");
	});

	it("round-trips a multiple selection through v-model:value", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, type: "multiple" } });

		await fireEvent.click(byLabel(container, "Left"));
		await fireEvent.click(byLabel(container, "Right"));
		expect(boundValue(container)).toEqual(["left", "right"]);

		await fireEvent.click(byLabel(container, "Left"));
		expect(boundValue(container)).toEqual(["right"]);
	});

	it.each([
		["sm", "h-[26px]"],
		["md", "h-[30px]"],
		["lg", "h-[34px]"],
	] as const)("sizes %s to the matching height class", (size, heightClass) => {
		const { container } = render(Harness, { props: { items: ITEMS, size } });
		expect(byLabel(container, "Left").className).toContain(heightClass);
	});

	it("merges the class prop with the base classes on the root", () => {
		const { container } = render(ToggleGroup, { props: { class: "mt-4" } });
		const root = group(container);

		expect(root.className).toContain("ft-toggle-group");
		expect(root.className).toContain("mt-4");
	});

	it("binds the root element", () => {
		const wrapper = mount(ToggleGroup);
		expect(wrapper.vm.ref).toBe(wrapper.element);
	});

	it("falls back to the value as content when neither children nor label is given", () => {
		const { container } = render(ToggleGroupItem, { props: { value: "x" } });
		expect(container.querySelector("button")?.textContent?.trim()).toBe("x");
	});

	it("renders custom children over the label/value fallback", () => {
		const { container } = render(ToggleGroupItem, {
			props: { value: "x", label: "Ex" },
			slots: { default: '<span data-testid="glyph">×</span>' },
		});
		expect(container.querySelector('[data-testid="glyph"]')).toBeTruthy();
	});

	// The scoped `<style>` declares a `transition` shorthand on the item.
	// Vue's scoped CSS is unlayered and Tailwind's utilities sit in
	// `@layer utilities`, so leaving `transition-colors` on the class string
	// would read as a colour transition that silently never ran.
	it("drops the transition-colors utility from the item in favour of the hand-written channel", () => {
		const { container } = render(Harness, { props: { items: ITEMS } });
		expect(byLabel(container, "Left").className).not.toContain("transition-colors");
		expect(byLabel(container, "Left").className).toContain("ft-toggle-group-item");
	});

	// The press feedback is a `:active` rule keyed on `.ft-toggle-group-item`.
	// jsdom computes neither `:active` nor `@media`, so what a test can pin is
	// that the class the CSS hangs off is on every item, selected or not.
	it("keeps the press-feedback class hook on every item regardless of selection", async () => {
		const { container } = render(Harness, { props: { items: ITEMS, initialValue: "left" } });

		for (const el of buttons(container)) {
			expect(el.className).toContain("ft-toggle-group-item");
		}
	});

	it("reduced motion: selection still round-trips through aria-pressed", async () => {
		const real = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			...real(query),
			matches: true,
		})) as typeof window.matchMedia;

		try {
			const { container } = render(Harness, { props: { items: ITEMS } });
			const left = byLabel(container, "Left");

			// Reduced motion swaps the press scale for an opacity fade; neither is
			// observable in jsdom. What is observable is that nothing about the
			// state contract is gated on the preference.
			expect(left.getAttribute("aria-pressed")).toBe("false");
			await fireEvent.click(left);
			expect(left.getAttribute("aria-pressed")).toBe("true");
		} finally {
			window.matchMedia = real;
		}
	});

	it("renders an item outside a group harmlessly, unselected and without a roving tabindex", async () => {
		const { container } = render(ToggleGroupItem, { props: { value: "solo", label: "Solo" } });
		const el = container.querySelector("button") as HTMLButtonElement;

		expect(el.getAttribute("aria-pressed")).toBe("false");
		expect(el.hasAttribute("tabindex")).toBe(false);

		// There is no group to toggle; this must not throw.
		await fireEvent.click(el);
		expect(el.getAttribute("aria-pressed")).toBe("false");
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays select exactly once when picking an item in type=single, with sound enabled", async () => {
			const { container } = render(Harness, { props: { items: ITEMS, sound: true } });

			await fireEvent.click(byLabel(container, "Left"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("plays select again on clear-on-repick — activating the already-selected item in type=single", async () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, sound: true, initialValue: "left" },
			});

			await fireEvent.click(byLabel(container, "Left"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("plays toggle-on exactly once when activating an unselected item in type=multiple", async () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, type: "multiple", sound: true },
			});

			await fireEvent.click(byLabel(container, "Left"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-on");
		});

		it("plays toggle-off exactly once when deactivating a selected item in type=multiple", async () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, type: "multiple", sound: true, initialValue: ["left"] },
			});

			await fireEvent.click(byLabel(container, "Left"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-off");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const { container } = render(Harness, { props: { items: ITEMS } });

			await fireEvent.click(byLabel(container, "Left"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while the group is disabled, even with sound enabled", () => {
			const { container } = render(Harness, {
				props: { items: ITEMS, sound: true, disabled: true },
			});

			byLabel(container, "Left").dispatchEvent(
				new MouseEvent("click", { bubbles: true, cancelable: true })
			);

			expect(play).not.toHaveBeenCalled();
		});

		it("does not wire the cue in ToggleGroupItem's click handler — an item outside a group plays nothing", async () => {
			const { container } = render(ToggleGroupItem, { props: { value: "solo", label: "Solo" } });
			const el = container.querySelector("button") as HTMLButtonElement;

			await fireEvent.click(el);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
