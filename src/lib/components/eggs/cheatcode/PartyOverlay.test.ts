import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import confetti from "canvas-confetti";
import PartyOverlay from "./PartyOverlay.svelte";
import type { EggContext } from "../types.js";

vi.mock("canvas-confetti", () => ({
	default: Object.assign(vi.fn(), {
		create: vi.fn(() => Object.assign(vi.fn(), { reset: vi.fn() })),
	}),
}));

const cancelJingle = vi.fn();
vi.mock("./jingle.js", () => ({ playJingle: vi.fn(async () => cancelJingle) }));

const create = vi.mocked(confetti.create);

function makeCtx(reducedMotion = false): EggContext {
	return {
		id: "cheatcode",
		reducedMotion,
		dismiss: vi.fn(),
		found: vi.fn(),
		trigger: vi.fn(async () => {}),
	};
}

describe("PartyOverlay", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		create.mockClear();
		cancelJingle.mockClear();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("bursts, streams, stops emitting and resets on unmount", async () => {
		const { container, unmount } = render(PartyOverlay, { props: { ctx: makeCtx() } });
		expect(container.querySelector("canvas")).not.toBeNull();
		expect(create).toHaveBeenCalledTimes(1);
		const fire = create.mock.results[0]!.value as ReturnType<typeof vi.fn> & {
			reset: ReturnType<typeof vi.fn>;
		};

		vi.advanceTimersByTime(1000);
		expect(fire.mock.calls.length).toBeGreaterThanOrEqual(2);

		vi.advanceTimersByTime(6000);
		const afterStop = fire.mock.calls.length;
		vi.advanceTimersByTime(2000);
		expect(fire.mock.calls.length).toBe(afterStop);

		// Let the jingle promise settle so its cancel is wired before unmount.
		await vi.runAllTimersAsync();
		unmount();
		expect(fire.reset).toHaveBeenCalled();
		expect(cancelJingle).toHaveBeenCalled();
	});

	it("shows a caption that works without a keyboard (spoken by the host, not here)", () => {
		const { getByText } = render(PartyOverlay, { props: { ctx: makeCtx() } });
		const caption = getByText(/Party mode — Esc to stop, or it ends on its own/);
		expect(caption.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders only the caption under reduced motion", () => {
		const { container, getByText } = render(PartyOverlay, { props: { ctx: makeCtx(true) } });
		expect(container.querySelector("canvas")).toBeNull();
		expect(create).not.toHaveBeenCalled();
		expect(getByText(/Party mode/)).toBeTruthy();
	});
});
