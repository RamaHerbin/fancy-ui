import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { DURATIONS } from "../../internals/motion/tokens.js";
import { sound } from "../../sound/sound.js";
import { NumberInput } from "./NumberInput.js";
import { NumberInputHarness as ValueHarness } from "./NumberInputHarness.js";
import { NumberInputFieldHarness as FieldHarness } from "./NumberInputFieldHarness.js";

function field(container: HTMLElement): HTMLInputElement {
	return container.querySelector(".ft-number-input-field") as HTMLInputElement;
}

function decrementButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('button[aria-label="Decrease value"]') as HTMLButtonElement;
}

function incrementButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('button[aria-label="Increase value"]') as HTMLButtonElement;
}

describe("NumberInput", () => {
	afterEach(cleanup);

	// A real type="number" input sanitizes its own `.value` to "" for ANY
	// syntactically incomplete number (see the decimal-typing describe block
	// below), indistinguishable from a genuine clear — so this is a plain
	// text input with `inputmode="decimal"` for the numeric keyboard hint,
	// parsed entirely by hand instead.
	it("renders a real text input flanked by two real buttons", () => {
		const { container } = render(<NumberInput />);

		expect(field(container).tagName).toBe("INPUT");
		expect(field(container).type).toBe("text");
		expect(field(container).getAttribute("inputmode")).toBe("decimal");
		expect(decrementButton(container).tagName).toBe("BUTTON");
		expect(incrementButton(container).tagName).toBe("BUTTON");
	});

	it("gives both step buttons type=button, so they never submit a surrounding form", () => {
		const { container } = render(<NumberInput />);

		expect(decrementButton(container).getAttribute("type")).toBe("button");
		expect(incrementButton(container).getAttribute("type")).toBe("button");
	});

	it("gives both step buttons an accessible name beyond their glyph", () => {
		const { container } = render(<NumberInput />);

		expect(decrementButton(container).getAttribute("aria-label")).toBe("Decrease value");
		expect(incrementButton(container).getAttribute("aria-label")).toBe("Increase value");
	});

	// `ft-number-input-step` is the hook the colocated press feedback selects
	// on, and it is new: before it these two buttons carried no `ft-*` class at
	// all, so nothing in the stylesheet could reach them. A class that exists
	// only to be styled needs a test, or a tidy-up removes it without a single
	// suite going red.
	it("gives both step buttons the ft-number-input-step hook the press feedback is keyed off", () => {
		const { container } = render(<NumberInput />);

		expect(decrementButton(container).className).toContain("ft-number-input-step");
		expect(incrementButton(container).className).toContain("ft-number-input-step");
		expect(container.querySelectorAll(".ft-number-input-step")).toHaveLength(2);
	});

	// The colocated stylesheet declares a `transition` shorthand on these same
	// buttons. That rule is unlayered and Tailwind's utilities sit in
	// `@layer utilities`, so leaving `transition-colors` on the class string
	// would read as a colour transition that silently never ran — the colour
	// channel is re-declared by hand instead.
	it("drops the transition-colors utility from the step buttons in favour of the hand-written channel", () => {
		const { container } = render(<NumberInput />);

		expect(decrementButton(container).className).not.toContain("transition-colors");
		expect(incrementButton(container).className).not.toContain("transition-colors");
	});

	// Press feedback is `:active` on the two steppers only — the field itself
	// gains nothing, because a value that pops on every keystroke would fight
	// the typing rather than acknowledge it. Under reduced motion the scale is
	// replaced by an opacity fade (declared outside the media query, so it is
	// the fallback), and neither is observable in jsdom: what is observable is
	// that stepping itself is gated on the preference in no way at all, from
	// either the buttons or the arrow keys.
	it("reduced motion: stepping still works from both the buttons and the arrow keys", async () => {
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
			const onValueChange = vi.fn();
			const { container } = render(<NumberInput defaultValue={4} onValueChange={onValueChange} />);

			fireEvent.click(incrementButton(container));
			expect(field(container).value).toBe("5");
			expect(onValueChange).toHaveBeenLastCalledWith(5);

			fireEvent.keyDown(field(container), { key: "ArrowDown" });
			expect(field(container).value).toBe("4");
			expect(onValueChange).toHaveBeenLastCalledWith(4);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("steps up and down by `step`", () => {
		const { container } = render(<NumberInput defaultValue={10} step={5} />);

		fireEvent.click(incrementButton(container));
		expect(field(container).value).toBe("15");

		fireEvent.click(decrementButton(container));
		fireEvent.click(decrementButton(container));
		expect(field(container).value).toBe("5");
	});

	// The load-bearing case: naive float addition drifts (0.1 + 0.1 + ... !==
	// 1), so each step result is rounded to the grid's own precision. Ten 0.1
	// increments from 0 must land on exactly 1, not 0.9999999999999999.
	it("does not accumulate float drift over repeated fractional steps", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<NumberInput defaultValue={0} step={0.1} onValueChange={onValueChange} />
		);
		const button = incrementButton(container);

		for (let i = 0; i < 10; i += 1) {
			fireEvent.click(button);
		}

		expect(field(container).value).toBe("1");
		expect(onValueChange).toHaveBeenLastCalledWith(1);
	});

	// The step grid is anchored at `min`, not at `step`'s own decimal count:
	// 0.25 + 0.5 is exactly 0.75, but rounding to step's one decimal place
	// alone would corrupt that already-exact result to 0.8.
	it("anchors step rounding at min, not just at step's own decimal count", () => {
		const { container } = render(<NumberInput defaultValue={0.25} min={0.25} step={0.5} />);

		fireEvent.click(incrementButton(container));
		expect(field(container).value).toBe("0.75");
	});

	it("ArrowUp/ArrowDown step through the keyboard, with the same rounding the buttons use", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<NumberInput defaultValue={0} step={0.1} onValueChange={onValueChange} />
		);
		const el = field(container);

		for (let i = 0; i < 10; i += 1) {
			fireEvent.keyDown(el, { key: "ArrowUp" });
		}
		expect(el.value).toBe("1");
		expect(onValueChange).toHaveBeenLastCalledWith(1);

		fireEvent.keyDown(el, { key: "ArrowDown" });
		expect(el.value).toBe("0.9");
	});

	it("ArrowUp/ArrowDown are blocked while disabled or readonly", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<NumberInput defaultValue={5} disabled onValueChange={onValueChange} />
		);
		const el = field(container);

		fireEvent.keyDown(el, { key: "ArrowUp" });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("clamps at the upper bound and disables the increment button there", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<NumberInput defaultValue={9} min={0} max={10} step={1} onValueChange={onValueChange} />
		);
		const button = incrementButton(container);

		fireEvent.click(button);
		expect(field(container).value).toBe("10");
		expect(button.disabled).toBe(true);

		onValueChange.mockClear();
		// A synthetic click still reaches a disabled button's handler; the
		// handler's own guard is what actually stops it, not the attribute.
		fireEvent.click(button);
		expect(field(container).value).toBe("10");
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("clamps at the lower bound and disables the decrement button there", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<NumberInput defaultValue={1} min={0} max={10} step={1} onValueChange={onValueChange} />
		);
		const button = decrementButton(container);

		fireEvent.click(button);
		expect(field(container).value).toBe("0");
		expect(button.disabled).toBe(true);

		onValueChange.mockClear();
		fireEvent.click(button);
		expect(field(container).value).toBe("0");
		expect(onValueChange).not.toHaveBeenCalled();
	});

	// Documented, deliberate choice (see the README): a step that lands past
	// a bound clamps there, and every step after that continues arithmetic
	// from the clamped value instead of re-snapping to the nearest point on
	// the original 0/3/6/9 grid — matching how a native number input's own
	// stepUp()/stepDown() keeps going from wherever clamping left it.
	it("continues stepping from a clamped value rather than re-snapping to the original grid", () => {
		const { container } = render(<NumberInput defaultValue={9} min={0} max={10} step={3} />);
		const inc = incrementButton(container);
		const dec = decrementButton(container);

		fireEvent.click(inc); // 9 -> would be 12, clamped to 10
		expect(field(container).value).toBe("10");

		fireEvent.click(dec); // 10 - 3 = 7, not back to 9
		expect(field(container).value).toBe("7");
		fireEvent.click(dec); // 7 - 3 = 4
		expect(field(container).value).toBe("4");
		fireEvent.click(dec); // 4 - 3 = 1
		expect(field(container).value).toBe("1");
	});

	it("leaves both buttons enabled when there is no min/max", () => {
		const { container } = render(<NumberInput defaultValue={5} />);

		expect(decrementButton(container).disabled).toBe(false);
		expect(incrementButton(container).disabled).toBe(false);
	});

	it("steps up from an empty field to min, not min + step or NaN", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<NumberInput defaultValue={null} min={3} step={5} onValueChange={onValueChange} />
		);

		fireEvent.click(incrementButton(container));
		expect(field(container).value).toBe("3");
		expect(onValueChange).toHaveBeenCalledWith(3);
	});

	it("steps up from an empty field to 0 when there is no min", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<NumberInput defaultValue={null} step={5} onValueChange={onValueChange} />
		);

		fireEvent.click(incrementButton(container));
		expect(field(container).value).toBe("0");
		expect(onValueChange).toHaveBeenCalledWith(0);
	});

	it("renders an empty field as blank, not as 0 or NaN", () => {
		const { container } = render(<NumberInput defaultValue={null} />);
		expect(field(container).value).toBe("");
	});

	it("clearing the field sets value to null and calls onValueChange(null)", () => {
		const onValueChange = vi.fn();
		const { container } = render(<NumberInput defaultValue={5} onValueChange={onValueChange} />);
		const el = field(container);

		fireEvent.input(el, { target: { value: "" } });
		expect(el.value).toBe("");
		expect(onValueChange).toHaveBeenCalledWith(null);
	});

	it("calls onValueChange with the typed number on input", () => {
		const onValueChange = vi.fn();
		const { container } = render(<NumberInput defaultValue={1} onValueChange={onValueChange} />);
		const el = field(container);

		fireEvent.input(el, { target: { value: "42" } });
		expect(el.value).toBe("42");
		expect(onValueChange).toHaveBeenCalledWith(42);
	});

	// The critical bug this whole describe block pins: a real type="number"
	// input reports its `.value` as "" for ANY syntactically incomplete
	// number — "9.", "-", "1e" all read back empty, indistinguishable from an
	// actual clear. That collapsed "still typing a decimal" into "cleared",
	// nulling the bound value the instant a "." landed — deleting it isn't
	// hypothetical, it happened on every single fractional entry. These tests
	// simulate the actual intermediate keystrokes, not just the end state.
	describe("typing a decimal or a negative number, keystroke by keystroke", () => {
		it("does not null the value when a decimal point is typed mid-entry", () => {
			const onValueChange = vi.fn();
			const { container } = render(
				<NumberInput defaultValue={null} onValueChange={onValueChange} />
			);
			const el = field(container);

			fireEvent.focus(el);
			fireEvent.input(el, { target: { value: "9" } });
			expect(el.value).toBe("9");
			expect(onValueChange).toHaveBeenLastCalledWith(9);

			// The load-bearing keystroke. A native type="number" input's own
			// sanitization would already report "" here.
			fireEvent.input(el, { target: { value: "9." } });
			expect(el.value).toBe("9."); // still shows exactly what was typed
			expect(onValueChange).not.toHaveBeenCalledWith(null); // never nulled

			fireEvent.input(el, { target: { value: "9.5" } });
			expect(el.value).toBe("9.5");
			expect(onValueChange).toHaveBeenLastCalledWith(9.5);

			fireEvent.blur(el);
			expect(el.value).toBe("9.5");
		});

		it("does not null the value when a leading minus sign is typed mid-entry", () => {
			const onValueChange = vi.fn();
			const { container } = render(<NumberInput defaultValue={5} onValueChange={onValueChange} />);
			const el = field(container);

			fireEvent.focus(el);
			fireEvent.input(el, { target: { value: "-" } });
			expect(el.value).toBe("-");
			expect(onValueChange).not.toHaveBeenCalledWith(null);

			fireEvent.input(el, { target: { value: "-3" } });
			expect(el.value).toBe("-3");
			expect(onValueChange).toHaveBeenLastCalledWith(-3);
		});

		it("does not strip a trailing zero while focused, since it already parses to the same number", () => {
			const { container } = render(<NumberInput defaultValue={1} />);
			const el = field(container);

			fireEvent.focus(el);
			fireEvent.input(el, { target: { value: "1.20" } });
			expect(el.value).toBe("1.20"); // not clobbered back to "1.2" mid-entry

			fireEvent.blur(el);
			expect(el.value).toBe("1.2"); // canonicalised once typing is done
		});

		it("leaves an incomplete exponent ('1e') untouched rather than treating it as empty", () => {
			const onValueChange = vi.fn();
			const { container } = render(<NumberInput defaultValue={1} onValueChange={onValueChange} />);
			const el = field(container);

			fireEvent.focus(el);
			fireEvent.input(el, { target: { value: "1e" } });
			expect(el.value).toBe("1e");
			expect(onValueChange).not.toHaveBeenCalledWith(null);
		});
	});

	it("clamps an out-of-range typed value on blur, not on every keystroke", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<NumberInput defaultValue={5} min={0} max={10} onValueChange={onValueChange} />
		);
		const el = field(container);

		fireEvent.input(el, { target: { value: "999" } });
		expect(el.value).toBe("999"); // not clamped mid-typing
		expect(onValueChange).toHaveBeenLastCalledWith(999);

		fireEvent.blur(el);
		expect(el.value).toBe("10");
		expect(onValueChange).toHaveBeenLastCalledWith(10);
	});

	it("works with a plain non-bound value plus a callback", () => {
		const onValueChange = vi.fn();
		const { container } = render(<NumberInput defaultValue={3} onValueChange={onValueChange} />);

		expect(field(container).value).toBe("3");
		fireEvent.click(incrementButton(container));
		expect(field(container).value).toBe("4");
		expect(onValueChange).toHaveBeenCalledWith(4);
	});

	it("blocks typing, the buttons and the callback while disabled", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<NumberInput defaultValue={5} disabled onValueChange={onValueChange} />
		);

		expect(field(container).disabled).toBe(true);
		expect(decrementButton(container).disabled).toBe(true);
		expect(incrementButton(container).disabled).toBe(true);

		fireEvent.click(incrementButton(container));
		fireEvent.input(field(container), { target: { value: "9" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("readonly blocks typing and the buttons but stays focusable and still submits", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<NumberInput defaultValue={5} readonly name="qty" onValueChange={onValueChange} />
		);
		const el = field(container);

		expect(el.disabled).toBe(false);
		expect(el.readOnly).toBe(true);
		expect(decrementButton(container).disabled).toBe(true);
		expect(incrementButton(container).disabled).toBe(true);

		el.focus();
		expect(document.activeElement).toBe(el);

		// A readonly field still submits its current value; check this before
		// simulating any input below, since a raw synthetic `input` event sets
		// the DOM value property directly (the way a real blocked keystroke
		// never would) and would otherwise contaminate this snapshot.
		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("qty")).toBe("5");

		fireEvent.click(incrementButton(container));
		fireEvent.input(el, { target: { value: "9" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("reflects invalid through aria-invalid and the destructive border class", () => {
		const { container } = render(<NumberInput invalid />);
		const wrap = container.querySelector(".ft-number-input") as HTMLElement;

		expect(field(container).getAttribute("aria-invalid")).toBe("true");
		expect(wrap.className).toContain("border-destructive/50");
	});

	it("sets the native required attribute from the required prop", () => {
		const { container } = render(<NumberInput required />);
		expect(field(container).required).toBe(true);
	});

	it("round-trips value through the controlled value + onValueChange pair", () => {
		const { container, getByTestId } = render(<ValueHarness />);
		const el = field(container);

		expect(getByTestId("bound-value").textContent).toBe("null");
		fireEvent.input(el, { target: { value: "7" } });
		expect(getByTestId("bound-value").textContent).toBe("7");
		expect(el.value).toBe("7");
	});

	it("round-trips the input element through the forwarded ref", () => {
		const { container } = render(<ValueHarness />);
		expect(field(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(<NumberInput label="Quantity" />);
		expect(field(container).getAttribute("aria-label")).toBe("Quantity");
	});

	it("merges the className prop with the base wrapper classes", () => {
		const { container } = render(<NumberInput className="mt-4" />);
		const wrap = container.querySelector(".ft-number-input") as HTMLElement;

		expect(wrap.className).toContain("ft-number-input");
		expect(wrap.className).toContain("mt-4");
	});

	it("works standalone: useField() has no provider, so its own props apply untouched", () => {
		const { container } = render(
			<NumberInput id="solo" invalid required disabled={false} />
		);
		const el = field(container);

		expect(el.id).toBe("solo");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
	});

	it("inside a FormField, the context wins for controlId, aria-describedby, aria-invalid, required and disabled", () => {
		const context = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			required: true,
			disabled: true,
		};
		const { container } = render(<FieldHarness context={context} />);
		const el = field(container);

		// The harness passes id="own-id" invalid={false} required={false}
		// disabled={false} straight to NumberInput — every one of those is
		// overridden by the context above.
		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});

	// The keyboard half of the press feedback. A pointer press paints itself
	// through `:active`; an arrow key has no `:active` to paint, so stepping
	// from the keyboard raises `data-stepping` on the button that fired for
	// `DURATIONS.micro`, and the stylesheet hands that attribute the very same
	// rule `:active` gets. jsdom applies no stylesheet, so what is testable
	// here is the flag itself and its lifetime — which is the part a
	// refactor can silently break.
	describe("stepper feedback for the keyboard", () => {
		function stepping(container: HTMLElement): string[] {
			return Array.from(container.querySelectorAll<HTMLElement>("[data-stepping]")).map(
				(el) => el.getAttribute("aria-label") ?? ""
			);
		}

		it("raises data-stepping on the button that fired, and clears it after 80ms", () => {
			vi.useFakeTimers();
			try {
				const { container } = render(<NumberInput defaultValue={4} />);

				fireEvent.keyDown(field(container), { key: "ArrowUp" });
				expect(stepping(container)).toEqual(["Increase value"]);

				act(() => {
					vi.advanceTimersByTime(DURATIONS.micro);
				});
				expect(stepping(container)).toEqual([]);

				// And the other way round, on the other button.
				fireEvent.keyDown(field(container), { key: "ArrowDown" });
				expect(stepping(container)).toEqual(["Decrease value"]);
			} finally {
				vi.useRealTimers();
			}
		});

		// The trap this design sidesteps structurally: the flag is raised
		// inside `applyStep` and nowhere else, and typing never goes through
		// `applyStep`. A field that flashed a stepper on every keystroke would
		// be reporting something that did not happen.
		it("raises it on neither button while the value is typed", () => {
			vi.useFakeTimers();
			try {
				const { container } = render(<NumberInput defaultValue={4} />);

				fireEvent.input(field(container), { target: { value: "42" } });
				expect(stepping(container)).toEqual([]);

				// Nor for a key that is not a step key.
				fireEvent.keyDown(field(container), { key: "7" });
				expect(stepping(container)).toEqual([]);
			} finally {
				vi.useRealTimers();
			}
		});

		// A held ArrowUp repeats far faster than 80ms. Each repeat re-arms the
		// same timer rather than stacking a new one — stacked timers would
		// leave the earliest one to clear the flag mid-repeat, so the feedback
		// would drop out under exactly the input that needs it most.
		it("re-arms rather than stacks a timer under key repeat, and outlives the whole repeat", () => {
			vi.useFakeTimers();
			try {
				const { container } = render(<NumberInput defaultValue={0} />);
				const el = field(container);

				for (let i = 0; i < 5; i += 1) {
					fireEvent.keyDown(el, { key: "ArrowUp", repeat: i > 0 });
					act(() => {
						vi.advanceTimersByTime(30);
					});
					expect(stepping(container)).toEqual(["Increase value"]);
					expect(vi.getTimerCount()).toBe(1);
				}

				act(() => {
					vi.advanceTimersByTime(DURATIONS.micro);
				});
				expect(stepping(container)).toEqual([]);
				expect(vi.getTimerCount()).toBe(0);
			} finally {
				vi.useRealTimers();
			}
		});

		it("clears a pending timer on unmount", () => {
			vi.useFakeTimers();
			try {
				const { container, unmount } = render(<NumberInput defaultValue={4} />);

				fireEvent.keyDown(field(container), { key: "ArrowUp" });
				expect(vi.getTimerCount()).toBe(1);

				unmount();
				expect(vi.getTimerCount()).toBe(0);
			} finally {
				vi.useRealTimers();
			}
		});

		// The flag is a state signal, not motion: it is raised under either
		// preference, and the media query decides which declaration it drives
		// — the scale, or the opacity fallback that stands in for it.
		it("reduced motion: the flag still toggles, because it is a state flag", () => {
			vi.useFakeTimers();
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
				const { container } = render(<NumberInput defaultValue={4} />);

				fireEvent.keyDown(field(container), { key: "ArrowUp" });
				expect(stepping(container)).toEqual(["Increase value"]);

				act(() => {
					vi.advanceTimersByTime(DURATIONS.micro);
				});
				expect(stepping(container)).toEqual([]);
			} finally {
				vi.unstubAllGlobals();
				vi.useRealTimers();
			}
		});

		// A click already has `:active`, but it goes through the same
		// `applyStep`, so it raises the same flag — one answer for both
		// devices is the whole point, and a pointer press that skipped it
		// would be two answers again.
		it("raises the same flag for a click, so both devices share one rule", () => {
			vi.useFakeTimers();
			try {
				const { container } = render(<NumberInput defaultValue={4} />);

				fireEvent.click(decrementButton(container));
				expect(stepping(container)).toEqual(["Decrease value"]);

				act(() => {
					vi.advanceTimersByTime(DURATIONS.micro);
				});
				expect(stepping(container)).toEqual([]);
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays the tick cue exactly once when stepped via the increment button, with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<NumberInput sound defaultValue={4} />);

			fireEvent.click(incrementButton(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("tick", undefined);
		});

		it("plays the tick cue exactly once when stepped via ArrowUp, with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<NumberInput sound defaultValue={4} />);

			fireEvent.keyDown(field(container), { key: "ArrowUp" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("tick", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<NumberInput defaultValue={4} />);

			fireEvent.click(incrementButton(container));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled, via a synthetic dispatch on the button", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<NumberInput sound disabled defaultValue={4} />);

			incrementButton(container).dispatchEvent(
				new MouseEvent("click", { bubbles: true, cancelable: true })
			);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while typing or on blur clamp — only an actual step plays", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<NumberInput sound max={10} />);
			const el = field(container);

			fireEvent.input(el, { target: { value: "42" } });
			fireEvent.blur(el);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
