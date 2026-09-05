import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { Confetti } from "./Confetti.js";
import { ConfettiButton } from "./ConfettiButton.js";
import { resetSoundForTests, sound } from "../../sound/sound.js";

// canvas-confetti requires actual canvas context which jsdom doesn't support,
// so we mock the module and just test DOM structure. The real package's
// default export is itself callable (the global one-off fire used when no
// `Confetti` instance is in context) AND carries `.create` (the per-canvas
// instance factory `Confetti` uses) — both are mocked here so ConfettiButton
// works whether or not it is rendered inside a `Confetti` context.
const mocks = vi.hoisted(() => {
	const instance = Object.assign(vi.fn(), { reset: vi.fn() });
	const globalFire = vi.fn();
	return { instance, globalFire };
});

vi.mock("canvas-confetti", () => {
	const mocked = mocks.globalFire as typeof mocks.globalFire & {
		create: () => typeof mocks.instance;
	};
	mocked.create = () => mocks.instance;
	return { default: mocked };
});

/**
 * jsdom gives every element a zero rect, which would make the computed origin
 * `{ x: 0, y: 0 }` and hide any arithmetic mistake. Pinning a real rect makes
 * the centre-of-the-button maths observable.
 */
function stubRect(el: HTMLElement, left: number, top: number, width: number, height: number) {
	el.getBoundingClientRect = () =>
		({
			left,
			top,
			width,
			height,
			right: left + width,
			bottom: top + height,
			x: left,
			y: top,
			toJSON: () => ({}),
		}) as DOMRect;
}

describe("Confetti", () => {
	beforeEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
		mocks.instance.mockClear();
		mocks.instance.reset.mockClear();
		mocks.globalFire.mockClear();
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("renders canvas element", () => {
		const { container } = render(<Confetti />);
		const canvas = container.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	it("renders wrapper div", () => {
		const { container } = render(<Confetti />);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
		expect(div.tagName).toBe("DIV");
	});

	it("applies custom class to canvas", () => {
		const { container } = render(<Confetti className="my-confetti" />);
		const canvas = container.querySelector("canvas") as HTMLElement;
		expect(canvas?.className).toContain("my-confetti");
	});

	it("canvas is inside wrapper div", () => {
		const { container } = render(<Confetti />);
		const div = container.firstElementChild as HTMLElement;
		const canvas = div?.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	describe("ConfettiButton", () => {
		it("renders a native button and fires the module-level confetti from its centre", () => {
			render(<ConfettiButton>Celebrate</ConfettiButton>);

			const button = screen.getByRole("button", { name: "Celebrate" });
			expect(button).toBeInTheDocument();
			expect(button.tagName).toBe("BUTTON");

			stubRect(button, 100, 200, 40, 20);
			fireEvent.click(button);

			expect(mocks.globalFire).toHaveBeenCalledTimes(1);
			expect(mocks.globalFire).toHaveBeenCalledWith({
				origin: { x: 120 / window.innerWidth, y: 210 / window.innerHeight },
			});
		});

		it("fires the surrounding root's canvas instead of the module-level confetti when nested", () => {
			render(
				<Confetti manualStart>
					<ConfettiButton>Celebrate</ConfettiButton>
				</Confetti>
			);

			const button = screen.getByRole("button", { name: "Celebrate" });
			stubRect(button, 100, 200, 40, 20);
			fireEvent.click(button);

			expect(mocks.instance).toHaveBeenCalledTimes(1);
			expect(mocks.instance).toHaveBeenCalledWith({
				origin: { x: 120 / window.innerWidth, y: 210 / window.innerHeight },
			});
			expect(mocks.globalFire).not.toHaveBeenCalled();
		});
	});

	describe("sound", () => {
		it("plays the press cue exactly once when sound is enabled and ConfettiButton is clicked", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<ConfettiButton sound>Celebrate</ConfettiButton>);

			fireEvent.click(screen.getByRole("button"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<ConfettiButton>Celebrate</ConfettiButton>);

			fireEvent.click(screen.getByRole("button"));

			expect(play).not.toHaveBeenCalled();
		});

		// The burst reads celebratory, but guardrail 7 says a click that resolves
		// nothing gets `press`, never `success` — this pins the exact cue rather
		// than merely asserting "something played".
		it("plays press, never success, on click", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<ConfettiButton sound>Celebrate</ConfettiButton>);

			fireEvent.click(screen.getByRole("button"));

			expect(play).not.toHaveBeenCalledWith("success", undefined);
			expect(play).toHaveBeenCalledWith("press", undefined);
		});

		// `Confetti` auto-fires its burst on mount unless `manualStart` is set.
		// ConfettiButton owns the only cue in this family; Confetti's own mount
		// auto-fire (and any imperative `fire()` call) must stay silent even
		// though this is the same celebratory burst.
		it("plays nothing when Confetti mounts and auto-fires", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			render(<Confetti />);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
