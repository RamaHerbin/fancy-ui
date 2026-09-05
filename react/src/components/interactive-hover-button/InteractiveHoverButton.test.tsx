import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { InteractiveHoverButton } from "./InteractiveHoverButton.js";
import { sound } from "../../sound/sound.js";

describe("InteractiveHoverButton", () => {
	afterEach(cleanup);

	it("renders a button element", () => {
		render(<InteractiveHoverButton />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it('renders default text "Button" when no text prop is provided', () => {
		render(<InteractiveHoverButton />);
		const button = screen.getByRole("button");
		expect(button).toHaveTextContent("Button");
	});

	it("renders custom text from the text prop", () => {
		render(<InteractiveHoverButton text="Get Started" />);
		const button = screen.getByRole("button");
		expect(button).toHaveTextContent("Get Started");
	});

	it("displays the text twice (initial + hover overlay)", () => {
		render(<InteractiveHoverButton text="Subscribe" />);
		const matches = screen.getAllByText("Subscribe");
		expect(matches).toHaveLength(2);
	});

	it("exposes the label once in the accessible name, not twice", () => {
		render(<InteractiveHoverButton text="Subscribe" />);
		// The hover-overlay copy is aria-hidden, so only the resting label
		// contributes to the accessible name — a screen reader must announce
		// "Subscribe", not "Subscribe Subscribe".
		const button = screen.getByRole("button", { name: "Subscribe" });
		expect(button.getAttribute("aria-label")).not.toBe("Subscribe Subscribe");
	});

	it("renders the arrow SVG icon", () => {
		render(<InteractiveHoverButton />);
		const button = screen.getByRole("button");
		const svg = button.querySelector("svg");
		expect(svg).toBeInTheDocument();
		expect(svg?.querySelectorAll("path")).toHaveLength(2);
	});

	it("applies custom class names", () => {
		render(<InteractiveHoverButton className="my-custom-class" />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("my-custom-class");
	});

	it("preserves base classes when custom class is added", () => {
		render(<InteractiveHoverButton className="extra" />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("overflow-hidden");
		expect(button.className).toContain("rounded-full");
	});

	it("forwards native button attributes", () => {
		render(<InteractiveHoverButton disabled type="submit" aria-label="Sign up" />);
		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("type", "submit");
		expect(button).toHaveAttribute("aria-label", "Sign up");
	});

	it("contains the dot element with bg-primary class", () => {
		render(<InteractiveHoverButton />);
		const button = screen.getByRole("button");
		const dot = button.querySelector(".bg-primary");
		expect(dot).toBeInTheDocument();
	});

	it("has hover overlay with translate and opacity classes", () => {
		render(<InteractiveHoverButton />);
		const button = screen.getByRole("button");
		const overlay = button.querySelector(".translate-x-12.opacity-0");
		expect(overlay).toBeInTheDocument();
	});

	// The reduced-motion branch is pure CSS: `motion-safe:` is Tailwind's
	// spelling of `@media (prefers-reduced-motion: no-preference)`, and jsdom
	// computes neither the media query nor the utility behind it. What a test
	// can pin is that the gate is actually on every transition utility, and on
	// none of the transforms — the hover state must still arrive under reduced
	// motion, it just must not travel there.
	it("gates every transition utility behind motion-safe, and no transform with it", () => {
		render(<InteractiveHoverButton />);
		const button = screen.getByRole("button");

		const animated = Array.from(button.querySelectorAll<HTMLElement>("*")).filter((el) =>
			/\btransition-|\bduration-/.test(el.className)
		);
		expect(animated).toHaveLength(3);

		for (const el of animated) {
			expect(el.className).not.toMatch(/(^|\s)transition-/);
			expect(el.className).not.toMatch(/(^|\s)duration-/);
			expect(el.className).toContain("motion-safe:transition-all");
			expect(el.className).toContain("motion-safe:duration-300");
		}

		// The state itself is never gated — these are the classes that make the
		// hover readable at all, and one of them is what the overlay test above
		// already pins.
		expect(button.querySelector(".group-hover\\:scale-\\[100\\.8\\]")).toBeInTheDocument();
		expect(button.querySelector(".translate-x-12.opacity-0")).toBeInTheDocument();
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays the press cue exactly once when sound is enabled and the button is clicked", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<InteractiveHoverButton sound />);

			fireEvent.click(screen.getByRole("button"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<InteractiveHoverButton />);

			fireEvent.click(screen.getByRole("button"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<InteractiveHoverButton sound disabled />);
			const button = screen.getByRole("button");

			// Synthetic dispatch bypasses jsdom's native-disabled short-circuit,
			// proving the guard is the JS `disabled` check.
			button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		// This component's signature interaction is a hover reveal, but the hover
		// cue is reserved for use:soundFeedback (guardrail 13) — the identity
		// gesture must stay silent even though it's the whole point of the button.
		it("plays nothing on hover — the hover reveal stays silent even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<InteractiveHoverButton sound />);
			const button = screen.getByRole("button");

			fireEvent.mouseEnter(button);
			fireEvent.pointerEnter(button);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
