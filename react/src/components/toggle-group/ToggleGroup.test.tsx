import { createRef, useState } from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { resetSoundForTests, sound } from "../../sound/sound.js";
import { ToggleGroup } from "./ToggleGroup.js";
import { ToggleGroupItem } from "./ToggleGroupItem.js";

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

/**
 * Test-only rig, the counterpart of the Svelte suite's `*.test.svelte`
 * harness. The keyboard model lives across ToggleGroup and ToggleGroupItem
 * together, so proving it needs real instances of both, wired up the way a
 * consumer actually would. The Svelte harness forwards `bind:value` through
 * its own bindable prop so a test can round-trip a selection; here the same
 * round trip is a plain piece of state the harness owns and reports back
 * through `onValueChange`.
 */
interface HarnessProps {
	items: Item[];
	type?: "single" | "multiple";
	value?: string | string[];
	onValueChange?: (value: string | string[]) => void;
	disabled?: boolean;
	size?: "sm" | "md" | "lg";
	orientation?: "horizontal" | "vertical";
	label?: string;
	sound?: boolean;
}

function Harness({
	items,
	type = "single",
	value: initialValue = "",
	onValueChange,
	disabled = false,
	size = "md",
	orientation = "horizontal",
	label = "Test group",
	sound = false,
}: HarnessProps) {
	// Seeded from the prop and owned from then on, exactly as the Svelte
	// harness's `$bindable` initial value is.
	const [value, setValue] = useState<string | string[]>(initialValue);

	return (
		<ToggleGroup
			type={type}
			value={value}
			onValueChange={(next) => {
				setValue(next);
				onValueChange?.(next);
			}}
			disabled={disabled}
			size={size}
			orientation={orientation}
			label={label}
			sound={sound}
		>
			{items.map((item) => (
				<ToggleGroupItem key={item.value} value={item.value} disabled={item.disabled}>
					{item.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

function group(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="group"]') as HTMLElement;
}

function buttons(container: HTMLElement): HTMLButtonElement[] {
	return Array.from(container.querySelectorAll("button"));
}

function byLabel(container: HTMLElement, label: string): HTMLButtonElement {
	return buttons(container).find((b) => b.textContent === label) as HTMLButtonElement;
}

function tabbable(container: HTMLElement): HTMLButtonElement | undefined {
	return buttons(container).find((b) => b.getAttribute("tabindex") === "0");
}

describe("ToggleGroup", () => {
	afterEach(cleanup);

	// Regression guard for a reactivity loop that previously hit on every
	// mount: `register`/`unregister` run inside each item's own effect, and
	// depending on the shared registry — or, in React, on a context object the
	// root rebuilds every render — makes that effect re-run in response to the
	// very write its own call caused. Cleanup (unregister) and body (register)
	// then alternate forever, and because the loop is a tight synchronous one
	// it starves the event loop long enough to read as a multi-second hang
	// rather than a clean, fast test failure. A mount-then-timeout style test
	// cannot pin that down reliably. What can: registration is fully
	// synchronous, so the observable it produces — the roving-focus registry —
	// has to be correct the instant `render()` returns, with no extra flush
	// and no unbounded number of passes to get there.
	it("settles registration in one pass on mount, including with a disabled item in the mix", () => {
		const items: Item[] = [
			{ value: "a", label: "A" },
			{ value: "b", label: "B", disabled: true },
			{ value: "c", label: "C" },
		];
		const { container } = render(<Harness items={items} />);

		// Exactly one tabbable item, and it is the first *enabled* one — proof
		// the registry holds exactly {a, c}, not empty, not a duplicate, and
		// not stuck mid-alternation between register and unregister.
		const zeroed = buttons(container).filter((b) => b.getAttribute("tabindex") === "0");
		expect(zeroed).toHaveLength(1);
		expect(zeroed[0]!.textContent).toBe("A");

		// Reachable on the very first arrow press only if both enabled items
		// actually made it into the registry.
		fireEvent.keyDown(byLabel(container, "A"), { key: "ArrowRight" });
		expect(document.activeElement).toBe(byLabel(container, "C"));
	});

	it("renders a group with the given accessible name and the items inside it", () => {
		const { container } = render(<Harness items={ITEMS} label="Text alignment" />);
		const root = group(container);

		expect(root).toBeTruthy();
		expect(root.getAttribute("aria-label")).toBe("Text alignment");
		expect(buttons(container)).toHaveLength(3);
	});

	it("renders items as real buttons carrying aria-pressed", () => {
		const { container } = render(<Harness items={ITEMS} />);
		for (const button of buttons(container)) {
			expect(button.getAttribute("type")).toBe("button");
			expect(button.hasAttribute("aria-pressed")).toBe(true);
		}
	});

	it("gives exactly one item tabindex 0, defaulting to the first", () => {
		const { container } = render(<Harness items={ITEMS} />);
		const zeroed = buttons(container).filter((b) => b.getAttribute("tabindex") === "0");
		const negative = buttons(container).filter((b) => b.getAttribute("tabindex") === "-1");

		expect(zeroed).toHaveLength(1);
		expect(zeroed[0]!.textContent).toBe("Left");
		expect(negative).toHaveLength(2);
	});

	it("defaults the roving position to the already-selected item", () => {
		const { container } = render(<Harness items={ITEMS} value="center" />);
		expect(tabbable(container)?.textContent).toBe("Center");
	});

	it("selects on click and deselects the same item on a second click, single type", () => {
		const onValueChange = vi.fn();
		const { container } = render(<Harness items={ITEMS} onValueChange={onValueChange} />);
		const center = byLabel(container, "Center");

		fireEvent.click(center);
		expect(center.getAttribute("aria-pressed")).toBe("true");
		expect(onValueChange).toHaveBeenLastCalledWith("center");

		fireEvent.click(center);
		expect(center.getAttribute("aria-pressed")).toBe("false");
		expect(onValueChange).toHaveBeenLastCalledWith("");
	});

	it("moves the selection to a different item, single type, clearing the previous one", () => {
		const { container } = render(<Harness items={ITEMS} value="left" />);
		expect(byLabel(container, "Left").getAttribute("aria-pressed")).toBe("true");

		fireEvent.click(byLabel(container, "Right"));
		expect(byLabel(container, "Left").getAttribute("aria-pressed")).toBe("false");
		expect(byLabel(container, "Right").getAttribute("aria-pressed")).toBe("true");
	});

	it("toggles independently and fires onValueChange with an array, multiple type", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<Harness items={ITEMS} type="multiple" onValueChange={onValueChange} />
		);

		fireEvent.click(byLabel(container, "Left"));
		fireEvent.click(byLabel(container, "Right"));

		expect(byLabel(container, "Left").getAttribute("aria-pressed")).toBe("true");
		expect(byLabel(container, "Center").getAttribute("aria-pressed")).toBe("false");
		expect(byLabel(container, "Right").getAttribute("aria-pressed")).toBe("true");
		expect(onValueChange).toHaveBeenLastCalledWith(["left", "right"]);

		fireEvent.click(byLabel(container, "Left"));
		expect(byLabel(container, "Left").getAttribute("aria-pressed")).toBe("false");
		expect(onValueChange).toHaveBeenLastCalledWith(["right"]);
	});

	it("moves forward with ArrowRight and ArrowDown, wrapping at the end", () => {
		const { container } = render(<Harness items={ITEMS} />);
		const left = byLabel(container, "Left");

		fireEvent.keyDown(left, { key: "ArrowRight" });
		expect(document.activeElement).toBe(byLabel(container, "Center"));

		fireEvent.keyDown(byLabel(container, "Center"), { key: "ArrowDown" });
		expect(document.activeElement).toBe(byLabel(container, "Right"));

		fireEvent.keyDown(byLabel(container, "Right"), { key: "ArrowRight" });
		expect(document.activeElement).toBe(left);
	});

	it("moves backward with ArrowLeft and ArrowUp, wrapping at the start", () => {
		const { container } = render(<Harness items={ITEMS} />);
		const left = byLabel(container, "Left");

		fireEvent.keyDown(left, { key: "ArrowLeft" });
		expect(document.activeElement).toBe(byLabel(container, "Right"));

		fireEvent.keyDown(byLabel(container, "Right"), { key: "ArrowUp" });
		expect(document.activeElement).toBe(byLabel(container, "Center"));
	});

	it("keeps both arrow-key pairs working in vertical orientation", () => {
		const { container } = render(<Harness items={ITEMS} orientation="vertical" />);
		const left = byLabel(container, "Left");

		fireEvent.keyDown(left, { key: "ArrowDown" });
		expect(document.activeElement).toBe(byLabel(container, "Center"));

		fireEvent.keyDown(byLabel(container, "Center"), { key: "ArrowRight" });
		expect(document.activeElement).toBe(byLabel(container, "Right"));
	});

	it("jumps to the first and last item with Home and End", () => {
		const { container } = render(<Harness items={ITEMS} />);
		const center = byLabel(container, "Center");

		fireEvent.keyDown(center, { key: "End" });
		expect(document.activeElement).toBe(byLabel(container, "Right"));

		fireEvent.keyDown(byLabel(container, "Right"), { key: "Home" });
		expect(document.activeElement).toBe(byLabel(container, "Left"));
	});

	it("moves the roving tabindex along with DOM focus, not just internal state", () => {
		const { container } = render(<Harness items={ITEMS} />);
		const left = byLabel(container, "Left");

		fireEvent.keyDown(left, { key: "ArrowRight" });

		expect(document.activeElement).toBe(byLabel(container, "Center"));
		expect(byLabel(container, "Left").getAttribute("tabindex")).toBe("-1");
		expect(byLabel(container, "Center").getAttribute("tabindex")).toBe("0");
	});

	it("moves DOM focus and the roving tabindex to the clicked item, not just the selection", () => {
		// jsdom's fireEvent.click does not synthesise a focus event the way a
		// real click does in most browsers, and macOS Safari does not focus a
		// clicked <button> even in the real thing — so this only passes if
		// ToggleGroupItem's click handler moves focus itself rather than
		// leaving it to an incidental focus handler. Deleting the explicit
		// `.focus()` call would leave every other test in this file green.
		const { container } = render(<Harness items={ITEMS} />);
		const right = byLabel(container, "Right");

		fireEvent.click(right);

		expect(document.activeElement).toBe(right);
		expect(right.getAttribute("tabindex")).toBe("0");
		expect(byLabel(container, "Left").getAttribute("tabindex")).toBe("-1");
	});

	it("skips disabled items with the arrows and with Home/End", () => {
		const items: Item[] = [
			{ value: "left", label: "Left" },
			{ value: "center", label: "Center", disabled: true },
			{ value: "right", label: "Right" },
		];
		const { container } = render(<Harness items={items} />);
		const left = byLabel(container, "Left");

		fireEvent.keyDown(left, { key: "ArrowRight" });
		expect(document.activeElement).toBe(byLabel(container, "Right"));

		fireEvent.keyDown(byLabel(container, "Right"), { key: "Home" });
		expect(document.activeElement).toBe(left);

		fireEvent.keyDown(left, { key: "End" });
		expect(document.activeElement).toBe(byLabel(container, "Right"));
	});

	it("never gives a disabled item tabindex 0, even when it is first in the list", () => {
		const items: Item[] = [
			{ value: "left", label: "Left", disabled: true },
			{ value: "right", label: "Right" },
		];
		const { container } = render(<Harness items={items} />);

		expect(byLabel(container, "Left").getAttribute("tabindex")).toBe("-1");
		expect(byLabel(container, "Right").getAttribute("tabindex")).toBe("0");
	});

	it("marks a disabled item with the native disabled attribute and blocks its click", () => {
		const onValueChange = vi.fn();
		const items: Item[] = [{ value: "a", label: "A", disabled: true }];
		const { container } = render(<Harness items={items} onValueChange={onValueChange} />);
		const a = byLabel(container, "A");

		expect(a.disabled).toBe(true);
		fireEvent.click(a);
		expect(onValueChange).not.toHaveBeenCalled();
		expect(a.getAttribute("aria-pressed")).toBe("false");
	});

	it("lets a single item be disabled independent of the group", () => {
		const items: Item[] = [
			{ value: "a", label: "A", disabled: true },
			{ value: "b", label: "B" },
		];
		const { container } = render(<Harness items={items} />);

		expect(byLabel(container, "A").disabled).toBe(true);
		expect(byLabel(container, "B").disabled).toBe(false);
	});

	it("stays inert with no crash when every item is disabled", () => {
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
		const { container } = render(<Harness items={items} />);
		const all = buttons(container);

		expect(all).toHaveLength(3);
		for (const button of all) {
			expect(button.disabled).toBe(true);
			expect(button.getAttribute("tabindex")).toBe("-1");
		}

		fireEvent.keyDown(all[0]!, { key: "ArrowRight" });
		fireEvent.keyDown(all[0]!, { key: "Home" });
		fireEvent.keyDown(all[0]!, { key: "End" });
		expect(document.activeElement).toBe(document.body);
	});

	it("keeps a single-type group down to one active item even if value arrives as an array", () => {
		// Guards `toArray`'s type-based branch: `type="single"` must take at
		// most the first entry, not let every id in a stray array read as
		// selected.
		const { container } = render(<Harness items={ITEMS} value={["left", "right"]} />);

		expect(byLabel(container, "Left").getAttribute("aria-pressed")).toBe("true");
		expect(byLabel(container, "Right").getAttribute("aria-pressed")).toBe("false");
	});

	it("disables every item when the group itself is disabled", () => {
		const { container } = render(<Harness items={ITEMS} disabled />);
		expect(buttons(container).every((b) => b.disabled)).toBe(true);
	});

	it("keeps the arrow sequence in DOM order after items are reordered, not registration order", () => {
		const { container, rerender } = render(<Harness items={ITEMS} />);

		// Registration order is still Left, Center, Right — only the DOM order
		// changes.
		rerender(<Harness items={[...ITEMS].reverse()} />);

		const left = byLabel(container, "Left");
		fireEvent.keyDown(left, { key: "ArrowRight" });

		// Left is now the last button on screen, so the next one, wrapping, is
		// the first — Right. Stale registration order would have said Center.
		expect(document.activeElement).toBe(byLabel(container, "Right"));
	});

	it("reassigns the roving position when the item holding it unmounts", () => {
		const { container, rerender } = render(<Harness items={ITEMS} />);
		const center = byLabel(container, "Center");
		fireEvent.focus(center);
		expect(tabbable(container)).toBe(center);

		rerender(<Harness items={ITEMS.filter((item) => item.value !== "center")} />);

		expect(tabbable(container)).toBeTruthy();
		expect(tabbable(container)?.textContent).not.toBe("Center");
	});

	it("round-trips a single selection through the value channel", () => {
		// The Svelte suite binds `value` through the harness's own bindable
		// prop; the React harness owns that state and reports every write
		// back out, which is the same round trip through the only channel
		// React has for it.
		let value: string | string[] = "";
		const { container } = render(
			<Harness
				items={ITEMS}
				onValueChange={(next) => {
					value = next;
				}}
			/>
		);

		fireEvent.click(byLabel(container, "Center"));
		expect(value).toBe("center");

		fireEvent.click(byLabel(container, "Center"));
		expect(value).toBe("");
	});

	it("round-trips a multiple selection through the value channel", () => {
		let value: string | string[] = [];
		const { container } = render(
			<Harness
				items={ITEMS}
				type="multiple"
				onValueChange={(next) => {
					value = next;
				}}
			/>
		);

		fireEvent.click(byLabel(container, "Left"));
		fireEvent.click(byLabel(container, "Right"));
		expect(value).toEqual(["left", "right"]);

		fireEvent.click(byLabel(container, "Left"));
		expect(value).toEqual(["right"]);
	});

	it.each([
		["sm", "h-[26px]"],
		["md", "h-[30px]"],
		["lg", "h-[34px]"],
	] as const)("sizes %s to the matching height class", (size, heightClass) => {
		const { container } = render(<Harness items={ITEMS} size={size} />);
		expect(byLabel(container, "Left").className).toContain(heightClass);
	});

	it("merges the class prop with the base classes on the root", () => {
		const { container } = render(<ToggleGroup className="mt-4" />);
		const root = group(container);

		expect(root.className).toContain("ft-toggle-group");
		expect(root.className).toContain("mt-4");
	});

	it("exposes the root element through the ref", () => {
		const ref = createRef<HTMLDivElement>();
		const { container } = render(<ToggleGroup ref={ref} />);

		expect(ref.current).toBe(group(container));
	});

	it("falls back to the value as content when neither children nor label is given", () => {
		const { container } = render(<ToggleGroupItem value="x" />);
		expect(container.querySelector("button")?.textContent).toBe("x");
	});

	it("renders custom children over the label/value fallback", () => {
		const { container } = render(
			<ToggleGroupItem value="x" label="Ex">
				<span data-testid="glyph">×</span>
			</ToggleGroupItem>
		);
		expect(container.querySelector('[data-testid="glyph"]')).toBeTruthy();
	});

	// The colocated stylesheet declares a `transition` shorthand on the item.
	// Those rules are unlayered and Tailwind's utilities sit in
	// `@layer utilities`, so leaving `transition-colors` on the class string
	// would read as a colour transition that silently never ran.
	it("drops the transition-colors utility from the item in favour of the hand-written channel", () => {
		const { container } = render(<Harness items={ITEMS} />);
		expect(byLabel(container, "Left").className).not.toContain("transition-colors");
		expect(byLabel(container, "Left").className).toContain("ft-toggle-group-item");
	});

	// The press feedback is a `:active` rule keyed on `.ft-toggle-group-item`.
	// jsdom computes neither `:active` nor `@media`, so what a test can pin is
	// that the class the CSS hangs off is on every item, selected or not.
	it("keeps the press-feedback class hook on every item regardless of selection", () => {
		const { container } = render(<Harness items={ITEMS} value="left" />);

		for (const el of buttons(container)) {
			expect(el.className).toContain("ft-toggle-group-item");
		}
	});

	it("reduced motion: selection still round-trips through aria-pressed", () => {
		const real = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			...real(query),
			matches: true,
		})) as typeof window.matchMedia;

		try {
			const { container } = render(<Harness items={ITEMS} />);
			const left = byLabel(container, "Left");

			// Reduced motion swaps the press scale for an opacity fade; neither is
			// observable in jsdom. What is observable is that nothing about the
			// state contract is gated on the preference.
			expect(left.getAttribute("aria-pressed")).toBe("false");
			fireEvent.click(left);
			expect(left.getAttribute("aria-pressed")).toBe("true");
		} finally {
			window.matchMedia = real;
		}
	});

	it("renders an item outside a group harmlessly, unselected and without a roving tabindex", () => {
		const { container } = render(<ToggleGroupItem value="solo" label="Solo" />);
		const el = container.querySelector("button") as HTMLButtonElement;

		expect(el.getAttribute("aria-pressed")).toBe("false");
		expect(el.hasAttribute("tabindex")).toBe(false);

		// There is no group to toggle; this must not throw.
		fireEvent.click(el);
		expect(el.getAttribute("aria-pressed")).toBe("false");
	});

	describe("sound", () => {
		beforeEach(() => {
			resetSoundForTests();
			window.localStorage.clear();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays select exactly once when picking an item in type=single, with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} sound />);

			fireEvent.click(byLabel(container, "Left"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays select again on clear-on-repick — activating the already-selected item in type=single", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} value="left" sound />);

			fireEvent.click(byLabel(container, "Left"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays toggle-on exactly once when activating an unselected item in type=multiple", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} type="multiple" sound />);

			fireEvent.click(byLabel(container, "Left"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-on", undefined);
		});

		it("plays toggle-off exactly once when deactivating a selected item in type=multiple", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(
				<Harness items={ITEMS} type="multiple" value={["left"]} sound />
			);

			fireEvent.click(byLabel(container, "Left"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-off", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} />);

			fireEvent.click(byLabel(container, "Left"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while the group is disabled, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Harness items={ITEMS} disabled sound />);

			// A synthetic dispatch rather than a real gesture: the native
			// `disabled` attribute is the outer gate, and `toggle`'s own
			// `if (disabled) return` is the one this pins.
			byLabel(container, "Left").dispatchEvent(
				new MouseEvent("click", { bubbles: true, cancelable: true })
			);

			expect(play).not.toHaveBeenCalled();
		});

		it("does not wire the cue in ToggleGroupItem's click handler — an item outside a group plays nothing", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<ToggleGroupItem value="solo" label="Solo" />);
			const el = container.querySelector("button") as HTMLButtonElement;

			fireEvent.click(el);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
