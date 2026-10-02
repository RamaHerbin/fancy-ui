import { cleanup, fireEvent, render, waitFor } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref, type PropType } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import Autocomplete from "./Autocomplete.vue";
import { FIELD_KEY, type FieldContext } from "../../internals/field.js";
import { dismissable } from "../../internals/dismissable.js";
import { sound } from "../../sound/sound.js";

/**
 * Transposed assertion-for-assertion from the source component's suite. Six
 * shapes changed and nothing else did:
 *
 * - `tick()` becomes `nextTick()`.
 * - The source's `*.test.svelte` harnesses collapse: the value round-trip
 *   renders an inline component that holds the state and binds `v-model:value`,
 *   and the FormField cases publish the context through `global.provide`
 *   instead of a wrapper component.
 * - The bindable `ref` is exposed on the instance, so the ref case mounts and
 *   reads `wrapper.vm.ref` rather than binding a local.
 * - The cue player forwards its (absent) options argument, so the sound cases
 *   assert `("select", undefined)`.
 * - `inert` is read as an ATTRIBUTE. jsdom implements no `inert` IDL property,
 *   and the presence clock writes the attribute through `toggleAttribute`, so
 *   `hasAttribute` observes production behaviour directly rather than a shim.
 * - The source's synchronous `flushSync()` has no counterpart in this
 *   framework, so the reversal case stops the transition clock instead of
 *   racing it — see `freezeRunningLegs()`.
 *
 * One fixture also changed, marked at its call site: this package's jsdom has
 * no `PointerEvent`.
 */

const CITIES = ["Paris", "Parma", "Prague", "London"];

function input(container: Element): HTMLInputElement {
	return container.querySelector("input[role='combobox']") as HTMLInputElement;
}

function panel(): HTMLElement | null {
	// Portalled to document.body, not inside `container`.
	return document.querySelector(".ft-autocomplete-panel");
}

function options(): HTMLElement[] {
	return Array.from(document.querySelectorAll(".ft-autocomplete-panel [role='option']"));
}

function liveRegion(container: Element): HTMLElement {
	return container.querySelector('[role="status"]') as HTMLElement;
}

/** Replaces `window.matchMedia` wholesale — the pattern the rest of the repo
 * uses. `prefersReducedMotion()` resolves it fresh on every call, so an
 * override installed before a render is visible to the very next read. */
function stubReducedMotion(matches = true): void {
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

/** Dispatches Escape SYNCHRONOUSLY, unlike `fireEvent.keyDown`, which awaits a
 * tick of its own. The exit window is two microtasks under the animation stub,
 * so anything awaited between the dismiss and the assertion has already drained
 * it and the test would pass for the wrong reason. */
function pressEscape(): void {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

/** This package's jsdom version does not implement `PointerEvent`, and the
 * dismiss layer listens for a plain `pointerdown`. `MouseEvent` carries every
 * field the layer reads. */
function pointerDownOn(target: HTMLElement): void {
	const PointerDownCtor = typeof PointerEvent !== "undefined" ? PointerEvent : MouseEvent;
	target.dispatchEvent(new PointerDownCtor("pointerdown", { bubbles: true, cancelable: true }));
}

/**
 * Holds every RUNNING transition leg open for as long as the test wants, which
 * is what replaces the source suite's synchronous `flushSync()`.
 *
 * Under the shared animation stub a leg finishes on a microtask, so the whole
 * exit window is one microtask wide and NO awaited helper lands inside it: the
 * list settles, unmounts and re-creates, and a case that means to pin a
 * reversal silently pins a fresh mount instead — the exact failure the source
 * comment warns about. So the clock is stopped rather than raced. The sampler
 * always creates a leading dummy at `duration: 0` and only then, from its
 * `onfinish`, the real leg at `duration > 0`; forwarding the zero-duration call
 * to the stub and answering the other with an animation that never finishes
 * leaves the leg genuinely in flight across any number of awaits.
 */
function freezeRunningLegs(): void {
	const stub = Element.prototype.animate;
	vi.spyOn(Element.prototype, "animate").mockImplementation(function (
		this: Element,
		keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
		options?: number | KeyframeAnimationOptions
	) {
		const duration = typeof options === "number" ? options : (options?.duration ?? 0);
		if (duration === 0) return stub.call(this, keyframes, options);
		return {
			playState: "running",
			currentTime: 0,
			startTime: 0,
			effect: null,
			onfinish: null,
			oncancel: null,
			cancel() {},
			finish() {},
			play() {},
			pause() {},
			reverse() {},
			updatePlaybackRate() {},
			commitStyles() {},
			persist() {},
			addEventListener() {},
			removeEventListener() {},
		} as unknown as Animation;
	});
}

/**
 * Drains a leg to completion. The `animate` stub finishes each animation on a
 * microtask and the sampler chains a leading dummy into the real animation, so
 * a settled leg is two turns away; crossing a macrotask boundary drains the
 * whole chain, and the trailing `nextTick()` flushes the render the finish
 * scheduled.
 */
const settleLegs = async (): Promise<void> => {
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
	await nextTick();
};

/**
 * The counterpart of the source's `bind:value` harness: the props object a test
 * hands to `render` is not a two-way channel on its own, so a component that
 * holds the state and binds `v-model:value` is the only way to prove `value`
 * travels back out to the consumer rather than merely changing what the input
 * draws.
 */
const ValueHarness = defineComponent({
	name: "ValueHarness",
	props: {
		suggestions: { type: Array as PropType<string[]>, required: true },
	},
	setup(props) {
		const value = ref("");
		return () => [
			h(Autocomplete, {
				suggestions: props.suggestions,
				value: value.value,
				"onUpdate:value": (next: string) => {
					value.value = next;
				},
				label: "City",
			}),
			h("span", { "data-testid": "bound-value" }, value.value),
		];
	},
});

describe("Autocomplete", () => {
	afterEach(() => {
		cleanup();
		document.body.querySelectorAll(".ft-autocomplete-panel").forEach((el) => el.remove());
	});

	it("renders closed, with aria-expanded false and no aria-controls", () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		expect(el.getAttribute("role")).toBe("combobox");
		expect(el.getAttribute("aria-expanded")).toBe("false");
		expect(el.hasAttribute("aria-controls")).toBe(false);
		expect(panel()).toBeNull();
	});

	it("opens and lists matches as the user types, case-insensitively", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		const controls = el.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(panel()?.id).toBe(controls);

		const rows = options();
		expect(rows).toHaveLength(2);
		expect(rows[0]!.textContent).toContain("Paris");
		expect(rows[1]!.textContent).toContain("Parma");
	});

	it("highlights the real matched range, not a naive case-sensitive indexOf of the raw query", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		const strong = options()[0]!.querySelector("strong");
		// Suggestion is "Paris"; typed query is lowercase "par" — a naive
		// case-sensitive `indexOf` would miss it entirely ("P" !== "p").
		expect(strong?.textContent).toBe("Par");
		expect(options()[0]!.textContent).toContain("Paris");
	});

	it("shows no panel at all when nothing matches", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "zzz" } });
		expect(panel()).toBeNull();
		expect(el.getAttribute("aria-expanded")).toBe("false");
	});

	it("suppresses suggestions below minLength", async () => {
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, minLength: 3 },
		});
		const el = input(container);

		await fireEvent.input(el, { target: { value: "pa" } });
		expect(panel()).toBeNull();

		await fireEvent.input(el, { target: { value: "par" } });
		expect(panel()).not.toBeNull();
		expect(options().length).toBeGreaterThan(0);
	});

	it("defaults minLength to 1", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "p" } });
		expect(panel()).not.toBeNull();
	});

	it("caps the number of suggestions at maxSuggestions", async () => {
		const many = Array.from({ length: 20 }, (_, i) => `Item ${i}`);
		const { container } = render(Autocomplete, {
			props: { suggestions: many, maxSuggestions: 5 },
		});
		const el = input(container);

		await fireEvent.input(el, { target: { value: "item" } });
		expect(options()).toHaveLength(5);
	});

	it("defaults maxSuggestions to 8", async () => {
		const many = Array.from({ length: 20 }, (_, i) => `Item ${i}`);
		const { container } = render(Autocomplete, { props: { suggestions: many } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "item" } });
		expect(options()).toHaveLength(8);
	});

	it("arrowing highlights rows in the list without writing into the field", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);
		el.focus();
		await nextTick();

		await fireEvent.input(el, { target: { value: "par" } });
		expect(el.value).toBe("par");
		expect(el.hasAttribute("aria-activedescendant")).toBe(false);

		await fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(options()[0]!.id);
		// The visible text is untouched by navigation — only the list's own
		// active row changed, not the field.
		expect(el.value).toBe("par");
		expect(document.activeElement).toBe(el);

		await fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.getAttribute("aria-activedescendant")).toBe(options()[1]!.id);
		expect(el.value).toBe("par");
		expect(document.activeElement).toBe(el);
	});

	it("Escape restores what the user typed — there is nothing to revert since arrowing never touched it", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		await fireEvent.keyDown(el, { key: "ArrowDown" });
		await fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.value).toBe("par");

		await fireEvent.keyDown(document, { key: "Escape" });
		await waitFor(() => expect(panel()).toBeNull());
		expect(el.value).toBe("par");
	});

	it("commits the active suggestion on Enter, closes the panel, and fires onSelect and onValueChange", async () => {
		const onValueChange = vi.fn();
		const onSelect = vi.fn();
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, onValueChange, onSelect },
		});
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		onValueChange.mockClear(); // drop the plain-typing call
		await fireEvent.keyDown(el, { key: "ArrowDown" }); // activates "Paris"

		await fireEvent.keyDown(el, { key: "Enter" });
		expect(el.value).toBe("Paris");
		expect(onSelect).toHaveBeenCalledWith("Paris");
		expect(onValueChange).toHaveBeenCalledWith("Paris");
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("Enter with nothing highlighted does not alter the value or fire onSelect", async () => {
		const onSelect = vi.fn();
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, onSelect },
		});
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		expect(el.hasAttribute("aria-activedescendant")).toBe(false);

		await fireEvent.keyDown(el, { key: "Enter" });
		expect(onSelect).not.toHaveBeenCalled();
		expect(el.value).toBe("par");
	});

	it("reconciles the active row when the suggestions change under an open panel", async () => {
		const onSelect = vi.fn();
		const { container, rerender } = render(Autocomplete, {
			props: { suggestions: CITIES, onSelect },
		});
		const el = input(container);

		await fireEvent.input(el, { target: { value: "p" } }); // Paris, Parma, Prague
		await fireEvent.keyDown(el, { key: "ArrowUp" }); // wraps to "Prague", index 2
		expect(el.getAttribute("aria-activedescendant")).toMatch(/-option-2$/);

		// Same entries, fresh array: the highlight stays where it is.
		await rerender({ suggestions: [...CITIES], onSelect });
		expect(el.getAttribute("aria-activedescendant")).toMatch(/-option-2$/);

		// The highlighted entry moves: the index follows it.
		await rerender({ suggestions: ["Prague", "Paris", "Parma"], onSelect });
		expect(el.getAttribute("aria-activedescendant")).toMatch(/-option-0$/);

		// The list shrinks past the highlighted entry: nothing stays pointed at a
		// row that no longer exists.
		await rerender({ suggestions: ["Paris", "Parma"], onSelect });
		expect(options()).toHaveLength(2);
		expect(el.hasAttribute("aria-activedescendant")).toBe(false);

		// And the next arrow starts from the top again rather than from a stale index.
		await fireEvent.keyDown(el, { key: "ArrowDown" });
		await fireEvent.keyDown(el, { key: "Enter" });
		expect(onSelect).toHaveBeenCalledWith("Paris");
	});

	it("commits on a row click, calling onSelect but not before the click", async () => {
		const onSelect = vi.fn();
		const { container } = render(Autocomplete, { props: { suggestions: CITIES, onSelect } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		expect(onSelect).not.toHaveBeenCalled();

		await fireEvent.click(options()[1]!); // "Parma"
		expect(onSelect).toHaveBeenCalledWith("Parma");
		expect(el.value).toBe("Parma");
	});

	it("onValueChange fires on plain typing, independent of onSelect", async () => {
		const onValueChange = vi.fn();
		const onSelect = vi.fn();
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, onValueChange, onSelect },
		});
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		expect(onValueChange).toHaveBeenCalledWith("par");
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("closes the panel on blur without altering the typed value", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "something unmatched-ish par" } });
		await fireEvent.blur(el);
		await waitFor(() => expect(panel()).toBeNull());
		expect(el.value).toBe("something unmatched-ish par");
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);
		await fireEvent.input(el, { target: { value: "par" } });
		expect(panel()).not.toBeNull();

		pointerDownOn(outside);
		await waitFor(() => expect(panel()).toBeNull());
		outside.remove();
	});

	it("announces a suggestion count in a live region, not the suggestion text", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);
		const region = liveRegion(container);
		expect(region.textContent).toBe("");

		await fireEvent.input(el, { target: { value: "par" } });
		expect(region.textContent).toBe("2 suggestions");
		expect(region.textContent).not.toContain("Paris");

		await fireEvent.input(el, { target: { value: "paris" } });
		expect(region.textContent).toBe("1 suggestion");
	});

	// The three ways this codebase expects a bindable prop plus its change
	// callback to work: two-way, the callback alone, and a plain non-bound
	// value plus that same callback.
	it("round-trips through v-model:value", async () => {
		const { container, getByTestId } = render(ValueHarness, {
			props: { suggestions: CITIES },
		});
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		await fireEvent.click(options()[0]!);
		expect(getByTestId("bound-value").textContent).toBe("Paris");
	});

	it("works uncontrolled with only onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Autocomplete, { props: { suggestions: CITIES, onValueChange } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "par" } });
		await fireEvent.click(options()[0]!);
		expect(onValueChange).toHaveBeenCalledWith("Paris");
		expect(el.value).toBe("Paris");
	});

	it("works with a plain non-bound value plus onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, value: "start", onValueChange },
		});
		const el = input(container);
		expect(el.value).toBe("start");

		await fireEvent.input(el, { target: { value: "par" } });
		expect(onValueChange).toHaveBeenCalledWith("par");
		expect(el.value).toBe("par");
	});

	it("exposes the input element as ref", () => {
		const wrapper = mount(Autocomplete, {
			props: { suggestions: CITIES },
			attachTo: document.body,
		});

		expect(wrapper.vm.ref).toBe(document.querySelector("input[role='combobox']"));
		wrapper.unmount();
	});

	it("carries name and value directly on the visible input, unlike Combobox", () => {
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, value: "Paris", name: "city" },
		});
		const el = input(container);
		expect(el.name).toBe("city");
		expect(el.value).toBe("Paris");
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES, label: "City" } });
		expect(input(container).getAttribute("aria-label")).toBe("City");
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES, class: "mt-4" } });
		const cls = input(container).className;
		expect(cls).toContain("ft-autocomplete");
		expect(cls).toContain("mt-4");
	});

	it("works standalone: useField() has no provider, so its own props apply untouched", () => {
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, id: "solo", invalid: true, required: true, disabled: false },
		});
		const el = input(container);
		expect(el.id).toBe("solo");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
	});

	// The source's `*.test.svelte` harness collapses into `global.provide`: the
	// component is proven against the frozen `useField()`/`FieldContext`
	// surface, without depending on the actual FormField component.
	it("inside a FormField, the context wins for controlId, aria-describedby, aria-invalid, required and disabled", () => {
		const field: FieldContext = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			valid: false,
			required: true,
			disabled: true,
		};
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, id: "own-id" },
			global: { provide: { [FIELD_KEY]: field } },
		});
		const el = input(container);

		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});

	// The test above only exercises context=true overriding own=false — a
	// regression from `??` to `||` in any of the three `effective*` values
	// would pass it too, since `true || false` is still `true`. The three
	// below pin the polarity that actually tells `??` and `||` apart: own prop
	// `true`, context `false`, expecting the context's `false` to win.
	it("lets the context's disabled=false win over the component's own disabled=true prop", () => {
		const field: FieldContext = {
			controlId: "field-3",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, disabled: true },
			global: { provide: { [FIELD_KEY]: field } },
		});
		expect(input(container).disabled).toBe(false);
	});

	it("lets the context's required=false win over the component's own required=true prop", () => {
		const field: FieldContext = {
			controlId: "field-4",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, required: true },
			global: { provide: { [FIELD_KEY]: field } },
		});
		expect(input(container).required).toBe(false);
	});

	it("lets the context's invalid=false win over the component's own invalid=true prop", () => {
		const field: FieldContext = {
			controlId: "field-5",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, invalid: true },
			global: { provide: { [FIELD_KEY]: field } },
		});
		expect(input(container).hasAttribute("aria-invalid")).toBe(false);
	});

	it("blocks input while disabled", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Autocomplete, {
			props: { suggestions: CITIES, disabled: true, onValueChange },
		});
		const el = input(container);
		expect(el.disabled).toBe(true);

		await fireEvent.input(el, { target: { value: "par" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	describe("live region clears on close", () => {
		// `open ? resultsMessage : ""` reads correct, but that is exactly the
		// kind of thing worth pinning directly — a stale count left announced
		// after the panel closes is a real live-region bug class, not a
		// hypothetical one.
		it("clears on blur", async () => {
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			const el = input(container);
			const region = liveRegion(container);

			await fireEvent.input(el, { target: { value: "par" } });
			expect(region.textContent).toBe("2 suggestions");

			await fireEvent.blur(el);
			expect(region.textContent).toBe("");
		});

		it("clears on Escape", async () => {
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			const el = input(container);
			const region = liveRegion(container);

			await fireEvent.input(el, { target: { value: "par" } });
			expect(region.textContent).toBe("2 suggestions");

			await fireEvent.keyDown(document, { key: "Escape" });
			await waitFor(() => expect(region.textContent).toBe(""));
		});

		it("clears on an outside click", async () => {
			const outside = document.createElement("button");
			document.body.appendChild(outside);
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			const el = input(container);
			const region = liveRegion(container);

			await fireEvent.input(el, { target: { value: "par" } });
			expect(region.textContent).toBe("2 suggestions");

			pointerDownOn(outside);
			await waitFor(() => expect(region.textContent).toBe(""));
			outside.remove();
		});
	});

	// Not a test of what the guard prevents (jsdom has no focus-follows-
	// mousedown default action for it to suppress — see the comment on the
	// guard in AutocompletePanel.vue) — a test of whether the guard itself is
	// actually wired: a real `mousedown` dispatched at a row must come back
	// with `defaultPrevented: true`.
	it("the row's mousedown handler calls preventDefault, so a real browser's focus-follows-mousedown default action never fires", async () => {
		const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
		const el = input(container);
		await fireEvent.input(el, { target: { value: "par" } });

		const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
		options()[0]!.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
	});

	// This panel uses the shared `anchored` transition, whose growth origin
	// follows the side the panel was ACTUALLY placed on. jsdom makes that
	// deterministic: every rect measures 0×0, so the requested `bottom` never
	// overflows the 768px-tall default viewport and never flips.
	describe("entrance", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("publishes the resolved placement as data-side/data-align and grows from the matching origin", async () => {
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });

			await fireEvent.input(input(container), { target: { value: "par" } });
			await nextTick();

			const el = panel() as HTMLElement;
			expect(el.getAttribute("data-side")).toBe("bottom");
			expect(el.getAttribute("data-align")).toBe("start");
			expect(el.style.getPropertyValue("transform-origin")).toBe("left top");
			// Pins the positive case too: without it the reduced-motion test
			// below would pass for the wrong reason — an entrance that never
			// runs at all under any preference.
			expect(animate).toHaveBeenCalled();
		});

		it("runs no animation at all under prefers-reduced-motion, and the panel still appears", async () => {
			stubReducedMotion();
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });

			await fireEvent.input(input(container), { target: { value: "par" } });
			await nextTick();

			// A zero duration makes the sampler skip `element.animate()`
			// outright instead of running a zero-length animation, and the
			// panel's visibility never depended on the entrance in the first
			// place.
			expect(animate).not.toHaveBeenCalled();
			expect(panel()).not.toBeNull();
		});
	});

	// The list leaves on the same shared transition it arrives on, so between
	// the dismiss and the unmount there is a window — 150 ms in a browser, a
	// couple of microtasks under the animation stub. These pin what must be
	// true inside it. `open`, `value` and `onValueChange` all still settle
	// synchronously, which is why every assertion on them above stayed
	// unwrapped.
	describe("exit", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("keeps the list mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			const el = input(container);
			await fireEvent.input(el, { target: { value: "par" } });
			expect(panel()!.getAttribute("data-state")).toBe("open");

			pressEscape();
			await nextTick();

			const closing = panel();
			expect(closing).toBeTruthy();
			// An ordinary binding here, carrying the surface vocabulary's TWO
			// values: the presence-mounted subtree stays reactive for the whole
			// exit, so nothing has to be written imperatively.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// Written by the presence clock, as an attribute, for the whole
			// exit — which is what stops a row taking a click on its way out.
			expect(closing!.hasAttribute("inert")).toBe(true);
			// The input has already been told the list is gone.
			expect(el.getAttribute("aria-expanded")).toBe("false");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// This component closes and reopens on keystrokes, not only on an
		// explicit dismiss: a query that stops matching closes the list, and
		// the very next character that matches again lands inside the exit
		// window. One bidirectional leg reverses it in place; a split
		// enter/exit pair would leave the old node fading while a second one
		// faded in over it.
		it("reverses in place when a keystroke re-matches during the exit, rather than mounting a second list", async () => {
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			const el = input(container);
			await fireEvent.input(el, { target: { value: "par" } });
			expect(panel()).not.toBeNull();
			await settleLegs();
			const first = panel();

			// The exit window is one microtask wide under the shared stub, and
			// every await below would drain it: the clock is stopped instead.
			freezeRunningLegs();

			await fireEvent.input(el, { target: { value: "parx" } }); // matches nothing — the list starts leaving
			expect(panel()!.getAttribute("data-state")).toBe("closing");

			await fireEvent.input(el, { target: { value: "par" } }); // matches again, mid-exit
			expect(document.querySelectorAll(".ft-autocomplete-panel")).toHaveLength(1);
			// The SAME node, never a second one mounted over the first: the
			// reversal is what keeps the in-flight leg's position.
			expect(panel()).toBe(first);
			expect(panel()!.getAttribute("data-state")).toBe("open");
			// The reversed entrance clears the attribute again, so the rows
			// take clicks from the instant the list is coming back.
			expect(panel()!.hasAttribute("inert")).toBe(false);
		});

		// The `active: () => ctx.open` gate. A layer on its way out must not
		// swallow the key: the dismiss stack scans past it and hands Escape to
		// whatever is underneath.
		it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
			// Registered BEFORE the autocomplete, so the list sits above it on
			// the shared layer stack.
			const beneath = document.createElement("div");
			document.body.appendChild(beneath);
			const onBeneath = vi.fn();
			const beneathAction = dismissable(beneath, { onDismiss: onBeneath });

			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			await fireEvent.input(input(container), { target: { value: "par" } });

			pressEscape(); // the list is the top LIVE layer and takes this one
			await nextTick();
			expect(onBeneath).not.toHaveBeenCalled();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape(); // the list is inactive now, so this falls through
			expect(onBeneath).toHaveBeenCalledTimes(1);

			beneathAction?.destroy?.();
			beneath.remove();
			await waitFor(() => expect(panel()).toBeNull());
		});

		// The reduced-motion fast path: a zero duration makes the sampler call
		// `onFinish()` synchronously and never touch `element.animate()`, so a
		// visitor who asked for less motion gets exactly the synchronous close
		// this list had before the exit existed.
		it("closes synchronously and never animates under prefers-reduced-motion", async () => {
			stubReducedMotion();
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			await fireEvent.input(input(container), { target: { value: "par" } });
			expect(panel()).not.toBeNull();

			pressEscape();
			await nextTick();

			expect(panel()).toBeNull();
			expect(animate).not.toHaveBeenCalled();
		});
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays select exactly once on a row click, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Autocomplete, { props: { suggestions: CITIES, sound: true } });
			await fireEvent.input(input(container), { target: { value: "par" } });

			await fireEvent.click(options()[0]!); // Paris

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays select exactly once on Enter, and typing/focus/blur stay silent", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Autocomplete, { props: { suggestions: CITIES, sound: true } });
			const el = input(container);

			await fireEvent.input(el, { target: { value: "par" } }); // typing/open — silent
			expect(play).not.toHaveBeenCalled();

			await fireEvent.keyDown(el, { key: "ArrowDown" }); // navigate — silent
			await fireEvent.keyDown(el, { key: "Enter" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);

			play.mockClear();
			await fireEvent.blur(el); // closes — silent

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing at all with the default prop", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Autocomplete, { props: { suggestions: CITIES } });
			await fireEvent.input(input(container), { target: { value: "par" } });

			await fireEvent.click(options()[0]!);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even via a synthetic dispatch", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Autocomplete, {
				props: { suggestions: CITIES, disabled: true, sound: true },
			});
			const el = input(container);

			el.dispatchEvent(new Event("input", { bubbles: true }));
			el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

			expect(play).not.toHaveBeenCalled();
		});

		// Guardrail (riskFlag): an emptied panel closing via the watcher above
		// must never itself play — only a real commit through `commit()` does.
		it("never plays when the panel auto-closes because the filtered list empties out", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Autocomplete, { props: { suggestions: CITIES, sound: true } });
			const el = input(container);
			await fireEvent.input(el, { target: { value: "par" } });
			expect(panel()).not.toBeNull();
			play.mockClear();

			await fireEvent.input(el, { target: { value: "zzz" } }); // no matches — panel auto-closes
			await waitFor(() => expect(panel()).toBeNull());

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when re-picking the suggestion already the value — the changed-only guard", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Autocomplete, {
				props: { suggestions: CITIES, value: "Paris", sound: true },
			});
			await fireEvent.focus(input(container)); // opens: "Paris" already matches itself

			await fireEvent.click(options()[0]!); // Paris — already the value

			expect(play).not.toHaveBeenCalled();
		});

		it("still calls onValueChange/onSelect on the very same click that the changed-only guard silences", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const onValueChange = vi.fn();
			const onSelect = vi.fn();
			const { container } = render(Autocomplete, {
				props: { suggestions: CITIES, value: "Paris", sound: true, onValueChange, onSelect },
			});
			await fireEvent.focus(input(container));

			await fireEvent.click(options()[0]!); // Paris — already the value

			expect(play).not.toHaveBeenCalled();
			expect(onValueChange).toHaveBeenCalledTimes(1);
			expect(onValueChange).toHaveBeenCalledWith("Paris");
			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(onSelect).toHaveBeenCalledWith("Paris");
		});
	});
});
