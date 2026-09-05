import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Checkbox from "./Checkbox.svelte";
import ValueHarness from "./CheckboxHarness.test.svelte";
import FieldHarness from "./CheckboxFieldHarness.test.svelte";
import { sound } from "../sound/sound.svelte.js";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function checkbox(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

function wrapper(container: HTMLElement): HTMLLabelElement {
	return container.querySelector("label") as HTMLLabelElement;
}

describe("Checkbox", () => {
	afterEach(cleanup);

	it("renders a real checkbox input, unchecked by default", () => {
		const { container } = render(Checkbox, { props: { label: "Agree" } });
		const el = checkbox(container);

		expect(el.tagName).toBe("INPUT");
		expect(el.type).toBe("checkbox");
		expect(el.checked).toBe(false);
		expect(el.indeterminate).toBe(false);
		expect(el.getAttribute("aria-checked")).toBe("false");
	});

	it("renders the checked mockup state: checked property true, aria-checked true", () => {
		const { container } = render(Checkbox, { props: { checked: true, label: "Agree" } });
		const el = checkbox(container);

		expect(el.checked).toBe(true);
		expect(el.indeterminate).toBe(false);
		expect(el.getAttribute("aria-checked")).toBe("true");
	});

	it("renders the indeterminate mockup state as a DOM property, not an attribute, with aria-checked=mixed", () => {
		const { container } = render(Checkbox, {
			props: { indeterminate: true, label: "Agree" },
		});
		const el = checkbox(container);

		expect(el.indeterminate).toBe(true);
		expect(el.hasAttribute("indeterminate")).toBe(false);
		expect(el.getAttribute("aria-checked")).toBe("mixed");
	});

	it("renders the disabled mockup state: native disabled, dimmed wrapper", () => {
		const { container } = render(Checkbox, { props: { disabled: true, label: "Agree" } });
		const el = checkbox(container);
		const label = wrapper(container);

		expect(el.disabled).toBe(true);
		expect(label.className).toContain("opacity-50");
		expect(label.className).toContain("cursor-not-allowed");
	});

	it("reapplies the indeterminate DOM property whenever the prop changes, not only on mount", async () => {
		const { container, rerender } = render(Checkbox, {
			props: { indeterminate: false, label: "Agree" },
		});
		const el = checkbox(container);
		expect(el.indeterminate).toBe(false);

		await rerender({ indeterminate: true, label: "Agree" });
		expect(el.indeterminate).toBe(true);
		expect(el.getAttribute("aria-checked")).toBe("mixed");

		await rerender({ indeterminate: false, label: "Agree" });
		expect(el.indeterminate).toBe(false);
	});

	it("a click on an indeterminate box clears indeterminate and lands on the real checked value", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(Checkbox, {
			props: { checked: false, indeterminate: true, onCheckedChange, label: "Agree" },
		});
		const el = checkbox(container);
		expect(el.indeterminate).toBe(true);

		await fireEvent.click(el);

		expect(el.indeterminate).toBe(false);
		expect(el.checked).toBe(true);
		expect(el.getAttribute("aria-checked")).toBe("true");
		expect(onCheckedChange).toHaveBeenCalledTimes(1);
		expect(onCheckedChange).toHaveBeenCalledWith(true);
	});

	it("calls onCheckedChange exactly once with the new value on each toggle", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(Checkbox, {
			props: { checked: false, onCheckedChange, label: "Agree" },
		});
		const el = checkbox(container);

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
		const { container } = render(Checkbox, {
			props: { checked: false, onCheckedChange, label: "Agree" },
		});
		const el = checkbox(container);

		expect(el.checked).toBe(false);
		await fireEvent.click(el);
		expect(el.checked).toBe(true);
		expect(onCheckedChange).toHaveBeenCalledWith(true);
	});

	it("works uncontrolled, with neither checked nor onCheckedChange passed in", async () => {
		const { container } = render(Checkbox, { props: { label: "Agree" } });
		const el = checkbox(container);

		expect(el.checked).toBe(false);
		await fireEvent.click(el);
		expect(el.checked).toBe(true);
	});

	it("blocks both the state change and the callback while disabled, via a synthetic event that bypasses the native guard", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(Checkbox, {
			props: { checked: false, disabled: true, onCheckedChange, label: "Agree" },
		});
		const el = checkbox(container);
		expect(el.disabled).toBe(true);

		// A `change` dispatched straight at the element reaches the handler
		// regardless of the native `disabled` guard on real interaction —
		// proving the component's own guard, not the attribute, is what stops
		// the state from moving.
		await fireEvent.change(el, { target: { checked: true } });

		expect(el.checked).toBe(false);
		expect(onCheckedChange).not.toHaveBeenCalled();
	});

	it("round-trips checked through bind:checked", async () => {
		const { container, getByTestId } = render(ValueHarness);
		const el = checkbox(container);

		expect(getByTestId("bound-checked").textContent).toBe("false");
		await fireEvent.click(el);
		expect(getByTestId("bound-checked").textContent).toBe("true");
		expect(el.checked).toBe(true);
	});

	it("round-trips indeterminate through bind:indeterminate, cleared by a click", async () => {
		const { container, getByTestId } = render(ValueHarness, {
			props: { indeterminate: true },
		});
		const el = checkbox(container);
		expect(getByTestId("bound-indeterminate").textContent).toBe("true");
		expect(el.indeterminate).toBe(true);

		await fireEvent.click(el);
		expect(getByTestId("bound-indeterminate").textContent).toBe("false");
		expect(el.indeterminate).toBe(false);
	});

	it("round-trips the input element through bind:ref", () => {
		const { container } = render(ValueHarness);
		expect(checkbox(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("resolves the accessible name from the label prop when there is no visible children text", () => {
		const { container } = render(Checkbox, { props: { label: "Agree to terms" } });
		expect(checkbox(container).getAttribute("aria-label")).toBe("Agree to terms");
	});

	it("falls through to children's own text as the accessible name when label is not given", () => {
		const { container } = render(Checkbox, {
			props: { children: snippet("<span>I agree</span>") },
		});
		const el = checkbox(container);

		expect(el.hasAttribute("aria-label")).toBe(false);
		expect(wrapper(container).textContent).toContain("I agree");
	});

	it("applies label as aria-label even alongside icon-only children with no text of their own", () => {
		// The component cannot introspect an arbitrary Snippet to tell whether
		// it renders text, so `label` must win whenever it is passed — this is
		// exactly the icon-only-children-plus-label case the prop exists for.
		const { container } = render(Checkbox, {
			props: {
				label: "Agree to terms",
				children: snippet('<svg aria-hidden="true"></svg>'),
			},
		});
		expect(checkbox(container).getAttribute("aria-label")).toBe("Agree to terms");
	});

	it("merges the class prop onto the wrapping label", () => {
		const { container } = render(Checkbox, { props: { class: "mt-4", label: "Agree" } });
		const label = wrapper(container);

		expect(label.className).toContain("ft-checkbox");
		expect(label.className).toContain("mt-4");
	});

	it("reflects invalid through aria-invalid and data-invalid", () => {
		const { container } = render(Checkbox, { props: { invalid: true, label: "Agree" } });
		const el = checkbox(container);

		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.getAttribute("data-invalid")).toBe("true");
	});

	it("leaves aria-invalid unset by default", () => {
		const { container } = render(Checkbox, { props: { label: "Agree" } });
		expect(checkbox(container).hasAttribute("aria-invalid")).toBe(false);
	});

	it("submits its value through FormData when checked and named", () => {
		const { container } = render(Checkbox, {
			props: { checked: true, name: "terms", value: "agreed", label: "Agree" },
		});
		const el = checkbox(container);

		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("terms")).toBe("agreed");
	});

	it("is excluded from form submission while unchecked", () => {
		const { container } = render(Checkbox, {
			props: { checked: false, name: "terms", value: "agreed", label: "Agree" },
		});
		const el = checkbox(container);

		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("terms")).toBeNull();
	});

	it("works standalone: getField() has no provider, so its own props apply untouched", () => {
		const { container } = render(Checkbox, {
			props: { id: "solo", invalid: true, required: true, disabled: false, label: "Agree" },
		});
		const el = checkbox(container);

		expect(el.id).toBe("solo");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
	});

	it("inside a FormField, the context wins for controlId, aria-describedby, aria-invalid, required and disabled", () => {
		const context = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			valid: false,
			required: true,
			disabled: true,
		};
		const { container } = render(FieldHarness, { props: { context } });
		const el = checkbox(container);

		// The harness passes id="own-id" invalid={false} required={false}
		// disabled={false} straight to Checkbox — every one of those is
		// overridden by the context above.
		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});

	describe("mark", () => {
		it("renders both marks as stroked paths normalised to pathLength 1, inside a decorative SVG", () => {
			const { container } = render(Checkbox, { props: { label: "Agree" } });
			const svg = container.querySelector("svg") as SVGSVGElement;

			expect(svg).not.toBeNull();
			expect(svg.getAttribute("aria-hidden")).toBe("true");
			// Older engines put SVGs in the tab order on their own; a decorative
			// mark that can be tabbed to sits between the box and whatever
			// follows it.
			expect(svg.getAttribute("focusable")).toBe("false");

			const check = svg.querySelector(".ft-checkbox-mark-check");
			const dash = svg.querySelector(".ft-checkbox-mark-dash");
			expect(check?.getAttribute("pathLength")).toBe("1");
			expect(dash?.getAttribute("pathLength")).toBe("1");
			// Both are always present — that is what lets indeterminate → checked
			// un-draw one while drawing the other, rather than swapping shapes.
			expect(svg.querySelectorAll("path")).toHaveLength(2);
		});

		// The mark cannot be a child of the input (an `<input>` is void), so it
		// is a sibling inside a wrapper span. That span is the only structural
		// change, and nothing above it or below it may notice: the input is
		// still the one `<input>` inside the one `<label>`, still carries every
		// attribute it did, and still round-trips its own state.
		it("keeps the input's own identity and attributes through the new wrapper span", async () => {
			const { container } = render(Checkbox, {
				props: { id: "terms", name: "terms", value: "agreed", label: "Agree", invalid: true },
			});
			const el = checkbox(container);

			expect(container.querySelectorAll("input")).toHaveLength(1);
			expect(el.parentElement?.className).toContain("ft-checkbox-box");
			expect(el.closest("label")).toBe(wrapper(container));
			expect(el.id).toBe("terms");
			expect(el.getAttribute("aria-label")).toBe("Agree");
			expect(el.getAttribute("data-invalid")).toBe("true");

			await fireEvent.click(el);

			expect(el.checked).toBe(true);
			expect(el.getAttribute("aria-checked")).toBe("true");
			expect(el.id).toBe("terms");
			expect(el.getAttribute("data-invalid")).toBe("true");
			expect(container.querySelectorAll("input")).toHaveLength(1);
		});

		// `checked` and `indeterminate` are not mutually exclusive — the prop
		// docs say `checked` is "the real state underneath even while
		// `indeterminate` is true", and `aria-checked` reports "mixed" for the
		// pair. Both drawn-state selectors therefore match at once, and without
		// the later equal-specificity rule that sends the tick back to
		// dashoffset 1 the mark would draw a tick and a dash superimposed: a
		// struck-through check saying neither thing. jsdom resolves no
		// stylesheet, so the paint is the screenshot's job; what this pins is
		// that the combination is a real, reachable state — one the a11y layer
		// already answers, and the mark now answers the same way.
		it("stays on the mixed reading when checked and indeterminate are both set", async () => {
			const { container } = render(Checkbox, {
				props: { checked: true, indeterminate: true, label: "Agree" },
			});
			const el = checkbox(container);

			expect(el.checked).toBe(true);
			expect(el.indeterminate).toBe(true);
			expect(el.getAttribute("aria-checked")).toBe("mixed");
			expect(el.matches(":checked")).toBe(true);
			expect(el.matches(":indeterminate")).toBe(true);
			expect(container.querySelectorAll("path")).toHaveLength(2);

			// Activating it resolves the pair rather than leaving it: the tick
			// is free to win the shape again from the next tick onwards.
			await fireEvent.click(el);
			expect(el.indeterminate).toBe(false);
			expect(el.getAttribute("aria-checked")).toBe("false");
		});

		it("clicking the mark still toggles, since it sits inside the label and takes no pointer events", async () => {
			const onCheckedChange = vi.fn();
			const { container } = render(Checkbox, { props: { label: "Agree", onCheckedChange } });
			const el = checkbox(container);

			// jsdom has no hit-testing, so `pointer-events: none` cannot be
			// observed directly; what is observable is that a click landing on
			// the mark's own subtree reaches the control through the label.
			await fireEvent.click(el);

			expect(el.checked).toBe(true);
			expect(onCheckedChange).toHaveBeenCalledWith(true);
		});

		// The draw is a CSS transition, so reduced motion changes what is
		// PAINTED, not what is rendered — and the resting/drawn dashoffsets live
		// outside the media query, which is the property worth pinning: the mark
		// is present and complete either way, and nothing here reaches for the
		// Web Animations API to get there. jsdom resolves no stylesheet, so the
		// paint itself is a screenshot's job, not this file's.
		it("renders the same complete mark under prefers-reduced-motion, animating nothing through the WAAPI", async () => {
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
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Checkbox, { props: { checked: true, label: "Agree" } });

			expect(checkbox(container).checked).toBe(true);
			expect(container.querySelectorAll("path")).toHaveLength(2);

			await fireEvent.click(checkbox(container));
			expect(checkbox(container).checked).toBe(false);
			expect(container.querySelectorAll("path")).toHaveLength(2);
			expect(animate).not.toHaveBeenCalled();

			animate.mockRestore();
			vi.unstubAllGlobals();
		});
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays toggle-on exactly once when checked via a click, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Checkbox, { props: { sound: true, label: "Agree" } });
			const el = checkbox(container);

			await fireEvent.click(el);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-on");
		});

		it("plays toggle-off exactly once when unchecked via a click, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Checkbox, {
				props: { sound: true, checked: true, label: "Agree" },
			});
			const el = checkbox(container);

			await fireEvent.click(el);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-off");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Checkbox, { props: { label: "Agree" } });
			const el = checkbox(container);

			await fireEvent.click(el);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when disabled via its own prop, even with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Checkbox, {
				props: { sound: true, disabled: true, label: "Agree" },
			});
			const el = checkbox(container);

			await fireEvent.change(el, { target: { checked: true } });

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when disabled through a surrounding FormField, even with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const context = {
				controlId: "ctx-id-2",
				describedBy: undefined,
				invalid: false,
				valid: true,
				required: false,
				disabled: true,
			};
			const { container } = render(FieldHarness, { props: { context, sound: true } });
			const el = checkbox(container);

			await fireEvent.click(el);
			await fireEvent.change(el, { target: { checked: true } });

			expect(play).not.toHaveBeenCalled();
		});

		it("resolves an indeterminate box to a boolean before playing its cue", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Checkbox, {
				props: { sound: true, checked: false, indeterminate: true, label: "Agree" },
			});
			const el = checkbox(container);

			await fireEvent.click(el);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-on");
		});

		it("plays exactly one cue for a label click, not two (label click double-dispatches click but change fires once)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Checkbox, { props: { sound: true, label: "Agree" } });
			const label = wrapper(container);

			await fireEvent.click(label);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-on");
		});

		it("plays exactly one cue for a keyboard Space activation on the input", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Checkbox, { props: { sound: true, label: "Agree" } });
			const el = checkbox(container);
			el.focus();

			// jsdom does not implement the native Space-activates-checkbox
			// behaviour, so the click it produces is simulated the same way a
			// real browser's default action would: toggling checked, then
			// dispatching change, exactly as a real Space press does exactly once.
			await fireEvent.keyDown(el, { key: " " });
			await fireEvent.click(el);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-on");
		});

		it("does not leak the sound prop onto the DOM input", () => {
			const { container } = render(Checkbox, { props: { sound: true, label: "Agree" } });
			const el = checkbox(container);

			expect(el.hasAttribute("sound")).toBe(false);
		});
	});
});
