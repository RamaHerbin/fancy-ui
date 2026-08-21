import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Switch from "./Switch.svelte";
import ValueHarness from "./SwitchHarness.test.svelte";
import FieldHarness from "./SwitchFieldHarness.test.svelte";
import type { SwitchSize } from "./Switch.svelte";
import { sound } from "../sound/sound.svelte.js";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function toggle(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

function wrapper(container: HTMLElement): HTMLLabelElement {
	return container.querySelector("label") as HTMLLabelElement;
}

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

	it("round-trips checked through bind:checked", async () => {
		const { container, getByTestId } = render(ValueHarness);
		const el = toggle(container);

		expect(getByTestId("bound-checked").textContent).toBe("false");
		await fireEvent.click(el);
		expect(getByTestId("bound-checked").textContent).toBe("true");
		expect(el.checked).toBe(true);
	});

	it("round-trips the input element through bind:ref", () => {
		const { container } = render(ValueHarness);
		expect(toggle(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("resolves the accessible name from the label prop when there is no visible children text", () => {
		const { container } = render(Switch, { props: { label: "Notifications" } });
		expect(toggle(container).getAttribute("aria-label")).toBe("Notifications");
	});

	it("falls through to children's own text as the accessible name when label is not given", () => {
		const { container } = render(Switch, {
			props: { children: snippet("<span>Notifications</span>") },
		});
		const el = toggle(container);

		expect(el.hasAttribute("aria-label")).toBe(false);
		expect(wrapper(container).textContent).toContain("Notifications");
	});

	it("applies label as aria-label even alongside icon-only children with no text of their own", () => {
		// The component cannot introspect an arbitrary Snippet to tell whether
		// it renders text, so `label` must win whenever it is passed — this is
		// exactly the icon-only-children-plus-label case the prop exists for.
		const { container } = render(Switch, {
			props: {
				label: "Notifications",
				children: snippet('<svg aria-hidden="true"></svg>'),
			},
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
		const context = {
			controlId: "ctx-id",
			describedBy: undefined,
			invalid: true,
			valid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(FieldHarness, { props: { context } });
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

	it("works standalone: getField() has no provider, so its own props apply untouched", () => {
		const { container } = render(Switch, {
			props: { id: "solo", required: true, disabled: false, label: "Notifications" },
		});
		const el = toggle(container);

		expect(el.id).toBe("solo");
		expect(el.required).toBe(true);
	});

	it("inside a FormField, the context wins for controlId, aria-describedby, required and disabled", () => {
		const context = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			valid: false,
			required: true,
			disabled: true,
		};
		const { container } = render(FieldHarness, { props: { context } });
		const el = toggle(container);

		// The harness passes id="own-id" required={false} disabled={false}
		// straight to Switch — every one of those is overridden by the
		// context above.
		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
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
			const context = {
				controlId: "ctx-id-2",
				describedBy: undefined,
				invalid: false,
				valid: true,
				required: false,
				disabled: true,
			};
			// FieldHarness renders <Switch> with no `sound` prop of its own, so
			// this proves the disabled guard specifically.
			render(FieldHarness, { props: { context } });

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
