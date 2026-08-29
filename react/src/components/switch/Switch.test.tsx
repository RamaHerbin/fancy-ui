import { render, cleanup, fireEvent } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Switch } from "./Switch.js";
import type { SwitchSize } from "./Switch.js";
import { FieldProvider } from "../../internals/field.js";
import type { FieldContext } from "../../internals/field.js";
import { sound } from "../../sound/sound.js";

function toggle(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

function wrapper(container: HTMLElement): HTMLLabelElement {
	return container.querySelector("label") as HTMLLabelElement;
}

/**
 * Transposed from the Svelte value harness: `bind:checked` becomes the
 * controlled checked/onCheckedChange pair — the harness owns the value,
 * writes it back from `onCheckedChange`, and echoes it into the DOM so a
 * test can prove `checked` travels back out to the consumer rather than
 * merely changing what the switch draws, and the same goes for the ref.
 */
function ValueHarness({ onCheckedChange }: { onCheckedChange?: (checked: boolean) => void }) {
	const [checked, setChecked] = useState(false);
	const el = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		el.current?.setAttribute("data-bound-ref", "yes");
	}, []);

	return (
		<>
			<Switch
				checked={checked}
				ref={el}
				onCheckedChange={(next) => {
					setChecked(next);
					onCheckedChange?.(next);
				}}
				label="Notifications"
			/>
			<span data-testid="bound-checked">{String(checked)}</span>
		</>
	);
}

/**
 * Transposed from the Svelte field harness: publishes a hand-built
 * FieldContext instead of rendering a real FormField — this wave's
 * components are built against the frozen FieldContext surface, not against
 * each other, so a fake provider here is the one way to test the consumer
 * side in isolation. Deliberately passes own props that disagree with the
 * context, so a test can prove the context wins rather than merely matching
 * by coincidence.
 */
function FieldHarness({ context }: { context: FieldContext }) {
	return (
		<FieldProvider value={context}>
			<Switch id="own-id" required={false} disabled={false} label="Notifications" />
		</FieldProvider>
	);
}

describe("Switch", () => {
	afterEach(cleanup);

	it("renders a real checkbox input with role=switch, off by default", () => {
		const { container } = render(<Switch label="Notifications" />);
		const el = toggle(container);

		expect(el.tagName).toBe("INPUT");
		expect(el.type).toBe("checkbox");
		expect(el.getAttribute("role")).toBe("switch");
		expect(el.checked).toBe(false);
		expect(el.getAttribute("aria-checked")).toBe("false");
	});

	it("renders the on mockup state distinctly from off, via the checked property and aria-checked", () => {
		const { container } = render(<Switch defaultChecked label="Notifications" />);
		const el = toggle(container);

		expect(el.checked).toBe(true);
		expect(el.getAttribute("aria-checked")).toBe("true");
	});

	it.each(["sm", "md", "lg"] as SwitchSize[])(
		"carries its size (%s) as data-size, which the colocated stylesheet keys the track/knob geometry off",
		(size) => {
			const { container } = render(<Switch size={size} label="Notifications" />);
			expect(toggle(container).getAttribute("data-size")).toBe(size);
		}
	);

	it("defaults to the md size", () => {
		const { container } = render(<Switch label="Notifications" />);
		expect(toggle(container).getAttribute("data-size")).toBe("md");
	});

	it("disables the field: native disabled, dimmed wrapper, position/knob still perceivable via data-size geometry", () => {
		const { container } = render(<Switch disabled label="Notifications" />);
		const el = toggle(container);
		const label = wrapper(container);

		expect(el.disabled).toBe(true);
		expect(label.className).toContain("opacity-50");
		expect(label.className).toContain("cursor-not-allowed");
	});

	it("calls onCheckedChange exactly once with the new value on each toggle", () => {
		const onCheckedChange = vi.fn();
		const { container } = render(
			<Switch defaultChecked={false} onCheckedChange={onCheckedChange} label="Notifications" />
		);
		const el = toggle(container);

		fireEvent.click(el);
		expect(el.checked).toBe(true);
		expect(onCheckedChange).toHaveBeenCalledTimes(1);
		expect(onCheckedChange).toHaveBeenCalledWith(true);

		fireEvent.click(el);
		expect(el.checked).toBe(false);
		expect(onCheckedChange).toHaveBeenCalledTimes(2);
		expect(onCheckedChange).toHaveBeenLastCalledWith(false);
	});

	it("works with a plain non-bound checked plus a callback", () => {
		const onCheckedChange = vi.fn();
		const { container } = render(
			<Switch defaultChecked={false} onCheckedChange={onCheckedChange} label="Notifications" />
		);
		const el = toggle(container);

		expect(el.checked).toBe(false);
		fireEvent.click(el);
		expect(el.checked).toBe(true);
		expect(onCheckedChange).toHaveBeenCalledWith(true);
	});

	it("works uncontrolled, with neither checked nor onCheckedChange passed in", () => {
		const { container } = render(<Switch label="Notifications" />);
		const el = toggle(container);

		expect(el.checked).toBe(false);
		fireEvent.click(el);
		expect(el.checked).toBe(true);
	});

	it("blocks both the state change and the callback while disabled, via a synthetic event that bypasses the native guard", () => {
		const onCheckedChange = vi.fn();
		const { container } = render(
			<Switch
				defaultChecked={false}
				disabled
				onCheckedChange={onCheckedChange}
				label="Notifications"
			/>
		);
		const el = toggle(container);
		expect(el.disabled).toBe(true);

		// Mutating the DOM property directly and dispatching a click reaches
		// the handler regardless of the native `disabled` guard on real
		// interaction — proving the component's own guard, not the attribute,
		// is what stops the state from moving. (The Svelte suite dispatched a
		// raw `change`; React's checkbox change detection rides on `click`.)
		el.checked = true;
		fireEvent.click(el);

		expect(el.checked).toBe(false);
		expect(onCheckedChange).not.toHaveBeenCalled();
	});

	it("round-trips checked through the controlled checked/onCheckedChange pair", () => {
		const { container, getByTestId } = render(<ValueHarness />);
		const el = toggle(container);

		expect(getByTestId("bound-checked").textContent).toBe("false");
		fireEvent.click(el);
		expect(getByTestId("bound-checked").textContent).toBe("true");
		expect(el.checked).toBe(true);
	});

	it("round-trips the input element through the ref channel", () => {
		const { container } = render(<ValueHarness />);
		expect(toggle(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("resolves the accessible name from the label prop when there is no visible children text", () => {
		const { container } = render(<Switch label="Notifications" />);
		expect(toggle(container).getAttribute("aria-label")).toBe("Notifications");
	});

	it("falls through to children's own text as the accessible name when label is not given", () => {
		const { container } = render(
			<Switch>
				<span>Notifications</span>
			</Switch>
		);
		const el = toggle(container);

		expect(el.hasAttribute("aria-label")).toBe(false);
		expect(wrapper(container).textContent).toContain("Notifications");
	});

	it("applies label as aria-label even alongside icon-only children with no text of their own", () => {
		// The component cannot introspect an arbitrary ReactNode to tell
		// whether it renders text, so `label` must win whenever it is passed —
		// this is exactly the icon-only-children-plus-label case the prop
		// exists for.
		const { container } = render(
			<Switch label="Notifications">
				<svg aria-hidden="true"></svg>
			</Switch>
		);
		expect(toggle(container).getAttribute("aria-label")).toBe("Notifications");
	});

	it("merges the className prop onto the wrapping label", () => {
		const { container } = render(<Switch className="mt-4" label="Notifications" />);
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
		const { container } = render(<FieldHarness context={context} />);
		expect(toggle(container).getAttribute("aria-invalid")).toBe("true");
	});

	it("leaves aria-invalid unset by default", () => {
		const { container } = render(<Switch label="Notifications" />);
		expect(toggle(container).hasAttribute("aria-invalid")).toBe(false);
	});

	it("submits its value through FormData when on and named", () => {
		const { container } = render(
			<Switch defaultChecked name="notifications" value="on" label="Notifications" />
		);
		const el = toggle(container);

		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("notifications")).toBe("on");
	});

	it("is excluded from form submission while off", () => {
		const { container } = render(
			<Switch defaultChecked={false} name="notifications" value="on" label="Notifications" />
		);
		const el = toggle(container);

		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("notifications")).toBeNull();
	});

	it("works standalone: useField() has no provider, so its own props apply untouched", () => {
		const { container } = render(
			<Switch id="solo" required disabled={false} label="Notifications" />
		);
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
		const { container } = render(<FieldHarness context={context} />);
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

	// The knob's slide is the only motion in this component and it is entirely
	// CSS: the `translateX` that puts the knob at the far end of the track is
	// declared outside `@media (prefers-reduced-motion: no-preference)`, and
	// only the transition that animates the trip lives inside it — so under the
	// preference the knob still lands in the right place, it just snaps. jsdom
	// computes neither a media block nor a `::after`, so what a test can honestly
	// pin is the contract the CSS keys off: `checked` / `aria-checked` /
	// `data-size` flip exactly when they did, gated on nothing.
	it("reduced motion: the checked and size contract driving the knob is unchanged", () => {
		// Discriminating stub: `(prefers-reduced-motion: reduce)` and
		// `(prefers-reduced-motion: no-preference)` are complementary, so a blanket
		// `matches: true` would answer yes to both and silently satisfy either branch
		// the moment this component grows a reduced-motion read. Matching on
		// the substring "reduce" does NOT discriminate — "prefers-reduced-motion"
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
			const { container } = render(
				<Switch
					defaultChecked={false}
					size="lg"
					onCheckedChange={onCheckedChange}
					label="Notifications"
				/>
			);
			const el = toggle(container);

			expect(el.getAttribute("data-size")).toBe("lg");

			fireEvent.click(el);

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

		it("plays toggle-on exactly once when switched on via a click, with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Switch sound label="Notifications" />);
			const el = toggle(container);

			fireEvent.click(el);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-on", undefined);
		});

		it("plays toggle-off exactly once when switched off via a click, with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Switch sound defaultChecked label="Notifications" />);
			const el = toggle(container);

			fireEvent.click(el);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-off", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Switch label="Notifications" />);
			const el = toggle(container);

			fireEvent.click(el);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when disabled via its own prop, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Switch sound disabled label="Notifications" />);
			const el = toggle(container);

			// The synthetic route past the native guard, as in the disabled
			// state test above.
			el.checked = true;
			fireEvent.click(el);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when disabled through a surrounding FormField, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const context: FieldContext = {
				controlId: "ctx-id-2",
				describedBy: undefined,
				invalid: false,
				valid: true,
				required: false,
				disabled: true,
			};
			// FieldHarness renders <Switch> with no `sound` prop of its own, so
			// this proves the disabled guard specifically.
			render(<FieldHarness context={context} />);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays exactly one cue for a label click, not two (label click double-dispatches click but change fires once)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Switch sound label="Notifications" />);
			const label = wrapper(container);

			fireEvent.click(label);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-on", undefined);
		});

		it("plays exactly one cue for a keyboard Space activation on the input", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Switch sound label="Notifications" />);
			const el = toggle(container);
			el.focus();

			// jsdom does not implement the native Space-activates-checkbox
			// behaviour; a real browser's default action for Space fires exactly
			// one click, which is simulated directly here.
			fireEvent.keyDown(el, { key: " " });
			fireEvent.click(el);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-on", undefined);
		});

		it("does not leak the sound prop onto the DOM input", () => {
			const { container } = render(<Switch sound label="Notifications" />);
			const el = toggle(container);

			expect(el.hasAttribute("sound")).toBe(false);
		});
	});
});
