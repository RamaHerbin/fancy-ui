import { render, cleanup, fireEvent } from "@testing-library/vue";
import { defineComponent, onMounted, ref, useTemplateRef } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";

import Switch from "./Switch.vue";
import type { SwitchSize } from "./Switch.vue";
import { FIELD_KEY, type FieldContext } from "../../internals/field.js";
import { sound } from "../../sound/sound.js";

/**
 * Transposed assertion-for-assertion from the source component's suite. Three
 * shapes changed and nothing else did:
 *
 * - The source's checked/ref harness is an inline `defineComponent` here: it
 *   drives `v-model:checked` and reads the element back off the child's
 *   exposed `ref` instead of `bind:ref`.
 * - The source's field harness collapses into `global.provide`: the component
 *   is proven against the frozen `useField()`/`FieldContext` surface, without
 *   depending on the actual FormField component.
 * - A snippet is a slot, so `createRawSnippet(...)` is a slot string.
 */

function toggle(container: Element): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

function wrapper(container: Element): HTMLLabelElement {
	return container.querySelector("label") as HTMLLabelElement;
}

/**
 * The counterpart of the source's `*.test.svelte` rig. A props object handed
 * to `render` is not written back by the child, so proving `checked` travels
 * back out to the consumer — and that the exposed `ref` points at the real
 * element — needs a parent that owns both.
 */
const ValueHarness = defineComponent({
	components: { Switch },
	setup() {
		const checked = ref(false);
		const child = useTemplateRef<InstanceType<typeof Switch>>("child");

		onMounted(() => {
			child.value?.ref?.setAttribute("data-bound-ref", "yes");
		});

		return { checked };
	},
	template: `
		<Switch ref="child" v-model:checked="checked" label="Notifications" />
		<span data-testid="bound-checked">{{ checked }}</span>
	`,
});

describe("Switch", () => {
	afterEach(cleanup);

	it("renders a real checkbox input with role=switch, off by default", () => {
		const { container } = render(Switch, { props: { label: "Notifications" } });
		const el = toggle(container);

		expect(el.tagName).toBe("INPUT");
		expect(el.type).toBe("checkbox");
		expect(el.getAttribute("role")).toBe("switch");
		expect(el.checked).toBe(false);
		expect(el.getAttribute("aria-checked")).toBe("false");
	});

	it("renders the on mockup state distinctly from off, via the checked property and aria-checked", () => {
		const { container } = render(Switch, { props: { checked: true, label: "Notifications" } });
		const el = toggle(container);

		expect(el.checked).toBe(true);
		expect(el.getAttribute("aria-checked")).toBe("true");
	});

	it.each(["sm", "md", "lg"] as SwitchSize[])(
		"carries its size (%s) as data-size, which the scoped stylesheet keys the track/knob geometry off",
		(size) => {
			const { container } = render(Switch, { props: { size, label: "Notifications" } });
			expect(toggle(container).getAttribute("data-size")).toBe(size);
		}
	);

	it("defaults to the md size", () => {
		const { container } = render(Switch, { props: { label: "Notifications" } });
		expect(toggle(container).getAttribute("data-size")).toBe("md");
	});

	it("disables the field: native disabled, dimmed wrapper, position/knob still perceivable via data-size geometry", () => {
		const { container } = render(Switch, { props: { disabled: true, label: "Notifications" } });
		const el = toggle(container);
		const label = wrapper(container);

		expect(el.disabled).toBe(true);
		expect(label.className).toContain("opacity-50");
		expect(label.className).toContain("cursor-not-allowed");
	});

	it("calls onCheckedChange exactly once with the new value on each toggle", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(Switch, {
			props: { checked: false, onCheckedChange, label: "Notifications" },
		});
		const el = toggle(container);

		await fireEvent.click(el);
		expect(el.checked).toBe(true);
		expect(onCheckedChange).toHaveBeenCalledTimes(1);
		expect(onCheckedChange).toHaveBeenCalledWith(true);

		await fireEvent.click(el);
		expect(el.checked).toBe(false);
		expect(onCheckedChange).toHaveBeenCalledTimes(2);
		expect(onCheckedChange).toHaveBeenLastCalledWith(false);
	});

	it("works with a plain non-bound checked plus a callback", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(Switch, {
			props: { checked: false, onCheckedChange, label: "Notifications" },
		});
		const el = toggle(container);

		expect(el.checked).toBe(false);
		await fireEvent.click(el);
		expect(el.checked).toBe(true);
		expect(onCheckedChange).toHaveBeenCalledWith(true);
	});

	it("works uncontrolled, with neither checked nor onCheckedChange passed in", async () => {
		const { container } = render(Switch, { props: { label: "Notifications" } });
		const el = toggle(container);

		expect(el.checked).toBe(false);
		await fireEvent.click(el);
		expect(el.checked).toBe(true);
	});

	it("blocks both the state change and the callback while disabled, via a synthetic event that bypasses the native guard", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(Switch, {
			props: { checked: false, disabled: true, onCheckedChange, label: "Notifications" },
		});
		const el = toggle(container);
		expect(el.disabled).toBe(true);

		await fireEvent.change(el, { target: { checked: true } });

		expect(el.checked).toBe(false);
		expect(onCheckedChange).not.toHaveBeenCalled();
	});

	it("round-trips checked through v-model:checked", async () => {
		const { container, getByTestId } = render(ValueHarness);
		const el = toggle(container);

		expect(getByTestId("bound-checked").textContent).toBe("false");
		await fireEvent.click(el);
		expect(getByTestId("bound-checked").textContent).toBe("true");
		expect(el.checked).toBe(true);
	});

	it("round-trips the input element through the exposed ref", () => {
		const { container } = render(ValueHarness);
		expect(toggle(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("resolves the accessible name from the label prop when there is no visible slot text", () => {
		const { container } = render(Switch, { props: { label: "Notifications" } });
		expect(toggle(container).getAttribute("aria-label")).toBe("Notifications");
	});

	it("falls through to the slot's own text as the accessible name when label is not given", () => {
		const { container } = render(Switch, {
			slots: { default: "<span>Notifications</span>" },
		});
		const el = toggle(container);

		expect(el.hasAttribute("aria-label")).toBe(false);
		expect(wrapper(container).textContent).toContain("Notifications");
	});

	it("applies label as aria-label even alongside icon-only slot content with no text of its own", () => {
		// The component cannot introspect arbitrary slot content to tell whether
		// it renders text, so `label` must win whenever it is passed — this is
		// exactly the icon-only-children-plus-label case the prop exists for.
		const { container } = render(Switch, {
			props: { label: "Notifications" },
			slots: { default: '<svg aria-hidden="true"></svg>' },
		});
		expect(toggle(container).getAttribute("aria-label")).toBe("Notifications");
	});

	it("merges the class prop onto the wrapping label", () => {
		const { container } = render(Switch, { props: { class: "mt-4", label: "Notifications" } });
		const label = wrapper(container);

		expect(label.className).toContain("ft-switch-wrap");
		expect(label.className).toContain("mt-4");
	});

	it("reflects a surrounding FormField's invalid state through aria-invalid, though Switch has no own invalid prop", () => {
		const context: FieldContext = {
			controlId: "ctx-id",
			describedBy: undefined,
			invalid: true,
			valid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(Switch, {
			props: { label: "Notifications" },
			global: { provide: { [FIELD_KEY]: context } },
		});
		expect(toggle(container).getAttribute("aria-invalid")).toBe("true");
	});

	it("leaves aria-invalid unset by default", () => {
		const { container } = render(Switch, { props: { label: "Notifications" } });
		expect(toggle(container).hasAttribute("aria-invalid")).toBe(false);
	});

	it("submits its value through FormData when on and named", () => {
		const { container } = render(Switch, {
			props: { checked: true, name: "notifications", value: "on", label: "Notifications" },
		});
		const el = toggle(container);

		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("notifications")).toBe("on");
	});

	it("is excluded from form submission while off", () => {
		const { container } = render(Switch, {
			props: { checked: false, name: "notifications", value: "on", label: "Notifications" },
		});
		const el = toggle(container);

		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("notifications")).toBeNull();
	});

	it("works standalone: useField() has no provider, so its own props apply untouched", () => {
		const { container } = render(Switch, {
			props: { id: "solo", required: true, disabled: false, label: "Notifications" },
		});
		const el = toggle(container);

		expect(el.id).toBe("solo");
		expect(el.required).toBe(true);
	});

	it("inside a FormField, the context wins for controlId, aria-describedby, required and disabled", () => {
		const context: FieldContext = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			valid: false,
			required: true,
			disabled: true,
		};
		// Own props that disagree with the context are passed deliberately, so
		// this proves the context wins rather than merely matching by
		// coincidence.
		const { container } = render(Switch, {
			props: { id: "own-id", required: false, disabled: false, label: "Notifications" },
			global: { provide: { [FIELD_KEY]: context } },
		});
		const el = toggle(container);

		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});

	// The knob's slide is the only motion in this component and it is entirely
	// CSS: the `translateX` that puts the knob at the far end of the track is
	// declared outside `@media (prefers-reduced-motion: no-preference)`, and
	// only the transition that animates the trip lives inside it — so under the
	// preference the knob still lands in the right place, it just snaps. jsdom
	// computes neither a media block nor a `::after`, so what a test can honestly
	// pin is the contract the CSS keys off: `checked` / `aria-checked` /
	// `data-size` flip exactly when they did, gated on nothing.
	it("reduced motion: the checked and size contract driving the knob is unchanged", async () => {
		// Discriminating stub: `(prefers-reduced-motion: reduce)` and
		// `(prefers-reduced-motion: no-preference)` are complementary, so a blanket
		// `matches: true` would answer yes to both and silently satisfy either branch
		// the moment this component grows a reduced-motion read. Matching on the
		// substring "reduce" does NOT discriminate — "prefers-reduced-motion"
		// contains it — hence the anchored `: reduce` test.
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: /prefers-reduced-motion:\s*reduce\b/.test(query),
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}));

		try {
			const onCheckedChange = vi.fn();
			const { container } = render(Switch, {
				props: { checked: false, size: "lg", onCheckedChange, label: "Notifications" },
			});
			const el = toggle(container);

			expect(el.getAttribute("data-size")).toBe("lg");

			await fireEvent.click(el);

			expect(el.checked).toBe(true);
			expect(el.getAttribute("aria-checked")).toBe("true");
			expect(onCheckedChange).toHaveBeenCalledWith(true);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays toggle-on exactly once when switched on via a click, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Switch, { props: { sound: true, label: "Notifications" } });
			const el = toggle(container);

			await fireEvent.click(el);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-on");
		});

		it("plays toggle-off exactly once when switched off via a click, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Switch, {
				props: { sound: true, checked: true, label: "Notifications" },
			});
			const el = toggle(container);

			await fireEvent.click(el);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-off");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Switch, { props: { label: "Notifications" } });
			const el = toggle(container);

			await fireEvent.click(el);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when disabled via its own prop, even with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Switch, {
				props: { sound: true, disabled: true, label: "Notifications" },
			});
			const el = toggle(container);

			await fireEvent.change(el, { target: { checked: true } });

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when disabled through a surrounding FormField, even with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const context: FieldContext = {
				controlId: "ctx-id-2",
				describedBy: undefined,
				invalid: false,
				valid: true,
				required: false,
				disabled: true,
			};
			// Rendered with no `sound` prop of its own, so this proves the
			// disabled guard specifically.
			render(Switch, {
				props: { id: "own-id", required: false, disabled: false, label: "Notifications" },
				global: { provide: { [FIELD_KEY]: context } },
			});

			expect(play).not.toHaveBeenCalled();
		});

		it("plays exactly one cue for a label click, not two (label click double-dispatches click but change fires once)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Switch, { props: { sound: true, label: "Notifications" } });
			const label = wrapper(container);

			await fireEvent.click(label);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-on");
		});

		it("plays exactly one cue for a keyboard Space activation on the input", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Switch, { props: { sound: true, label: "Notifications" } });
			const el = toggle(container);
			el.focus();

			// jsdom does not implement the native Space-activates-checkbox
			// behaviour; a real browser's default action for Space fires exactly
			// one click, which is simulated directly here.
			await fireEvent.keyDown(el, { key: " " });
			await fireEvent.click(el);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-on");
		});

		it("does not leak the sound prop onto the DOM input", () => {
			const { container } = render(Switch, { props: { sound: true, label: "Notifications" } });
			const el = toggle(container);

			expect(el.hasAttribute("sound")).toBe(false);
		});
	});
});
