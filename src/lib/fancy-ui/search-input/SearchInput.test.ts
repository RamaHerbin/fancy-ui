import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import SearchInput from "./SearchInput.svelte";
import ValueHarness from "./SearchInputHarness.test.svelte";
import FieldHarness from "./SearchInputFieldHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";
import { sound } from "../sound/sound.svelte.js";

function input(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input") as HTMLInputElement;
}

function clearButton(container: HTMLElement): HTMLButtonElement | null {
	return container.querySelector("button");
}

/**
 * jsdom has no `matchMedia`; `src/test-setup.ts` installs one that answers
 * `matches: false` to everything, which is the "full motion" branch. This
 * swaps in a stub that discriminates on the query string, so a test can pick
 * the branch it means rather than turning every media query true at once.
 */
function stubReducedMotion(reduce: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: reduce && query.includes("prefers-reduced-motion"),
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

describe("SearchInput", () => {
	afterEach(cleanup);

	it("renders a real input, type search, with the placeholder", () => {
		const { container } = render(SearchInput, { props: { placeholder: "Search components…" } });
		const el = input(container);

		expect(el.tagName).toBe("INPUT");
		expect(el.type).toBe("search");
		expect(el.placeholder).toBe("Search components…");
		expect(el.disabled).toBe(false);
	});

	it("defaults the placeholder to Search", () => {
		const { container } = render(SearchInput, { props: {} });
		expect(input(container).placeholder).toBe("Search");
	});

	it("reflects invalid through aria-invalid and the destructive border class on the field surface", () => {
		const { container } = render(SearchInput, { props: { invalid: true } });
		const el = input(container);

		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.closest(".ft-search-input")?.className).toContain("border-destructive/50");
	});

	it("disables the field: native disabled, out of the tab order", () => {
		const { container } = render(SearchInput, { props: { disabled: true } });
		expect(input(container).disabled).toBe(true);
	});

	it("readonly stays focusable and keeps its name, unlike disabled — and still submits", () => {
		const { container } = render(SearchInput, {
			props: { readonly: true, name: "q", value: "svelte" },
		});
		const el = input(container);

		expect(el.disabled).toBe(false);
		expect(el.readOnly).toBe(true);
		el.focus();
		expect(document.activeElement).toBe(el);

		// A readonly field still submits; a disabled one is excluded entirely.
		const form = document.createElement("form");
		form.appendChild(el.cloneNode(true));
		const data = new FormData(form);
		expect(data.get("q")).toBe("svelte");
	});

	it("calls onValueChange with the new value on input", async () => {
		const onValueChange = vi.fn();
		const { container } = render(SearchInput, { props: { value: "", onValueChange } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "hi" } });
		expect(el.value).toBe("hi");
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("hi");
	});

	it("works with a plain non-bound value plus a callback", async () => {
		const onValueChange = vi.fn();
		const { container } = render(SearchInput, { props: { value: "start", onValueChange } });
		const el = input(container);

		expect(el.value).toBe("start");
		await fireEvent.input(el, { target: { value: "typed" } });
		expect(el.value).toBe("typed");
		expect(onValueChange).toHaveBeenCalledWith("typed");
	});

	it("blocks the callback while disabled, even from a synthetic input event", async () => {
		const onValueChange = vi.fn();
		const { container } = render(SearchInput, { props: { disabled: true, onValueChange } });
		const el = input(container);

		await fireEvent.input(el, { target: { value: "nope" } });
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("round-trips value through bind:value", async () => {
		const { container, getByTestId } = render(ValueHarness);
		const el = input(container);

		expect(getByTestId("bound-value").textContent).toBe("");
		await fireEvent.input(el, { target: { value: "bound" } });
		expect(getByTestId("bound-value").textContent).toBe("bound");
		expect(el.value).toBe("bound");
	});

	it("round-trips the input element through bind:ref", () => {
		const { container } = render(ValueHarness);
		expect(input(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	it("sets aria-label from the label prop, for standalone use with no visible Label", () => {
		const { container } = render(SearchInput, { props: { label: "Search docs" } });
		expect(input(container).getAttribute("aria-label")).toBe("Search docs");
	});

	it("merges the class prop with the base classes on the field surface", () => {
		const { container } = render(SearchInput, { props: { class: "mt-4" } });
		const wrapper = container.querySelector(".ft-search-input");

		expect(wrapper?.className).toContain("ft-search-input");
		expect(wrapper?.className).toContain("mt-4");
	});

	it("works standalone: getField() has no provider, so its own props apply untouched", () => {
		const { container } = render(SearchInput, {
			props: { id: "solo", invalid: true, required: true, disabled: false },
		});
		const el = input(container);

		expect(el.id).toBe("solo");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
	});

	it("inside a FormField, the context wins for controlId, aria-describedby, aria-invalid, required and disabled", () => {
		const context: FieldContext = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			valid: false,
			required: true,
			disabled: true,
		};
		const { container } = render(FieldHarness, { props: { context } });
		const el = input(container);

		// The harness passes id="own-id" invalid={false} required={false}
		// disabled={false} straight to SearchInput — every one of those is
		// overridden by the context above.
		expect(el.id).toBe("ctx-id");
		expect(el.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(el.getAttribute("aria-invalid")).toBe("true");
		expect(el.required).toBe(true);
		expect(el.disabled).toBe(true);
	});

	// The test above only exercises context=true overriding own=false — a
	// regression from `??` to `||` in any of the three `effective*` derived
	// values would pass it too, since `true || false` is still `true`. The
	// three below pin the polarity that actually tells `??` and `||` apart:
	// own prop `true`, context `false`, expecting the context's `false` to
	// win.
	it("lets the context's disabled=false win over the component's own disabled=true prop", () => {
		const context: FieldContext = {
			controlId: "field-3",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(FieldHarness, { props: { context, disabled: true } });
		expect(input(container).disabled).toBe(false);
	});

	it("lets the context's required=false win over the component's own required=true prop", () => {
		const context: FieldContext = {
			controlId: "field-4",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(FieldHarness, { props: { context, required: true } });
		expect(input(container).required).toBe(false);
	});

	it("lets the context's invalid=false win over the component's own invalid=true prop", () => {
		const context: FieldContext = {
			controlId: "field-5",
			describedBy: undefined,
			invalid: false,
			required: false,
			disabled: false,
		};
		const { container } = render(FieldHarness, { props: { context, invalid: true } });
		expect(input(container).hasAttribute("aria-invalid")).toBe(false);
	});

	describe("clear button", () => {
		it("is absent while the field is empty", () => {
			const { container } = render(SearchInput, { props: { value: "" } });
			expect(clearButton(container)).toBeNull();
		});

		it("appears, with an accessible name, once there is something to clear", () => {
			const { container } = render(SearchInput, { props: { value: "svelte" } });
			const btn = clearButton(container);

			expect(btn).not.toBeNull();
			expect(btn?.getAttribute("aria-label")).toBe("Clear search");
		});

		it("empties the value, fires onValueChange, and returns focus to the input", async () => {
			const onValueChange = vi.fn();
			const { container } = render(SearchInput, { props: { value: "svelte", onValueChange } });
			const el = input(container);
			const btn = clearButton(container)!;

			await fireEvent.click(btn);

			expect(el.value).toBe("");
			expect(onValueChange).toHaveBeenCalledWith("");
			expect(document.activeElement).toBe(el);
		});

		it("stays hidden when clearable is false, even with content", () => {
			const { container } = render(SearchInput, { props: { value: "svelte", clearable: false } });
			expect(clearButton(container)).toBeNull();
		});

		it("stays hidden while readonly", () => {
			const { container } = render(SearchInput, { props: { value: "svelte", readonly: true } });
			expect(clearButton(container)).toBeNull();
		});

		it("leaves the DOM in the same tick as the focus handoff, with no outro holding it there", async () => {
			// The reason the clear button animates in but not out: `clearValue()`
			// calls `ref?.focus()` synchronously right after emptying the field,
			// and an outro would keep a button that is already logically gone
			// mounted (and focusable) across that handoff. This pins the
			// ordering, not the pixels.
			const { container } = render(SearchInput, { props: { value: "svelte" } });
			const el = input(container);

			await fireEvent.click(clearButton(container)!);

			expect(clearButton(container)).toBeNull();
			expect(document.activeElement).toBe(el);
		});
	});

	describe("motion", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("animates the clear button in when it appears mid-typing", async () => {
			// A button already present on first render never animates — Svelte
			// skips a local intro on a block's first run — so the value has to
			// arrive through a real input event for the transition to exist at
			// all. That is also the only moment a user ever sees it appear.
			stubReducedMotion(false);
			const animateSpy = vi.spyOn(Element.prototype, "animate");

			try {
				const { container } = render(SearchInput, { props: { value: "" } });
				expect(clearButton(container)).toBeNull();

				await fireEvent.input(input(container), { target: { value: "s" } });

				await vi.waitFor(() => {
					expect(clearButton(container)).not.toBeNull();
				});
				expect(animateSpy).toHaveBeenCalled();
			} finally {
				animateSpy.mockRestore();
			}
		});

		it("with prefers-reduced-motion: reduce, the clear button still appears — it just never animates", async () => {
			stubReducedMotion(true);
			const animateSpy = vi.spyOn(Element.prototype, "animate");

			try {
				const { container } = render(SearchInput, { props: { value: "" } });

				await fireEvent.input(input(container), { target: { value: "s" } });

				// Present and usable: the affordance is never what gets dropped,
				// only its travel. `duration: 0` is what makes Svelte take its own
				// synchronous fast path instead of calling into the WAAPI.
				const btn = clearButton(container);
				expect(btn).not.toBeNull();
				expect(btn?.getAttribute("aria-label")).toBe("Clear search");
				expect(animateSpy).not.toHaveBeenCalled();
			} finally {
				animateSpy.mockRestore();
			}
		});
	});

	describe("Escape", () => {
		it("clears the field and does not bubble to an ancestor's own Escape handler", async () => {
			const { container } = render(SearchInput, { props: { value: "svelte" } });
			const el = input(container);
			const ancestorHandler = vi.fn();
			document.addEventListener("keydown", ancestorHandler);

			await fireEvent.keyDown(el, { key: "Escape", bubbles: true, cancelable: true });

			expect(el.value).toBe("");
			expect(ancestorHandler).not.toHaveBeenCalled();
			document.removeEventListener("keydown", ancestorHandler);
		});

		it("on an already-empty field is left alone to bubble, so a surrounding overlay can still close", async () => {
			const { container } = render(SearchInput, { props: { value: "" } });
			const el = input(container);
			const ancestorHandler = vi.fn();
			document.addEventListener("keydown", ancestorHandler);

			await fireEvent.keyDown(el, { key: "Escape", bubbles: true, cancelable: true });

			expect(ancestorHandler).toHaveBeenCalledTimes(1);
			document.removeEventListener("keydown", ancestorHandler);
		});
	});

	it("Enter fires onSearch immediately with the current value", async () => {
		const onSearch = vi.fn();
		const { container } = render(SearchInput, { props: { value: "svelte", onSearch } });
		const el = input(container);

		await fireEvent.keyDown(el, { key: "Enter" });

		expect(onSearch).toHaveBeenCalledTimes(1);
		expect(onSearch).toHaveBeenCalledWith("svelte");
	});

	describe("debouncing", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("fires onSearch once after the delay settles, not once per keystroke", async () => {
			const onSearch = vi.fn();
			const { container } = render(SearchInput, {
				props: { value: "", onSearch, debounceMs: 300 },
			});
			const el = input(container);

			await fireEvent.input(el, { target: { value: "s" } });
			await fireEvent.input(el, { target: { value: "sv" } });
			await fireEvent.input(el, { target: { value: "sve" } });

			expect(onSearch).not.toHaveBeenCalled();

			vi.advanceTimersByTime(300);

			expect(onSearch).toHaveBeenCalledTimes(1);
			expect(onSearch).toHaveBeenCalledWith("sve");
		});

		it("Enter cancels a pending debounce instead of firing onSearch a second time", async () => {
			const onSearch = vi.fn();
			const { container } = render(SearchInput, {
				props: { value: "", onSearch, debounceMs: 300 },
			});
			const el = input(container);

			await fireEvent.input(el, { target: { value: "sve" } });
			await fireEvent.keyDown(el, { key: "Enter" });

			expect(onSearch).toHaveBeenCalledTimes(1);
			expect(onSearch).toHaveBeenCalledWith("sve");

			vi.advanceTimersByTime(1000);

			expect(onSearch).toHaveBeenCalledTimes(1);
		});

		it("debounceMs of 0 schedules nothing — onSearch never fires on its own", async () => {
			const onSearch = vi.fn();
			const { container } = render(SearchInput, { props: { value: "", onSearch, debounceMs: 0 } });
			const el = input(container);

			await fireEvent.input(el, { target: { value: "sve" } });
			vi.advanceTimersByTime(10_000);

			expect(onSearch).not.toHaveBeenCalled();
		});

		it("clears its pending timer on unmount, so onSearch never fires after teardown", async () => {
			const onSearch = vi.fn();
			const { container, unmount } = render(SearchInput, {
				props: { value: "", onSearch, debounceMs: 300 },
			});
			const el = input(container);

			await fireEvent.input(el, { target: { value: "sve" } });
			unmount();
			vi.advanceTimersByTime(1000);

			expect(onSearch).not.toHaveBeenCalled();
		});
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays the press cue exactly once when cleared via the clear button, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(SearchInput, { props: { sound: true, value: "svelte" } });

			await fireEvent.click(clearButton(container)!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
		});

		it("plays the press cue exactly once when cleared via Escape, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(SearchInput, { props: { sound: true, value: "svelte" } });
			const el = input(container);

			await fireEvent.keyDown(el, { key: "Escape" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(SearchInput, { props: { value: "svelte" } });

			await fireEvent.click(clearButton(container)!);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled, via a synthetic dispatch bypassing jsdom's own disabled-input event suppression", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(SearchInput, {
				props: { sound: true, disabled: true, value: "svelte" },
			});
			const el = input(container);

			// The clear button never renders while disabled (canClear excludes
			// it), and a real disabled input never dispatches keydown at all —
			// a raw dispatchEvent is what actually reaches handleKeydown here.
			el.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
			);

			expect(play).not.toHaveBeenCalled();
		});

		it("does not double-fire: once the field is already empty, Escape is a no-op and plays nothing more", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(SearchInput, { props: { sound: true, value: "svelte" } });
			const el = input(container);

			await fireEvent.keyDown(el, { key: "Escape" });
			expect(play).toHaveBeenCalledTimes(1);

			// canClear is now false (value === ""), so a second Escape must not
			// play a second cue for a clear that cannot happen again.
			await fireEvent.keyDown(el, { key: "Escape" });
			expect(play).toHaveBeenCalledTimes(1);
		});

		it("plays nothing while typing, on the debounced settle, or on Enter", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(SearchInput, { props: { sound: true, value: "" } });
			const el = input(container);

			await fireEvent.input(el, { target: { value: "svelte" } });
			await fireEvent.keyDown(el, { key: "Enter" });

			expect(play).not.toHaveBeenCalled();
		});
	});
});
