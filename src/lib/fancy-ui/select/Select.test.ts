import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Select from "./Select.svelte";
import Harness from "./SelectHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";
import type { SelectOption } from "./types.js";
import { sound } from "../sound/sound.svelte.js";

const OPTIONS: SelectOption[] = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
	{ value: "vue", label: "Vue" },
];

function trigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('[role="combobox"]') as HTMLButtonElement;
}

function panel(): HTMLElement | null {
	// Portalled to document.body, not inside `container`.
	return document.querySelector('[role="listbox"]');
}

function optionRows(): HTMLElement[] {
	return Array.from(document.querySelectorAll('[role="option"]'));
}

function optionByLabel(label: string): HTMLElement {
	return optionRows().find((el) => el.textContent?.trim().startsWith(label)) as HTMLElement;
}

describe("Select", () => {
	afterEach(() => {
		cleanup();
		document.body.querySelectorAll('[role="listbox"]').forEach((el) => el.remove());
	});

	it("renders closed by default, role=combobox with aria-expanded false and aria-haspopup listbox", () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		const btn = trigger(container);

		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(btn.getAttribute("aria-haspopup")).toBe("listbox");
		expect(panel()).toBeNull();
	});

	it("shows the placeholder when nothing is selected, and the selected option's label otherwise", async () => {
		const { container, rerender } = render(Select, {
			props: { options: OPTIONS, placeholder: "Choose a framework" },
		});
		expect(trigger(container).textContent).toContain("Choose a framework");

		await rerender({ options: OPTIONS, value: "react" });
		expect(trigger(container).textContent).toContain("React");
	});

	// The last wave shipped `aria-controls` pointing at nothing for the
	// entire closed lifetime, in two components, with tests that only read
	// the attribute after opening. This one reads it before, during and
	// after.
	it("aria-controls is absent while closed and points at the panel's real id once open, then absent again on close", async () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		const btn = trigger(container);
		expect(btn.hasAttribute("aria-controls")).toBe(false);

		await fireEvent.click(btn);
		const controls = btn.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		expect(panel()?.id).toBe(controls);

		await fireEvent.click(btn);
		expect(btn.hasAttribute("aria-controls")).toBe(false);
	});

	it("opens on trigger click, and closes on a second click without reopening", async () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		const btn = trigger(container);

		await fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(panel()).not.toBeNull();

		await fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(panel()).toBeNull();
	});

	it("renders every option as role=option with the right label, inside role=listbox", async () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		await fireEvent.click(trigger(container));

		expect(panel()?.getAttribute("role")).toBe("listbox");
		const rows = optionRows();
		expect(rows).toHaveLength(3);
		expect(rows.map((r) => r.textContent?.trim())).toEqual(
			expect.arrayContaining([expect.stringContaining("Svelte 5")])
		);
	});

	it("marks the selected option aria-selected=true and no other", async () => {
		const { container } = render(Select, { props: { options: OPTIONS, value: "react" } });
		await fireEvent.click(trigger(container));

		expect(optionByLabel("React").getAttribute("aria-selected")).toBe("true");
		expect(optionByLabel("Svelte 5").getAttribute("aria-selected")).toBe("false");
		expect(optionByLabel("Vue").getAttribute("aria-selected")).toBe("false");
	});

	it("clicking an option selects it and closes the panel", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, {
			props: { options: OPTIONS, onValueChange },
		});
		await fireEvent.click(trigger(container));

		await fireEvent.click(optionByLabel("React"));

		expect(onValueChange).toHaveBeenCalledWith("react");
		expect(panel()).toBeNull();
		expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
	});

	// A real mousedown on any element carrying a `tabindex` attribute — `-1`
	// included — moves DOM focus to it as the browser's own default action,
	// regardless of whether application code calls `.focus()`. Without a
	// guard, clicking a row would focus the row first, the click would then
	// commit and unmount the panel, and focus would fall through to
	// `document.body` instead of staying on the trigger.
	//
	// What this test can and cannot prove in this environment: jsdom does
	// NOT implement that native mousedown-to-focus step at all — a plain
	// `dispatchEvent(new MouseEvent("mousedown"))`, or even a real
	// `row.click()`, moves no focus here whether or not `preventDefault` is
	// ever called (verified directly against jsdom, outside this suite,
	// before writing this comment). So a `document.activeElement` assertion
	// around a click in this suite would pass identically whether the guard
	// exists or not — exactly the kind of assertion that looks like proof
	// and isn't. `@testing-library/user-event` does simulate the real
	// choreography (including manually focusing a clicked target the way a
	// browser would), but it is only a transitive dependency of `storybook`
	// here, not a direct one — `import "@testing-library/user-event"` does
	// not resolve in this project's node_modules layout (confirmed by
	// attempting it), so it is not available to reach for without adding it
	// as a real dependency, which is out of scope for this fix.
	//
	// What IS directly verifiable, and what this test actually asserts: the
	// row's own `mousedown` handler runs and calls `preventDefault()` on a
	// real, cancelable mousedown event. That is the exact mechanism the fix
	// relies on to cancel the browser's default action in a real browser —
	// proving the call happens is the strongest claim available without a
	// real or fully-simulated browser.
	it("cancels a row's mousedown default action, so a real click cannot steal focus off the trigger", async () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		await fireEvent.click(trigger(container));

		const row = optionByLabel("React");
		const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
		row.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
	});

	it("clicking a disabled option does nothing", async () => {
		const options: SelectOption[] = [
			...OPTIONS,
			{ value: "svelte-kit", label: "SvelteKit", disabled: true },
		];
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options, onValueChange } });
		await fireEvent.click(trigger(container));

		await fireEvent.click(optionByLabel("SvelteKit"));

		expect(onValueChange).not.toHaveBeenCalled();
		expect(panel()).not.toBeNull();
	});

	it("closes on an outside click without changing the value", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options: OPTIONS, onValueChange } });

		await fireEvent.click(trigger(container));
		expect(panel()).not.toBeNull();

		await fireEvent.pointerDown(outside);
		await waitFor(() => expect(panel()).toBeNull());
		expect(onValueChange).not.toHaveBeenCalled();
		outside.remove();
	});

	it("Escape closes without changing the value, even after arrowing to a different option", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, {
			props: { options: OPTIONS, value: "svelte", onValueChange },
		});
		const btn = trigger(container);
		await fireEvent.click(btn);

		await fireEvent.keyDown(btn, { key: "ArrowDown" });
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("React").id);

		await fireEvent.keyDown(document, { key: "Escape" });
		await waitFor(() => expect(panel()).toBeNull());
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("ArrowDown opens the panel and activates the first enabled option when nothing is selected", async () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "ArrowDown" });
		await tick();

		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Svelte 5").id);
	});

	it("ArrowUp opens the panel and activates the last enabled option when nothing is selected", async () => {
		const { container } = render(Select, { props: { options: OPTIONS } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "ArrowUp" });
		await tick();

		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);
	});

	it("Enter opens the panel and activates the already-selected option, not the first", async () => {
		const { container } = render(Select, { props: { options: OPTIONS, value: "vue" } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "Enter" });
		await tick();

		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);
	});

	it("skips a disabled option when navigating with ArrowDown", async () => {
		const options: SelectOption[] = [
			{ value: "a", label: "Aaa" },
			{ value: "b", label: "Bbb", disabled: true },
			{ value: "c", label: "Ccc" },
		];
		const { container } = render(Select, { props: { options } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens on Aaa
		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // skips Bbb, lands on Ccc
		await tick();

		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Ccc").id);
	});

	it("Enter commits the active option and closes the panel", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options: OPTIONS, onValueChange } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens, activates Svelte 5
		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // moves to React
		await fireEvent.keyDown(btn, { key: "Enter" });

		expect(onValueChange).toHaveBeenCalledWith("react");
		expect(panel()).toBeNull();
	});

	it("Home/End jump to the first/last option while open", async () => {
		const { container } = render(Select, { props: { options: OPTIONS, value: "svelte" } });
		const btn = trigger(container);
		await fireEvent.click(btn);

		await fireEvent.keyDown(btn, { key: "End" });
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);

		await fireEvent.keyDown(btn, { key: "Home" });
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Svelte 5").id);
	});

	// If `options` shrinks while the panel is open, a previously-valid active
	// index can end up pointing past the end of the new, shorter array —
	// nothing else re-checks this between explicit move/typeahead/setActive
	// calls. Without the fix, `aria-activedescendant` would keep citing an
	// option id with no row left in the DOM to match it.
	it("clamps the active option when the option list shrinks while open, instead of citing a removed row", async () => {
		const { container, rerender } = render(Select, {
			props: { options: OPTIONS, value: "svelte" },
		});
		const btn = trigger(container);
		await fireEvent.click(btn);

		await fireEvent.keyDown(btn, { key: "End" }); // activates Vue, the last of three
		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);

		await rerender({ options: OPTIONS.slice(0, 2), value: "svelte" }); // Vue's row is gone
		await tick();

		expect(btn.hasAttribute("aria-activedescendant")).toBe(false);
	});

	// Documented, chosen behaviour: Tab commits like Enter, but is never
	// prevented — the browser still moves focus on to the next control.
	it("Tab commits the active option, closes the panel, and does not preventDefault", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options: OPTIONS, onValueChange } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // Svelte 5
		await fireEvent.keyDown(btn, { key: "ArrowDown" }); // React
		const event = await fireEvent.keyDown(btn, { key: "Tab", cancelable: true });

		expect(onValueChange).toHaveBeenCalledWith("react");
		expect(panel()).toBeNull();
		expect(event).toBe(true); // fireEvent returns false when preventDefault was called
	});

	it("typing while closed selects by typeahead without opening the panel", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options: OPTIONS, onValueChange } });
		const btn = trigger(container);

		await fireEvent.keyDown(btn, { key: "v" });

		expect(onValueChange).toHaveBeenCalledWith("vue");
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(panel()).toBeNull();
	});

	it("hovering an option highlights it without selecting it", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options: OPTIONS, onValueChange } });
		const btn = trigger(container);
		await fireEvent.click(btn);

		await fireEvent.pointerEnter(optionByLabel("Vue"));

		expect(btn.getAttribute("aria-activedescendant")).toBe(optionByLabel("Vue").id);
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("does not open, commit or move on any key when disabled, even via a synthetic dispatch", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, {
			props: { options: OPTIONS, disabled: true, onValueChange },
		});
		const btn = trigger(container);

		await fireEvent.click(btn);
		await fireEvent.keyDown(btn, { key: "ArrowDown" });
		await fireEvent.keyDown(btn, { key: "a" });

		expect(panel()).toBeNull();
		expect(onValueChange).not.toHaveBeenCalled();
	});

	// The three ways this codebase expects a bindable prop plus its change
	// callback to work: bind:, the callback alone, and a plain non-bound
	// value plus that same callback.
	it("round-trips through bind:value", async () => {
		let value = "";
		const { container } = render(Select, {
			props: {
				options: OPTIONS,
				get value() {
					return value;
				},
				set value(v: string) {
					value = v;
				},
			},
		});
		await fireEvent.click(trigger(container));
		await fireEvent.click(optionByLabel("Vue"));
		expect(value).toBe("vue");
	});

	it("works uncontrolled with only onValueChange", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, { props: { options: OPTIONS, onValueChange } });
		await fireEvent.click(trigger(container));
		await fireEvent.click(optionByLabel("Vue"));
		expect(onValueChange).toHaveBeenCalledWith("vue");
	});

	it("works with a plain non-bound value plus a callback", async () => {
		const onValueChange = vi.fn();
		const { container } = render(Select, {
			props: { options: OPTIONS, value: "svelte", onValueChange },
		});
		expect(trigger(container).textContent).toContain("Svelte 5");

		await fireEvent.click(trigger(container));
		await fireEvent.click(optionByLabel("Vue"));
		expect(onValueChange).toHaveBeenCalledWith("vue");
	});

	it("merges the class prop onto the trigger", () => {
		const { container } = render(Select, { props: { options: OPTIONS, class: "w-[240px]" } });
		expect(trigger(container).className).toContain("w-[240px]");
		expect(trigger(container).className).toContain("ft-select-trigger");
	});

	it("binds the trigger element via ref", () => {
		let ref: HTMLButtonElement | null = null;
		const { container } = render(Select, {
			props: {
				options: OPTIONS,
				get ref() {
					return ref;
				},
				set ref(value: HTMLButtonElement | null) {
					ref = value;
				},
			},
		});
		expect(ref).toBe(trigger(container));
	});

	describe("form participation", () => {
		it("renders no hidden input when name is omitted", () => {
			const { container } = render(Select, { props: { options: OPTIONS } });
			expect(container.querySelector('input[type="hidden"]')).toBeNull();
		});

		it("carries the value through a hidden input when name is set, readable via FormData", async () => {
			const { container } = render(Select, {
				props: { options: OPTIONS, name: "framework", value: "react" },
			});
			const hiddenInput = () => container.querySelector('input[type="hidden"]') as HTMLInputElement;
			expect(hiddenInput()).not.toBeNull();

			const form = document.createElement("form");
			form.appendChild(hiddenInput().cloneNode(true));
			expect(new FormData(form).get("framework")).toBe("react");

			await fireEvent.click(trigger(container));
			await fireEvent.click(optionByLabel("Vue"));
			await tick();

			const form2 = document.createElement("form");
			form2.appendChild(hiddenInput().cloneNode(true));
			expect(new FormData(form2).get("framework")).toBe("vue");
		});

		it("excludes the hidden input's value from FormData while disabled", () => {
			const { container } = render(Select, {
				props: { options: OPTIONS, name: "framework", value: "react", disabled: true },
			});
			const hiddenInput = container.querySelector('input[type="hidden"]') as HTMLInputElement;

			const form = document.createElement("form");
			form.appendChild(hiddenInput.cloneNode(true));
			expect(new FormData(form).get("framework")).toBeNull();
		});
	});

	describe("FormField integration", () => {
		it("inside a FormField, picks up controlId, describedBy, invalid and required from context", async () => {
			const field: FieldContext = {
				controlId: "field-1",
				describedBy: "field-1-error",
				invalid: true,
				required: true,
				disabled: false,
			};
			const { container } = render(Harness, { props: { options: OPTIONS, field } });
			await tick();

			const btn = trigger(container);
			expect(btn.id).toBe("field-1");
			expect(btn.getAttribute("aria-describedby")).toBe("field-1-error");
			expect(btn.getAttribute("aria-invalid")).toBe("true");
			expect(btn.getAttribute("aria-required")).toBe("true");
		});

		it("lets the FormField's disabled win over the control's own disabled=false prop", async () => {
			const field: FieldContext = {
				controlId: "field-2",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: true,
			};
			const { container } = render(Harness, {
				props: { options: OPTIONS, field, disabled: false },
			});
			await tick();
			expect(trigger(container).disabled).toBe(true);
		});

		// The polarity `??` gets right and `||` gets wrong: context `false`
		// must win over the control's own prop `true`, not the other way
		// around — `true || false` would still read `true` and pass the test
		// above just as well.
		it("lets the FormField's disabled=false win over the control's own disabled=true prop", async () => {
			const field: FieldContext = {
				controlId: "field-3",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: false,
			};
			const { container } = render(Harness, {
				props: { options: OPTIONS, field, disabled: true },
			});
			await tick();
			expect(trigger(container).disabled).toBe(false);
		});

		it("lets the FormField's required=false win over the control's own required=true prop", async () => {
			const field: FieldContext = {
				controlId: "field-4",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: false,
			};
			const { container } = render(Harness, {
				props: { options: OPTIONS, field, required: true },
			});
			await tick();
			expect(trigger(container).hasAttribute("aria-required")).toBe(false);
		});

		it("lets the FormField's invalid=false win over the control's own invalid=true prop", async () => {
			const field: FieldContext = {
				controlId: "field-5",
				describedBy: undefined,
				invalid: false,
				required: false,
				disabled: false,
			};
			const { container } = render(Harness, {
				props: { options: OPTIONS, field, invalid: true },
			});
			await tick();
			expect(trigger(container).hasAttribute("aria-invalid")).toBe(false);
		});

		it("works standalone with getField() undefined, falling back to its own props", () => {
			const { container } = render(Select, {
				props: { options: OPTIONS, id: "solo", disabled: true, required: true, invalid: true },
			});
			const btn = trigger(container);
			expect(btn.id).toBe("solo");
			expect(btn.disabled).toBe(true);
			expect(btn.getAttribute("aria-required")).toBe("true");
			expect(btn.getAttribute("aria-invalid")).toBe("true");
		});
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays open exactly once when opened by a trigger click, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, { props: { options: OPTIONS, sound: true } });

			await fireEvent.click(trigger(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");
		});

		it("Enter commit plays select exactly once and never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, { props: { options: OPTIONS, sound: true } });
			const btn = trigger(container);

			await fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens, activates Svelte 5
			await fireEvent.keyDown(btn, { key: "ArrowDown" }); // moves to React
			play.mockClear();
			await fireEvent.keyDown(btn, { key: "Enter" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("re-committing the already-selected value plays close (a dismiss), never silence", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, {
				props: { options: OPTIONS, value: "svelte", sound: true },
			});
			const btn = trigger(container);

			await fireEvent.keyDown(btn, { key: "ArrowDown" }); // opens on the selected option
			play.mockClear();
			await fireEvent.keyDown(btn, { key: "Enter" }); // commits nothing new

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("a click commit plays select exactly once and never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, { props: { options: OPTIONS, sound: true } });
			await fireEvent.click(trigger(container));
			play.mockClear();

			await fireEvent.click(optionByLabel("React"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("Tab commit plays select exactly once and never close", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, { props: { options: OPTIONS, sound: true } });
			const btn = trigger(container);
			await fireEvent.click(btn); // opens
			play.mockClear();

			await fireEvent.keyDown(btn, { key: "Tab", cancelable: true });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("Escape plays close exactly once and never select", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, {
				props: { options: OPTIONS, value: "svelte", sound: true },
			});
			const btn = trigger(container);
			await fireEvent.click(btn);
			await fireEvent.keyDown(btn, { key: "ArrowDown" }); // highlight a different option
			play.mockClear();

			await fireEvent.keyDown(document, { key: "Escape" });
			await waitFor(() => expect(panel()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("an outside click plays close exactly once and never select", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const outside = document.createElement("button");
			document.body.appendChild(outside);
			const { container } = render(Select, { props: { options: OPTIONS, sound: true } });
			await fireEvent.click(trigger(container));
			play.mockClear();

			await fireEvent.pointerDown(outside);
			await waitFor(() => expect(panel()).toBeNull());

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
			outside.remove();
		});

		it("closed typeahead commits and plays select once; repeating the same letter that keeps the same match stays silent", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, { props: { options: OPTIONS, sound: true } });
			const btn = trigger(container);

			await fireEvent.keyDown(btn, { key: "v" });
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");

			// Same value re-committed: the same-value early return in setValue
			// stays silent, per contract.
			play.mockClear();
			await fireEvent.keyDown(btn, { key: "v" });
			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing at all with the default prop", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, { props: { options: OPTIONS } });
			const btn = trigger(container);

			await fireEvent.click(btn);
			await fireEvent.click(optionByLabel("React"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even via a synthetic dispatch", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Select, {
				props: { options: OPTIONS, disabled: true, sound: true },
			});
			const btn = trigger(container);

			await fireEvent.click(btn);
			await fireEvent.keyDown(btn, { key: "ArrowDown" });
			await fireEvent.keyDown(btn, { key: "a" });

			expect(play).not.toHaveBeenCalled();
		});
	});

	// The panel's entrance is the shared `anchored` transition, and its growth
	// origin follows the side the panel was ACTUALLY placed on rather than the
	// side it asked for. jsdom makes that deterministic: every rect measures
	// 0×0, so a requested `bottom` never overflows the 768px-tall default
	// viewport and never flips, while a requested `top` always overflows
	// (`anchor.top - height - offset` is `-4`) and always does.
	describe("entrance", () => {
		function stubReducedMotion(): void {
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

		afterEach(() => {
			vi.unstubAllGlobals();
			vi.restoreAllMocks();
		});

		it("publishes the resolved placement as data-side/data-align and grows from the matching origin", async () => {
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Select, { props: { options: OPTIONS } });

			await fireEvent.click(trigger(container));
			await tick();

			const el = panel() as HTMLElement;
			expect(el.getAttribute("data-side")).toBe("bottom");
			expect(el.getAttribute("data-align")).toBe("start");
			expect(el.style.getPropertyValue("transform-origin")).toBe("left top");
			// Pins the positive case too: without it the reduced-motion test
			// below would pass for the wrong reason — an entrance that never
			// runs at all under any preference.
			expect(animate).toHaveBeenCalled();
		});

		it("follows a flipped placement rather than the requested side", async () => {
			const { container } = render(Select, {
				props: { options: OPTIONS, side: "top", align: "end" },
			});

			await fireEvent.click(trigger(container));
			await tick();

			// Asked for `top`, placed on `bottom`: the panel now hangs below
			// the trigger, so it has to grow out of its own top edge. Reading
			// the requested side here would point the origin at the bottom
			// edge and the panel would appear to fall upward into place.
			const el = panel() as HTMLElement;
			expect(el.getAttribute("data-side")).toBe("bottom");
			expect(el.getAttribute("data-align")).toBe("end");
			expect(el.style.getPropertyValue("transform-origin")).toBe("right top");
		});

		it("runs no animation at all under prefers-reduced-motion, and the panel still appears", async () => {
			stubReducedMotion();
			const animate = vi.spyOn(Element.prototype, "animate");
			const { container } = render(Select, { props: { options: OPTIONS } });

			await fireEvent.click(trigger(container));
			await tick();

			// A zero duration makes Svelte skip `element.animate()` outright
			// instead of running a zero-length animation, and the panel's
			// visibility never depended on the entrance in the first place.
			expect(animate).not.toHaveBeenCalled();
			expect(panel()).not.toBeNull();
		});
	});
});
