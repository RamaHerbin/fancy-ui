import { render, screen, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Confetti from "./Confetti.svelte";
import ConfettiButton from "./ConfettiButton.svelte";
import { sound } from "../sound/sound.svelte.js";

// canvas-confetti requires actual canvas context which jsdom doesn't support,
// so we mock the module and just test DOM structure. The real package's
// default export is itself callable (the global one-off fire used when no
// <Confetti> instance is in context) AND carries `.create` (the per-canvas
// instance factory `<Confetti>` uses) — both are mocked here so ConfettiButton
// works whether or not it is rendered inside a `<Confetti>` context.
vi.mock("canvas-confetti", () => {
	const globalFire = vi.fn();
	const mocked = globalFire as typeof globalFire & {
		create: () => ReturnType<typeof vi.fn> & { reset: ReturnType<typeof vi.fn> };
	};
	mocked.create = () => {
		const fn = vi.fn() as ReturnType<typeof vi.fn> & {
			reset: ReturnType<typeof vi.fn>;
		};
		fn.reset = vi.fn();
		return fn;
	};
	return { default: mocked };
});

describe("Confetti", () => {
	afterEach(cleanup);

	it("renders canvas element", () => {
		const { container } = render(Confetti);
		const canvas = container.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	it("renders wrapper div", () => {
		const { container } = render(Confetti);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
		expect(div.tagName).toBe("DIV");
	});

	it("applies custom class to canvas", () => {
		const { container } = render(Confetti, { props: { class: "my-confetti" } });
		const canvas = container.querySelector("canvas") as HTMLElement;
		expect(canvas?.className).toContain("my-confetti");
	});

	it("canvas is inside wrapper div", () => {
		const { container } = render(Confetti);
		const div = container.firstElementChild as HTMLElement;
		const canvas = div?.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays the press cue exactly once when sound is enabled and ConfettiButton is clicked", async () => {
			render(ConfettiButton, { props: { sound: true } });

			await fireEvent.click(screen.getByRole("button"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			render(ConfettiButton);

			await fireEvent.click(screen.getByRole("button"));

			expect(play).not.toHaveBeenCalled();
		});

		// The burst reads celebratory, but guardrail 7 says a click that resolves
		// nothing gets `press`, never `success` — this pins the exact cue rather
		// than merely asserting "something played".
		it("plays press, never success, on click", async () => {
			render(ConfettiButton, { props: { sound: true } });

			await fireEvent.click(screen.getByRole("button"));

			expect(play).not.toHaveBeenCalledWith("success");
			expect(play).toHaveBeenCalledWith("press");
		});

		// <Confetti> auto-fires its burst on mount unless `manualStart` is set.
		// ConfettiButton owns the only cue in this family; Confetti's own mount
		// auto-fire (and any imperative `fire()` call) must stay silent even
		// though this is the same celebratory burst.
		it("plays nothing when Confetti mounts and auto-fires", () => {
			render(Confetti);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
