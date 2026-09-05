import { cleanup, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toggle } from "./Toggle.js";
import { ToggleHarness } from "./ToggleHarness.js";
import { resetSoundForTests, sound } from "../../sound/sound.js";

function button(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button") as HTMLButtonElement;
}

describe("Toggle", () => {
	afterEach(cleanup);

	it("renders a real button, unpressed by default", () => {
		const { container } = render(<Toggle />);
		const el = button(container);

		expect(el.getAttribute("type")).toBe("button");
		expect(el.getAttribute("aria-pressed")).toBe("false");
	});

	it("reflects a pressed prop through aria-pressed", () => {
		const { container } = render(<Toggle pressed={true} />);
		expect(button(container).getAttribute("aria-pressed")).toBe("true");
	});

	it("flips the pressed state and calls onPressedChange exactly once with the new value", async () => {
		const onPressedChange = vi.fn();
		function Controlled() {
			const [pressed, setPressed] = useState(false);
			return (
				<Toggle
					pressed={pressed}
					onPressedChange={(next: boolean) => {
						onPressedChange(next);
						setPressed(next);
					}}
				/>
			);
		}
		const { container } = render(<Controlled />);
		const el = button(container);

		await fireEvent.click(el);
		expect(el.getAttribute("aria-pressed")).toBe("true");
		expect(onPressedChange).toHaveBeenCalledTimes(1);
		expect(onPressedChange).toHaveBeenCalledWith(true);

		await fireEvent.click(el);
		expect(el.getAttribute("aria-pressed")).toBe("false");
		expect(onPressedChange).toHaveBeenCalledTimes(2);
		expect(onPressedChange).toHaveBeenLastCalledWith(false);
	});

	it("works uncontrolled, with neither pressed nor onPressedChange passed in", async () => {
		const { container } = render(<Toggle />);
		const el = button(container);

		expect(el.getAttribute("aria-pressed")).toBe("false");
		await fireEvent.click(el);
		expect(el.getAttribute("aria-pressed")).toBe("true");
	});

	it("blocks both the state change and the callback while disabled", async () => {
		const onPressedChange = vi.fn();
		const { container } = render(
			<Toggle pressed={false} disabled onPressedChange={onPressedChange} />
		);
		const el = button(container);

		expect(el.disabled).toBe(true);
		await fireEvent.click(el);

		expect(el.getAttribute("aria-pressed")).toBe("false");
		expect(onPressedChange).not.toHaveBeenCalled();
	});

	it("round-trips pressed through the controlled harness", async () => {
		const { container, getByTestId } = render(<ToggleHarness />);
		const el = button(container);

		expect(getByTestId("bound-pressed").textContent).toBe("false");
		await fireEvent.click(el);
		expect(getByTestId("bound-pressed").textContent).toBe("true");
		expect(el.getAttribute("aria-pressed")).toBe("true");
	});

	it.each([
		["sm", "30px", "6px"],
		["md", "36px", "8px"],
		["lg", "42px", "10px"],
	] as const)("sizes %s to a %s square with a %s radius", (size, boxSize, radius) => {
		const { container } = render(<Toggle size={size} />);
		const el = button(container);

		expect(el.className).toContain(`size-[${boxSize}]`);
		expect(el.className).toContain(`rounded-[${radius}]`);
	});

	it("defaults to the ghost variant, with no border class", () => {
		const { container } = render(<Toggle />);
		expect(button(container).className).not.toContain("border-border");
	});

	it("applies a resting border for the outline variant", () => {
		const { container } = render(<Toggle variant="outline" />);
		expect(button(container).className).toContain("border-border");
	});

	it("sets aria-label from the label prop, for icon-only content", () => {
		const { container } = render(<Toggle label="Bold" />);
		expect(button(container).getAttribute("aria-label")).toBe("Bold");
	});

	it("omits aria-label when none is given, leaving the accessible name to the content", () => {
		const { container } = render(<Toggle />);
		expect(button(container).hasAttribute("aria-label")).toBe(false);
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(<Toggle className="mt-4" />);
		const cls = button(container).className;

		expect(cls).toContain("ft-toggle");
		expect(cls).toContain("mt-4");
	});

	// The pressed ring moved from the button's own `box-shadow` to a `::before`
	// pseudo so the button's shadow can stay the untransitioned focus ring.
	// jsdom computes neither pseudo-elements nor `@media` blocks, so what a test
	// can pin is the state contract that drives them: `aria-pressed` is still
	// the only hook the CSS selects on, and it still flips exactly when it did.
	it("keeps aria-pressed as the sole hook for the pressed ring", async () => {
		const { container } = render(<Toggle pressed={false} />);
		const el = button(container);

		expect(el.getAttribute("aria-pressed")).toBe("false");
		await fireEvent.click(el);
		expect(el.getAttribute("aria-pressed")).toBe("true");
	});

	// The colocated CSS declares a `transition` shorthand on this same
	// element, loaded after Tailwind's utility layer, so leaving
	// `transition-colors` on the class string would read as a colour
	// transition that silently never ran.
	it("drops the transition-colors utility in favour of the hand-written channel", () => {
		const { container } = render(<Toggle />);
		expect(button(container).className).not.toContain("transition-colors");
	});

	it("reduced motion: the press and pressed-state contract is unchanged", async () => {
		const real = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			...real(query),
			matches: true,
		})) as typeof window.matchMedia;

		try {
			const onPressedChange = vi.fn();
			const { container } = render(<Toggle pressed={false} onPressedChange={onPressedChange} />);
			const el = button(container);

			// The press scale is declared only inside `no-preference`; the
			// opacity fallback outside it still fires. Neither is observable in
			// jsdom — what is observable is that the state change itself is not
			// gated on the preference in any way.
			await fireEvent.click(el);
			expect(el.getAttribute("aria-pressed")).toBe("true");
			expect(onPressedChange).toHaveBeenCalledWith(true);
		} finally {
			window.matchMedia = real;
		}
	});

	it("round-trips the button element through the forwarded ref", () => {
		// The harness marks whatever comes out of the ref; finding the mark on
		// the rendered button is what proves the two are the same element.
		const { container } = render(<ToggleHarness />);
		expect(button(container).getAttribute("data-bound-ref")).toBe("yes");
	});

	describe("sound", () => {
		beforeEach(() => {
			resetSoundForTests();
			window.localStorage.clear();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays toggle-on exactly once when activating while off, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Toggle sound pressed={false} />);

			await fireEvent.click(button(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-on", undefined);
		});

		it("plays toggle-off exactly once when activating while on, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Toggle sound pressed={true} />);

			await fireEvent.click(button(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("toggle-off", undefined);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Toggle pressed={false} />);

			await fireEvent.click(button(container));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<Toggle sound disabled pressed={false} />);
			const el = button(container);

			el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});
	});
});
