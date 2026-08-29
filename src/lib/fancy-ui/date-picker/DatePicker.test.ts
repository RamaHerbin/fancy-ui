import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import DatePicker from "./DatePicker.svelte";
import ValueHarness from "./DatePickerHarness.test.svelte";
import FieldHarness from "./DatePickerFieldHarness.test.svelte";
import { dismissable } from "../_internals/dismissable.js";

function trigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector(".ft-date-picker-trigger") as HTMLButtonElement;
}

function panel(): HTMLElement | null {
	// Portalled to document.body, not inside `container`.
	return document.querySelector(".ft-date-picker-panel");
}

function cellFor(iso: string): HTMLElement | null {
	return document.querySelector(`[data-ft-date="${iso}"]`);
}

function focusedCell(): HTMLElement | null {
	return document.querySelector('[data-ft-date][tabindex="0"]');
}

function announcement(): string {
	return document.querySelector('[role="status"]')?.textContent ?? "";
}

/** Replaces `window.matchMedia` wholesale. The panel's entrance reads the
 * preference fresh at the instant the transition starts, so an override
 * installed before the panel opens is the one it sees. */
function stubReducedMotion(matches: boolean): void {
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
 * tick of its own. The exit window is two microtasks under the WAAPI stub, so
 * anything awaited between the dismiss and the assertion has already drained
 * it and the test would pass for the wrong reason. */
function pressEscape(): void {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

describe("DatePicker", () => {
	afterEach(() => {
		cleanup();
		document.querySelectorAll(".ft-date-picker-panel").forEach((el) => el.remove());
		vi.unstubAllGlobals();
		// A spy on `Element.prototype.animate` has to be fresh in every test:
		// `vi.spyOn` on an already-mocked property reuses the existing mock
		// rather than layering a new one, so without this a later
		// `expect(spy).not.toHaveBeenCalled()` would see an earlier test's calls.
		vi.restoreAllMocks();
	});

	it("renders closed by default, with a placeholder and aria-expanded false", () => {
		const { container } = render(DatePicker, { props: { placeholder: "Pick a date" } });
		const btn = trigger(container);

		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(btn.textContent).toContain("Pick a date");
		expect(panel()).toBeNull();
	});

	it("formats a selected value into the trigger instead of the placeholder", () => {
		const { container } = render(DatePicker, {
			props: { value: new Date(2026, 6, 24), locale: "en-US", placeholder: "Pick a date" },
		});
		expect(trigger(container).textContent).toContain("Jul 24, 2026");
		expect(trigger(container).textContent).not.toContain("Pick a date");
	});

	it("aria-controls is absent while closed and points at the panel's real id once open", async () => {
		const { container } = render(DatePicker, {});
		const btn = trigger(container);
		expect(btn.hasAttribute("aria-controls")).toBe(false);

		await fireEvent.click(btn);
		const controls = btn.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		await waitFor(() => expect(panel()?.id).toBe(controls));

		await fireEvent.click(btn);
		await waitFor(() => expect(btn.hasAttribute("aria-controls")).toBe(false));
	});

	it("marks the grid, weekday headers and day cells with the expected roles", async () => {
		const utils = render(DatePicker, { props: { locale: "en-US" } });
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(panel()).not.toBeNull());

		const grid = panel()!.querySelector("table");
		expect(grid?.getAttribute("role")).toBe("grid");
		expect(panel()!.querySelectorAll('[role="columnheader"]')).toHaveLength(7);
		expect(panel()!.querySelectorAll('[role="gridcell"]').length).toBe(42); // 6 weeks x 7 days
	});

	it("every day cell carries a full accessible name, not just the bare number", async () => {
		const utils = render(DatePicker, {
			props: { value: new Date(2026, 6, 24), locale: "en-US" },
		});
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(cellFor("2026-07-24")).not.toBeNull());

		const label = cellFor("2026-07-24")!.getAttribute("aria-label");
		expect(label).toContain("24");
		expect(label).toContain("July");
		expect(label).toContain("2026");
	});

	it("seeds the roving tabindex on the selected day, and moves DOM focus there, when opened", async () => {
		const utils = render(DatePicker, { props: { value: new Date(2026, 6, 24), locale: "en-US" } });
		await fireEvent.click(trigger(utils.container));

		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));
		expect(cellFor("2026-07-24")?.getAttribute("tabindex")).toBe("0");
	});

	it("ArrowRight moves the roving focus one day forward", async () => {
		const utils = render(DatePicker, { props: { value: new Date(2026, 6, 24), locale: "en-US" } });
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		await fireEvent.keyDown(focusedCell()!, { key: "ArrowRight" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-25")));
	});

	it("ArrowLeft crossing a month boundary switches the displayed month rather than dead-ending", async () => {
		const utils = render(DatePicker, { props: { value: new Date(2026, 6, 1), locale: "en-US" } });
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-01")));

		await fireEvent.keyDown(focusedCell()!, { key: "ArrowLeft" });
		await waitFor(() => expect(announcement()).toContain("June"));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-06-30")));
	});

	it("ArrowDown moves one week forward", async () => {
		const utils = render(DatePicker, { props: { value: new Date(2026, 6, 24), locale: "en-US" } });
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		await fireEvent.keyDown(focusedCell()!, { key: "ArrowDown" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-31")));
	});

	it("Home moves to the Monday of the focused week (weekStartsOn defaults to 1)", async () => {
		const utils = render(DatePicker, { props: { value: new Date(2026, 6, 24), locale: "en-US" } });
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		await fireEvent.keyDown(focusedCell()!, { key: "Home" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-20")));
	});

	it("End moves to the Sunday of the focused week", async () => {
		const utils = render(DatePicker, { props: { value: new Date(2026, 6, 24), locale: "en-US" } });
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		await fireEvent.keyDown(focusedCell()!, { key: "End" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-26")));
	});

	it("weekStartsOn=0 makes Home land on Sunday instead", async () => {
		const utils = render(DatePicker, {
			props: { value: new Date(2026, 6, 24), locale: "en-US", weekStartsOn: 0 },
		});
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		await fireEvent.keyDown(focusedCell()!, { key: "Home" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-19")));
	});

	it("PageDown moves one month forward, clamping the day if the target month is shorter", async () => {
		const utils = render(DatePicker, { props: { value: new Date(2026, 0, 31), locale: "en-US" } });
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-01-31")));

		await fireEvent.keyDown(focusedCell()!, { key: "PageDown" });
		await waitFor(() => expect(announcement()).toContain("February"));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-02-28")));
	});

	it("PageUp moves one month back", async () => {
		const utils = render(DatePicker, { props: { value: new Date(2026, 6, 24), locale: "en-US" } });
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		await fireEvent.keyDown(focusedCell()!, { key: "PageUp" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-06-24")));
	});

	// Regression: when min/max clamping pulls the paged-to month back into
	// range, and the clamped day is itself disabled, the search for the next
	// enabled day must look toward the interior — not continue in the
	// original page direction, which is guaranteed to be out of range (and
	// therefore disabled) the whole way, silently leaving the keypress a
	// no-op.
	it("PageUp clamped to min searches forward into range, not backward out of it", async () => {
		const min = new Date(2026, 6, 15); // July 15
		const max = new Date(2026, 6, 31);
		// The first few in-range days are also individually disabled, so the
		// clamped landing spot (July 15, the min itself) isn't enabled either
		// — the fallback search has to actually do something.
		const isDateDisabled = (d: Date) =>
			d.getMonth() === 6 && d.getDate() >= 15 && d.getDate() <= 17;
		const utils = render(DatePicker, {
			props: { value: new Date(2026, 6, 20), locale: "en-US", min, max, isDateDisabled },
		});
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-20")));

		// addMonths(July 20, -1) = June 20, which is before `min` and gets
		// clamped up to July 15 — itself disabled, so the old (buggy) code
		// searched backward from there, straight out of range, and gave up
		// with focus unchanged at July 20. The fix searches forward instead
		// and lands on July 18, the first enabled day after the disabled run.
		await fireEvent.keyDown(focusedCell()!, { key: "PageUp" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-18")));
	});

	it("PageDown clamped to max searches backward into range, not forward out of it", async () => {
		const min = new Date(2026, 6, 1);
		const max = new Date(2026, 6, 20);
		// The last few in-range days are also individually disabled, so the
		// clamped landing spot (July 20, the max itself) isn't enabled either.
		const isDateDisabled = (d: Date) =>
			d.getMonth() === 6 && d.getDate() >= 18 && d.getDate() <= 20;
		const utils = render(DatePicker, {
			props: { value: new Date(2026, 6, 10), locale: "en-US", min, max, isDateDisabled },
		});
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-10")));

		// addMonths(July 10, +1) = August 10, after `max`, clamped down to
		// July 20 — itself disabled. The fix searches backward and lands on
		// July 17, the first enabled day before the disabled run.
		await fireEvent.keyDown(focusedCell()!, { key: "PageDown" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-17")));
	});

	it("Shift+PageDown moves one year forward", async () => {
		const utils = render(DatePicker, { props: { value: new Date(2026, 6, 24), locale: "en-US" } });
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		await fireEvent.keyDown(focusedCell()!, { key: "PageDown", shiftKey: true });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2027-07-24")));
	});

	it("Shift+PageUp moves one year back", async () => {
		const utils = render(DatePicker, { props: { value: new Date(2026, 6, 24), locale: "en-US" } });
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		await fireEvent.keyDown(focusedCell()!, { key: "PageUp", shiftKey: true });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2025-07-24")));
	});

	it("skips a disabled day during arrow navigation instead of landing on it", async () => {
		const isDateDisabled = (d: Date) => d.getDate() === 25;
		const utils = render(DatePicker, {
			props: { value: new Date(2026, 6, 24), locale: "en-US", isDateDisabled },
		});
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		await fireEvent.keyDown(focusedCell()!, { key: "ArrowRight" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-26")));
	});

	it("marks a disabled day with aria-disabled and blocks selecting it by click", async () => {
		const isDateDisabled = (d: Date) => d.getDate() === 25;
		const onValueChange = vi.fn();
		const utils = render(DatePicker, {
			props: { value: new Date(2026, 6, 24), locale: "en-US", isDateDisabled, onValueChange },
		});
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(cellFor("2026-07-25")).not.toBeNull());

		expect(cellFor("2026-07-25")?.getAttribute("aria-disabled")).toBe("true");
		await fireEvent.click(cellFor("2026-07-25")!);
		expect(onValueChange).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
	});

	it("terminates instead of hanging when every day is disabled, and leaves focus where it was", async () => {
		const utils = render(DatePicker, {
			props: { value: new Date(2026, 6, 24), locale: "en-US", isDateDisabled: () => true },
		});
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		await fireEvent.keyDown(focusedCell()!, { key: "ArrowRight" });
		// No enabled day exists anywhere, so the search gives up and focus does
		// not move — proof the bounded search actually returned rather than
		// the test simply finishing before an infinite loop would have hung it.
		expect(document.activeElement).toBe(cellFor("2026-07-24"));
	});

	it("respects min/max as day-granularity bounds", async () => {
		const min = new Date(2026, 6, 20);
		const max = new Date(2026, 6, 26);
		const utils = render(DatePicker, {
			props: { value: new Date(2026, 6, 24), locale: "en-US", min, max },
		});
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(cellFor("2026-07-19")).not.toBeNull());

		expect(cellFor("2026-07-19")?.getAttribute("aria-disabled")).toBe("true");
		expect(cellFor("2026-07-27")?.getAttribute("aria-disabled")).toBe("true");
		expect(cellFor("2026-07-20")?.hasAttribute("aria-disabled")).toBe(false);
		expect(cellFor("2026-07-26")?.hasAttribute("aria-disabled")).toBe(false);
	});

	it("Enter commits the focused day, closes the panel and returns focus to the trigger", async () => {
		const onValueChange = vi.fn();
		const utils = render(DatePicker, {
			props: { value: new Date(2026, 6, 24), locale: "en-US", onValueChange },
		});
		const btn = trigger(utils.container);
		await fireEvent.click(btn);
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-24")));

		await fireEvent.keyDown(focusedCell()!, { key: "ArrowRight" });
		await waitFor(() => expect(document.activeElement).toBe(cellFor("2026-07-25")));

		await fireEvent.keyDown(focusedCell()!, { key: "Enter" });
		expect(onValueChange).toHaveBeenCalledTimes(1);
		const committed = onValueChange.mock.calls[0][0] as Date;
		expect(committed.getDate()).toBe(25);
		await waitFor(() => expect(panel()).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(btn));
	});

	it("clicking an enabled day commits it and closes the panel", async () => {
		const onValueChange = vi.fn();
		const utils = render(DatePicker, {
			props: { value: new Date(2026, 6, 24), locale: "en-US", onValueChange },
		});
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(cellFor("2026-07-22")).not.toBeNull());

		await fireEvent.click(cellFor("2026-07-22")!);
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect((onValueChange.mock.calls[0][0] as Date).getDate()).toBe(22);
		await waitFor(() => expect(panel()).toBeNull());
	});

	it("announces the month label, and updates it as the view changes", async () => {
		const utils = render(DatePicker, { props: { value: new Date(2026, 6, 24), locale: "en-US" } });
		expect(announcement()).toBe("");

		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(announcement()).toBe("July 2026"));

		await fireEvent.click(document.querySelector('[aria-label="Next month"]')!);
		await waitFor(() => expect(announcement()).toBe("August 2026"));
	});

	it("closes on Escape without committing a value", async () => {
		const onValueChange = vi.fn();
		const utils = render(DatePicker, {
			props: { value: new Date(2026, 6, 24), locale: "en-US", onValueChange },
		});
		const btn = trigger(utils.container);
		await fireEvent.click(btn);
		await waitFor(() => expect(panel()).not.toBeNull());

		await fireEvent.keyDown(document, { key: "Escape" });
		await waitFor(() => expect(panel()).toBeNull());
		expect(onValueChange).not.toHaveBeenCalled();
		await waitFor(() => expect(document.activeElement).toBe(btn));
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const utils = render(DatePicker, { props: { locale: "en-US" } });

		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(panel()).not.toBeNull());

		await fireEvent.pointerDown(outside);
		await waitFor(() => expect(panel()).toBeNull());
		outside.remove();
	});

	it("does not open while disabled", async () => {
		const utils = render(DatePicker, { props: { disabled: true, locale: "en-US" } });
		await fireEvent.click(trigger(utils.container));
		expect(panel()).toBeNull();
	});

	it("renders no hidden input when name is not set", () => {
		const { container } = render(DatePicker, { props: {} });
		expect(container.querySelector('input[type="hidden"]')).toBeNull();
	});

	it("renders a hidden ISO-date input when name is set, submitted through FormData", () => {
		const { container } = render(DatePicker, {
			props: { name: "deadline", value: new Date(2026, 6, 24) },
		});
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden.value).toBe("2026-07-24");

		const form = document.createElement("form");
		form.appendChild(hidden.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("deadline")).toBe("2026-07-24");
	});

	it("excludes the hidden input's value from FormData while disabled", () => {
		const { container } = render(DatePicker, {
			props: { name: "deadline", value: new Date(2026, 6, 24), disabled: true },
		});
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;

		const form = document.createElement("form");
		form.appendChild(hidden.cloneNode(true));
		expect(new FormData(form).get("deadline")).toBeNull();
	});

	it("the hidden input is empty while no day is selected", () => {
		const { container } = render(DatePicker, { props: { name: "deadline" } });
		const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement;
		expect(hidden.value).toBe("");
	});

	it("round-trips value through bind:value", async () => {
		const { container, getByTestId } = render(ValueHarness);
		expect(getByTestId("bound-value").textContent).toBe("none");

		await fireEvent.click(trigger(container));
		await waitFor(() => expect(cellFor("2026-07-24") ?? true).toBeTruthy());
		// Any real, in-view day works — pick the focused one (today, in this
		// harness) and commit it.
		const target = focusedCell();
		await fireEvent.click(target!);

		await waitFor(() => expect(getByTestId("bound-value").textContent).not.toBe("none"));
	});

	it("round-trips the trigger element through bind:ref", () => {
		const { container } = render(ValueHarness);
		expect(trigger(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("works with a plain non-bound value plus a callback", async () => {
		const onValueChange = vi.fn();
		const utils = render(DatePicker, {
			props: { value: new Date(2026, 6, 24), locale: "en-US", onValueChange },
		});
		await fireEvent.click(trigger(utils.container));
		await waitFor(() => expect(cellFor("2026-07-22")).not.toBeNull());
		await fireEvent.click(cellFor("2026-07-22")!);
		expect(onValueChange).toHaveBeenCalledTimes(1);
	});

	it("works standalone: getField() has no provider, so its own props apply untouched", () => {
		const { container } = render(DatePicker, {
			props: { id: "solo", invalid: true, required: true, disabled: false },
		});
		const btn = trigger(container);

		expect(btn.id).toBe("solo");
		expect(btn.getAttribute("aria-invalid")).toBe("true");
		expect(btn.getAttribute("aria-required")).toBe("true");
	});

	it("inside a FormField, the context wins for controlId, aria-describedby, aria-invalid, required and disabled", async () => {
		const context = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			valid: false,
			required: true,
			disabled: true,
		};
		const { container } = render(FieldHarness, { props: { context } });
		const btn = trigger(container);

		expect(btn.id).toBe("ctx-id");
		expect(btn.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(btn.getAttribute("aria-invalid")).toBe("true");
		expect(btn.getAttribute("aria-required")).toBe("true");
		expect(btn.disabled).toBe(true);

		// disabled through the context, not the component's own (false) prop —
		// opening must stay blocked.
		await fireEvent.click(btn);
		expect(panel()).toBeNull();
	});

	it("merges the class prop onto the trigger", () => {
		const { container } = render(DatePicker, { props: { class: "w-[240px]" } });
		const btn = trigger(container);
		expect(btn.className).toContain("w-[240px]");
		expect(btn.className).toContain("ft-date-picker-trigger");
	});

	it("resolves the accessible name from the label prop", () => {
		const { container } = render(DatePicker, { props: { label: "Deadline" } });
		expect(trigger(container).getAttribute("aria-label")).toBe("Deadline");
	});

	it("publishes the resolved placement and grows from the panel corner nearest the trigger", async () => {
		// The positive counterpart to the reduced-motion test below: under the
		// default stub (`matches: false`, i.e. no-preference) the entrance really
		// does run, which is what makes that test's `not.toHaveBeenCalled()`
		// discriminating instead of vacuously true. Without this line, dropping
		// the `in:` directive altogether would leave both tests green.
		const animateSpy = vi.spyOn(Element.prototype, "animate");

		const { container } = render(DatePicker, {});
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(panel()).not.toBeNull());

		expect(animateSpy).toHaveBeenCalled();

		// jsdom measures every rect as 0x0, so `computePosition` never sees an
		// overflow and never flips: the resolved side is the requested one. That
		// is the un-flipped case, and the one that can be asserted
		// deterministically here. `bottom` + `align: "start"` puts the growth
		// origin on the panel's top-left corner — the corner nearest the trigger.
		expect(panel()!.getAttribute("data-side")).toBe("bottom");
		expect(panel()!.getAttribute("data-align")).toBe("start");
		expect(panel()!.style.transformOrigin).toBe("left top");
	});

	it("runs no animation at all under reduced motion, and still shows the panel", async () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");

		const { container } = render(DatePicker, {});
		await fireEvent.click(trigger(container));
		await waitFor(() => expect(panel()).not.toBeNull());
		await tick();

		// A zero duration makes Svelte skip `element.animate()` entirely rather
		// than run a zero-length animation, so the panel is simply there.
		expect(animateSpy).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
	});

	// The panel now leaves on the same shared transition it arrives on, so
	// between the dismiss and the unmount there is a window — 150 ms in a
	// browser, a couple of microtasks under the WAAPI stub. These pin what
	// must be true inside it. `open`, `value` and `onValueChange` all still
	// settle synchronously, which is why every assertion on them stayed
	// unwrapped.
	describe("exit", () => {
		it("keeps the panel mounted, inert and marked closing for the length of the exit", async () => {
			const { container } = render(DatePicker, {});
			const btn = trigger(container);
			await fireEvent.click(btn);
			expect(panel()!.getAttribute("data-state")).toBe("open");

			pressEscape();
			await tick();

			const closing = panel();
			expect(closing).toBeTruthy();
			// Written imperatively from `onoutrostart`. A reactive
			// `data-state={…}` would never reach the DOM: Svelte marks the
			// branch inert before it plays the outro and the scheduler skips
			// inert effects.
			expect(closing!.getAttribute("data-state")).toBe("closing");
			// Svelte sets this itself on any element carrying a `transition:`,
			// for the whole exit — which is what stops a day cell taking a
			// click on its way out.
			expect(closing!.inert).toBe(true);
			// The trigger has already been told the panel is gone.
			expect(btn.getAttribute("aria-expanded")).toBe("false");

			await waitFor(() => expect(panel()).toBeNull());
		});

		// `closePanel()` is a plain function outside the `{#if}`, so it returns
		// focus in the same tick as the dismiss — this component needs no
		// `focusTrap` handle to satisfy the eager-return rule. The assertion
		// deliberately runs INSIDE the exit window, while the panel is still on
		// screen and Svelte has already marked it `inert`: that is exactly the
		// moment a late return would have stranded a keyboard user on `<body>`.
		it("returns focus to the trigger at the dismiss, not when the fade ends", async () => {
			const { container } = render(DatePicker, {});
			const btn = trigger(container);
			await fireEvent.click(btn);

			pressEscape();
			await tick();

			expect(panel()).toBeTruthy(); // still fading
			expect(document.activeElement).toBe(btn);
		});

		// The `active: () => open` gate. A layer on its way out must not
		// swallow the key: the dismiss stack scans past it and hands Escape to
		// whatever is underneath.
		it("lets an Escape during the exit reach the layer underneath instead of swallowing it", async () => {
			// Registered BEFORE the picker, so the panel sits above it on the
			// shared layer stack.
			const beneath = document.createElement("div");
			document.body.appendChild(beneath);
			const onBeneath = vi.fn();
			const beneathAction = dismissable(beneath, { onDismiss: onBeneath });

			const { container } = render(DatePicker, {});
			await fireEvent.click(trigger(container));

			pressEscape(); // the panel is the top LIVE layer and takes this one
			await tick();
			expect(onBeneath).not.toHaveBeenCalled();
			expect(panel()).toBeTruthy(); // still fading

			pressEscape(); // the panel is inactive now, so this falls through
			expect(onBeneath).toHaveBeenCalledTimes(1);

			beneathAction?.destroy?.();
			beneath.remove();
			await waitFor(() => expect(panel()).toBeNull());
		});

		// The reduced-motion fast path: a zero duration makes Svelte call
		// `on_finish()` synchronously and never touch `element.animate()`, so
		// a visitor who asked for less motion gets exactly the synchronous
		// close this panel had before the exit existed.
		it("closes synchronously and never animates under reduced motion", async () => {
			stubReducedMotion(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			const { container } = render(DatePicker, {});
			await fireEvent.click(trigger(container));
			expect(panel()).not.toBeNull();

			pressEscape();
			await tick();

			expect(panel()).toBeNull();
			expect(animateSpy).not.toHaveBeenCalled();
		});
	});
});
