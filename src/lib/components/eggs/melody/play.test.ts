import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EggContext } from "../types.js";

const mocked = vi.hoisted(() => ({ sound: { enabled: true, play: vi.fn() } }));
vi.mock("$lib/fancy-ui/sound/index.js", () => mocked);

import { MELODY, MIN_NOTE_GAP_MS, cancel, run } from "./play.js";
import def from "./index.js";

function makeCtx(): EggContext {
	return {
		id: "melody",
		reducedMotion: false,
		dismiss: vi.fn(),
		found: vi.fn(),
		trigger: vi.fn(async () => {}),
	};
}

describe("melody phrase", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mocked.sound.enabled = true;
		mocked.sound.play.mockClear();
	});

	afterEach(() => {
		cancel();
		vi.useRealTimers();
	});

	it("has eight notes, within the pitch clamp, strictly increasing and at least 80 ms apart", () => {
		expect(MELODY).toHaveLength(8);
		expect(MELODY[0]?.at).toBe(0);
		for (const n of MELODY) {
			expect(Math.abs(n.pitch)).toBeLessThanOrEqual(24);
		}
		for (let i = 1; i < MELODY.length; i++) {
			expect(MELODY[i]!.at - MELODY[i - 1]!.at).toBeGreaterThanOrEqual(MIN_NOTE_GAP_MS);
		}
	});

	it("plays every note on the tick cue and marks the egg found once", async () => {
		const ctx = makeCtx();
		await run(ctx);
		expect(mocked.sound.play).toHaveBeenCalledTimes(1);
		expect(ctx.found).toHaveBeenCalledTimes(1);
		await vi.runAllTimersAsync();
		expect(mocked.sound.play).toHaveBeenCalledTimes(8);
		expect(mocked.sound.play.mock.calls.map((c) => c[0])).toEqual(Array(8).fill("tick"));
		expect(mocked.sound.play.mock.calls.map((c) => c[1].pitch)).toEqual(MELODY.map((n) => n.pitch));
		for (const call of mocked.sound.play.mock.calls) expect(call[1].volume).toBe(0.8);
		expect(ctx.found).toHaveBeenCalledTimes(1);
	});

	it("schedules each note at its offset", async () => {
		await run(makeCtx());
		for (let i = 1; i < MELODY.length; i++) {
			await vi.advanceTimersByTimeAsync(MELODY[i]!.at - MELODY[i - 1]!.at);
			expect(mocked.sound.play).toHaveBeenCalledTimes(i + 1);
		}
	});

	it("stays silent and unfound when sound is off", async () => {
		mocked.sound.enabled = false;
		const ctx = makeCtx();
		await run(ctx);
		await vi.runAllTimersAsync();
		expect(mocked.sound.play).not.toHaveBeenCalled();
		expect(ctx.found).not.toHaveBeenCalled();
	});

	it("cancel() stops the rest of the phrase", async () => {
		await run(makeCtx());
		cancel();
		await vi.runAllTimersAsync();
		expect(mocked.sound.play).toHaveBeenCalledTimes(1);
	});

	it("re-running restarts instead of overlapping", async () => {
		await run(makeCtx());
		await run(makeCtx());
		await vi.runAllTimersAsync();
		expect(mocked.sound.play).toHaveBeenCalledTimes(9);
	});
});

describe("melody def", () => {
	it("is a hover trigger on the sound switch, not motion-sensitive, found by the payload", async () => {
		expect(def.trigger).toEqual({
			kind: "dom",
			event: "pointerenter",
			selector: "[data-sound-toggle]",
			count: 7,
			windowMs: 2500,
		});
		expect(def.motionSensitive).toBe(false);
		expect(def.foundOn).toBe("payload");
		const mod = await def.load();
		expect(mod.run).toBe(run);
		expect("default" in mod).toBe(false);
	});
});
