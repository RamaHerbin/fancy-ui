/**
 * Controller + engine, wired together for real.
 *
 * Nothing is mocked here except the two things jsdom cannot provide: the Web
 * Audio surface (a deterministic fake installed as the global `AudioContext`)
 * and the monotonic clock (`performance.now`, so rate limits are exact rather
 * than flaky). The controller, the engine, the themes and the storage layer
 * are the shipping code.
 *
 * Deterministic seams used throughout:
 * - `installFakeAudioContext()` — counts constructions, records every
 *   `AudioParam` automation event, and exposes `advance()` / `setState()`.
 * - `performance.now` spy — a plain counter (`nowMs`) the tests step by hand.
 * - `resetSoundForTests()` — disposes the engine and forgets the singleton's
 *   hydration between tests.
 * - `Storage.prototype` spies — jsdom's `localStorage` is a Proxy, so an
 *   instance-level spy records nothing; the prototype is the only real seam.
 *
 * Transposed from `src/lib/fancy-ui/sound/sound.integration.test.ts`. No React
 * runs here — the controller is a plain module singleton on both sides — so
 * the only edit is the controller's import path (`sound.svelte.ts` →
 * `sound.ts`) plus the non-null assertions this workspace's
 * `noUncheckedIndexedAccess` requires on indexed reads.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	FakeAudioContext,
	installFakeAudioContext,
	type InstallOptions,
} from "./web-audio-mock.js";
import { createSoundEngine } from "./engine.js";
import { getSoundStatus, resetSoundForTests, sound } from "./sound.js";
import { FANCY_SOUND_THEME } from "./themes.js";
import { SOUND_CUES, SOUND_LIMITS, SOUND_STORAGE_KEY, type SoundCue } from "./types.js";

let audio: ReturnType<typeof installFakeAudioContext>;
let nowMs = 0;

/** Swaps the installed fake for one with different browser behaviour. */
function reinstall(options: InstallOptions): void {
	audio.restore();
	audio = installFakeAudioContext(globalThis as unknown as Record<string, unknown>, options);
}

/**
 * The single context the controller's engine owns, once it exists.
 *
 * The `!` here and on the other indexed reads below is what
 * `noUncheckedIndexedAccess` (this workspace's tsconfig, not the Svelte
 * one) requires; the `expect` above each one is the real guard.
 */
function ctx(): FakeAudioContext {
	expect(audio.instances.length).toBe(1);
	return audio.instances[0]!;
}

/** Nodes a live context keeps forever: the master gain and the limiter. */
const PERSISTENT_NODES = 2;

/** Longest cue span in the contract (success/error ≤ 300 ms), with headroom. */
const LONGEST_CUE_SECONDS = 0.5;

async function enableAndUnlock(): Promise<FakeAudioContext> {
	sound.enable();
	await sound.unlock();
	return ctx();
}

beforeEach(() => {
	window.localStorage.clear();
	nowMs = 1_000;
	vi.spyOn(performance, "now").mockImplementation(() => nowMs);
	audio = installFakeAudioContext();
	resetSoundForTests();
});

afterEach(() => {
	resetSoundForTests();
	audio.restore();
	vi.restoreAllMocks();
	window.localStorage.clear();
});

describe("enable → unlock → play", () => {
	it("creates exactly one running context with a master gain and a limiter", async () => {
		expect(audio.instances.length).toBe(0);
		const context = await enableAndUnlock();

		expect(context.state).toBe("running");
		expect(context.created.gains.length).toBe(1);
		expect(context.created.compressors.length).toBe(1);
		expect(context.liveNodes().length).toBe(PERSISTENT_NODES);
		expect(getSoundStatus().engine).toBe("ready");
	});

	it("routes master → limiter → destination", async () => {
		const context = await enableAndUnlock();
		const master = context.created.gains[0]!;
		const limiter = context.created.compressors[0]!;
		expect(master.outputs).toContain(limiter);
		expect(limiter.outputs).toContain(context.destination);
	});

	it("scales the master gain by the stored volume and the master ceiling", async () => {
		const context = await enableAndUnlock();
		const master = context.created.gains[0]!;
		expect(master.gain.value).toBeCloseTo(0.5 * SOUND_LIMITS.MASTER_CEILING, 10);
	});

	it("builds an oscillator + gain graph for press and reports it in the status", async () => {
		const context = await enableAndUnlock();
		const gainsBefore = context.created.gains.length;

		sound.play("press");

		expect(context.created.oscillators.length).toBeGreaterThan(0);
		expect(context.created.gains.length).toBeGreaterThan(gainsBefore);
		const voiceGain = context.created.gains[gainsBefore]!;
		expect(voiceGain.outputs).toContain(context.created.gains[0]);
		expect(getSoundStatus().lastCue).toBe("press");
		expect(getSoundStatus().lastPlayedAt).toBe(nowMs);
	});

	it("uses noise sources and biquad filters somewhere in the cue palette", async () => {
		const context = await enableAndUnlock();
		for (const cue of SOUND_CUES) {
			nowMs += 500;
			sound.play(cue);
			context.advance(LONGEST_CUE_SECONDS);
		}
		expect(context.created.sources.length).toBeGreaterThan(0);
		expect(context.created.filters.length).toBeGreaterThan(0);
		expect(context.created.buffers.length).toBe(1);
	});

	it("shapes every voice with an envelope that starts and ends at silence", async () => {
		const context = await enableAndUnlock();
		const gainsBefore = context.created.gains.length;
		sound.play("press");

		for (const voiceGain of context.created.gains.slice(gainsBefore)) {
			const events = voiceGain.gain.events;
			expect(events.length).toBeGreaterThanOrEqual(3);
			expect(events[0]!.value).toBe(0);
			expect(events[events.length - 1]!.value).toBe(0);
			const peak = Math.max(...events.map((e) => e.value));
			expect(peak).toBeGreaterThan(0);
			expect(peak).toBeLessThanOrEqual(SOUND_LIMITS.LAYER_PEAK_CEILING);
		}
	});

	it("starts and stops every source it creates", async () => {
		const context = await enableAndUnlock();
		sound.play("open");
		const sources = [...context.created.oscillators, ...context.created.sources];
		expect(sources.length).toBeGreaterThan(0);
		for (const source of sources) {
			expect(source.startTime).not.toBeNull();
			expect(source.stopTime).not.toBeNull();
			expect(source.stopTime!).toBeGreaterThan(source.startTime!);
		}
	});

	it("plays nothing while the preference is off", () => {
		expect(sound.enabled).toBe(false);
		for (const cue of SOUND_CUES) sound.play(cue);
		expect(audio.instances.length).toBe(0);
		expect(getSoundStatus().lastCue).toBeNull();
	});

	it("stops playing again after disable()", async () => {
		const context = await enableAndUnlock();
		nowMs += 500;
		sound.play("press");
		const oscillators = context.created.oscillators.length;
		expect(oscillators).toBeGreaterThan(0);

		sound.disable();
		nowMs += 500;
		for (const cue of SOUND_CUES) sound.play(cue);
		expect(context.created.oscillators.length).toBe(oscillators);
	});

	it("never opens a second context, however often it is unlocked", async () => {
		await enableAndUnlock();
		await sound.unlock();
		await sound.unlock();
		nowMs += 500;
		sound.play("press");
		expect(audio.instances.length).toBe(1);
	});
});

describe("rate limiting", () => {
	it("drops a second hover inside the 60 ms window and lets the next one through", async () => {
		const context = await enableAndUnlock();
		nowMs += 1_000;

		sound.play("hover");
		const afterFirst = context.created.oscillators.length;
		expect(afterFirst).toBeGreaterThan(0);

		nowMs += 30;
		sound.play("hover");
		expect(context.created.oscillators.length).toBe(afterFirst);

		nowMs += 40; // 70 ms since the first hover
		sound.play("hover");
		expect(context.created.oscillators.length).toBeGreaterThan(afterFirst);
	});

	it("rate-limits per cue, not globally", async () => {
		const context = await enableAndUnlock();
		nowMs += 1_000;

		sound.play("hover");
		const afterHover = context.created.oscillators.length;
		nowMs += 5;
		sound.play("press");
		expect(context.created.oscillators.length).toBeGreaterThan(afterHover);
	});

	it("absorbs a burst of ticks down to the 40 ms grid", async () => {
		const context = await enableAndUnlock();
		nowMs += 1_000;
		const before = context.created.gains.length;

		// 20 ticks, 10 ms apart: 200 ms of wall clock, 40 ms minimum interval.
		let scheduled = 0;
		for (let i = 0; i < 20; i++) {
			const gains = context.created.gains.length;
			sound.play("tick");
			if (context.created.gains.length > gains) scheduled++;
			nowMs += 10;
		}
		expect(scheduled).toBeGreaterThan(0);
		expect(scheduled).toBeLessThanOrEqual(6);
		expect(context.created.gains.length).toBeGreaterThan(before);
	});
});

describe("node lifetime", () => {
	it("returns to the post-unlock baseline after 50 plays of every cue", async () => {
		const context = await enableAndUnlock();
		expect(context.liveNodes().length).toBe(PERSISTENT_NODES);
		const totalNodesBefore = context.allNodes.length;

		for (const cue of SOUND_CUES) {
			for (let i = 0; i < 50; i++) {
				nowMs += 200; // past every same-cue minimum interval
				sound.play(cue);
				context.advance(LONGEST_CUE_SECONDS);
			}
		}

		// The loop really did build graphs (guards against a vacuous pass).
		expect(context.allNodes.length).toBeGreaterThan(totalNodesBefore + 50);
		expect(context.liveNodes().length).toBe(PERSISTENT_NODES);
	});

	it("keeps voiceCount at zero once the voices have ended", () => {
		const context = new FakeAudioContext();
		const engine = createSoundEngine({
			getContext: () => context as unknown as AudioContext,
			canCreateContext: () => true,
			now: () => nowMs,
		});

		for (const cue of SOUND_CUES) {
			for (let i = 0; i < 50; i++) {
				nowMs += 200;
				engine.play(cue);
				context.advance(LONGEST_CUE_SECONDS);
			}
		}

		expect(engine.voiceCount).toBe(0);
		expect(context.liveNodes().length).toBe(PERSISTENT_NODES);
		engine.dispose();
	});

	it("refuses new cues once MAX_VOICES is reached and stays bounded", () => {
		const context = new FakeAudioContext();
		const engine = createSoundEngine({
			getContext: () => context as unknown as AudioContext,
			canCreateContext: () => true,
			now: () => nowMs,
		});

		// A voice is a LAYER, while admission is decided per CUE: a cue admitted
		// at voiceCount = MAX_VOICES - 1 still adds all of its layers. The hard
		// ceiling is therefore MAX_VOICES + (widest cue - 1), and it is reached
		// only when nothing is allowed to finish.
		const widestCue = Math.max(
			...SOUND_CUES.map((cue) => FANCY_SOUND_THEME.cues[cue].layers.length)
		);
		const ceiling = SOUND_LIMITS.MAX_VOICES + widestCue - 1;

		let refusals = 0;
		for (let i = 0; i < 40; i++) {
			nowMs += 200;
			const before = engine.voiceCount;
			const played = engine.play(SOUND_CUES[i % SOUND_CUES.length]!);
			if (before >= SOUND_LIMITS.MAX_VOICES) {
				expect(played).toBe(false);
				refusals++;
			}
			expect(engine.voiceCount).toBeLessThanOrEqual(ceiling);
		}
		// The cap was actually exercised, not merely never approached.
		expect(refusals).toBeGreaterThan(0);
		expect(engine.voiceCount).toBeGreaterThanOrEqual(SOUND_LIMITS.MAX_VOICES);
		engine.dispose();
	});

	it("dispose() releases every node and is idempotent", () => {
		const context = new FakeAudioContext();
		const engine = createSoundEngine({
			getContext: () => context as unknown as AudioContext,
			canCreateContext: () => true,
			now: () => nowMs,
		});
		engine.play("success");
		expect(context.liveNodes().length).toBeGreaterThan(PERSISTENT_NODES);

		engine.dispose();
		expect(context.liveNodes().length).toBe(0);
		expect(engine.voiceCount).toBe(0);
		expect(() => engine.dispose()).not.toThrow();
	});
});

describe("browser audio policy", () => {
	it("resumes a suspended context on unlock and reports ready", async () => {
		reinstall({ initialState: "suspended" });
		const context = await enableAndUnlock();
		expect(context.resumeCalls).toBeGreaterThanOrEqual(1);
		expect(context.state).toBe("running");
		expect(getSoundStatus().engine).toBe("ready");
	});

	it("drops the cue and kicks exactly one resume while the context stays suspended", async () => {
		reinstall({ initialState: "suspended", resume: "pending" });
		sound.enable();
		await Promise.resolve();
		const context = ctx();
		const before = context.created.oscillators.length;

		nowMs += 500;
		sound.play("press");
		nowMs += 500;
		sound.play("open");
		nowMs += 500;
		sound.play("close");

		expect(context.created.oscillators.length).toBe(before);
		expect(context.resumeCalls).toBe(1);
		expect(getSoundStatus().engine).toBe("suspended");
	});

	it("reports blocked when resume() rejects", async () => {
		reinstall({ initialState: "suspended", resume: "reject" });
		sound.enable();
		await expect(sound.unlock()).resolves.toBe(false);
		expect(getSoundStatus().engine).toBe("blocked");
		expect(getSoundStatus().lastError).not.toBeNull();
	});

	it("treats an iOS 'interrupted' context as suspended", async () => {
		const context = await enableAndUnlock();
		context.setState("interrupted" as AudioContextState);
		expect(getSoundStatus().engine).toBe("suspended");

		nowMs += 500;
		const before = context.created.oscillators.length;
		sound.play("press");
		expect(context.created.oscillators.length).toBe(before);
	});

	it("treats a closed context as blocked", async () => {
		const context = await enableAndUnlock();
		context.setState("closed");
		expect(getSoundStatus().engine).toBe("blocked");
	});

	it("works through the prefixed constructor alone", async () => {
		reinstall({ webkitOnly: true });
		expect(sound.status.supported).toBe(true);
		const context = await enableAndUnlock();
		nowMs += 500;
		sound.play("press");
		expect(context.created.oscillators.length).toBeGreaterThan(0);
	});

	it("still plays when the engine has no dynamics compressor", async () => {
		reinstall({ withoutCompressor: true });
		const context = await enableAndUnlock();
		expect(context.created.compressors.length).toBe(0);
		expect(context.created.gains[0]!.outputs).toContain(context.destination);

		nowMs += 500;
		sound.play("press");
		expect(context.created.oscillators.length).toBeGreaterThan(0);
	});

	it("reports unsupported and stays silent with no constructor at all", async () => {
		audio.restore();
		audio = { instances: [], restore() {} } as unknown as typeof audio;

		expect(sound.status.supported).toBe(false);
		sound.enable();
		await expect(sound.unlock()).resolves.toBe(false);
		expect(() => sound.play("press")).not.toThrow();
		expect(getSoundStatus().engine).toBe("unsupported");
	});

	it("reports unsupported when the constructor throws", async () => {
		reinstall({ throwOnConstruct: true });
		sound.enable();
		await expect(sound.unlock()).resolves.toBe(false);
		expect(getSoundStatus().engine).toBe("unsupported");
		expect(getSoundStatus().lastError).not.toBeNull();
	});

	it("stays idle when no gesture has happened yet", () => {
		const engine = createSoundEngine({
			getContext: () => new FakeAudioContext() as unknown as AudioContext,
			canCreateContext: () => false,
			now: () => nowMs,
		});
		expect(engine.play("press")).toBe(false);
		expect(engine.state).toBe("idle");
	});
});

describe("persistence", () => {
	it("falls back to the defaults when the stored value is corrupt", () => {
		window.localStorage.setItem(SOUND_STORAGE_KEY, "{not json");
		expect(sound.enabled).toBe(false);
		expect(sound.volume).toBe(0.5);
		expect(sound.theme).toBe("fancy");
		expect(getSoundStatus().storage).toBe("ok");
	});

	it("ignores a stored payload from an unknown schema version", () => {
		window.localStorage.setItem(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 2, enabled: true, volume: 1, theme: "fancy" })
		);
		expect(sound.enabled).toBe(false);
		expect(sound.volume).toBe(0.5);
	});

	it("repairs an out-of-range stored volume and an unknown theme", () => {
		window.localStorage.setItem(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 1, enabled: true, volume: 9, theme: "nope" })
		);
		expect(sound.enabled).toBe(true);
		expect(sound.volume).toBe(1);
		expect(sound.theme).toBe("fancy");
	});

	it("keeps the in-memory state when the quota is exhausted", () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new DOMException("quota", "QuotaExceededError");
		});

		expect(() => sound.enable()).not.toThrow();
		expect(sound.enabled).toBe(true);
		expect(getSoundStatus().storage).toBe("error");
	});

	it("surfaces the storage failure message", () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new DOMException("quota", "QuotaExceededError");
		});

		// setVolume() persists without unlocking, so nothing overwrites
		// `lastError` before it can be read. (enable() kicks a fire-and-forget
		// unlock(), whose onStateChange resets lastError to null — see
		// workflow/reviews/09-performance-browser.md.)
		sound.setVolume(0.2);

		expect(sound.volume).toBe(0.2);
		expect(getSoundStatus().storage).toBe("error");
		expect(getSoundStatus().lastError).toContain("quota");
	});

	it("reports unavailable storage when reading throws (private mode)", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new DOMException("denied", "SecurityError");
		});
		expect(sound.enabled).toBe(false);
		expect(getSoundStatus().storage).toBe("unavailable");
	});

	it("writes the versioned payload once per preference change", () => {
		void sound.enabled;
		const setItem = vi.spyOn(Storage.prototype, "setItem");
		sound.enable();
		expect(setItem).toHaveBeenCalledTimes(1);
		expect(setItem).toHaveBeenLastCalledWith(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 1, enabled: true, volume: 0.5, theme: "fancy" })
		);
		sound.setVolume(0.2);
		expect(setItem).toHaveBeenCalledTimes(2);
		expect(setItem).toHaveBeenLastCalledWith(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 1, enabled: true, volume: 0.2, theme: "fancy" })
		);
	});
});

describe("cross-tab sync", () => {
	function fireStorage(key: string | null, newValue: string | null): void {
		window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
	}

	it("adopts another tab's preference without writing it back", () => {
		void sound.enabled;
		const setItem = vi.spyOn(Storage.prototype, "setItem");

		fireStorage(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 1, enabled: true, volume: 0.3, theme: "fancy" })
		);

		expect(sound.enabled).toBe(true);
		expect(sound.volume).toBe(0.3);
		expect(setItem).not.toHaveBeenCalled();
	});

	it("notifies subscribers of an external change", () => {
		const seen: boolean[] = [];
		const stop = sound.subscribe((prefs) => seen.push(prefs.enabled));
		expect(seen).toEqual([false]);

		fireStorage(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 1, enabled: true, volume: 0.5, theme: "fancy" })
		);
		expect(seen).toEqual([false, true]);
		stop();
	});

	it("mirrors an external volume into the live master gain", async () => {
		const context = await enableAndUnlock();
		const master = context.created.gains[0]!;
		const before = master.gain.events.length;

		fireStorage(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 1, enabled: true, volume: 0.25, theme: "fancy" })
		);

		const added = master.gain.events.slice(before);
		expect(added.length).toBeGreaterThan(0);
		expect(added.some((e) => Math.abs(e.value - 0.25 * SOUND_LIMITS.MASTER_CEILING) < 1e-9)).toBe(
			true
		);
	});

	it("ignores events for other keys", () => {
		sound.enable();
		fireStorage(
			"some-other-key",
			JSON.stringify({ v: 1, enabled: false, volume: 0, theme: "fancy" })
		);
		expect(sound.enabled).toBe(true);
	});

	it("falls back to the defaults when storage is cleared elsewhere", () => {
		sound.enable();
		expect(sound.enabled).toBe(true);
		fireStorage(null, null);
		expect(sound.enabled).toBe(false);
		expect(sound.volume).toBe(0.5);
	});

	it("stops listening after resetSoundForTests()", () => {
		void sound.enabled;
		resetSoundForTests();
		fireStorage(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 1, enabled: true, volume: 0.9, theme: "fancy" })
		);
		expect(sound.enabled).toBe(false);
	});
});

describe("volume", () => {
	it("clamps out-of-range values and ignores NaN", () => {
		sound.setVolume(2);
		expect(sound.volume).toBe(1);
		sound.setVolume(-1);
		expect(sound.volume).toBe(0);
		sound.setVolume(Number.NaN);
		expect(sound.volume).toBe(0);
		sound.setVolume(0.4);
		expect(sound.volume).toBe(0.4);
	});

	it("ramps the live master gain instead of jumping", async () => {
		const context = await enableAndUnlock();
		const master = context.created.gains[0]!;
		const before = master.gain.events.length;

		sound.setVolume(0.25);

		const added = master.gain.events.slice(before);
		expect(added.length).toBeGreaterThan(0);
		const target = 0.25 * SOUND_LIMITS.MASTER_CEILING;
		expect(added.some((e) => Math.abs(e.value - target) < 1e-9)).toBe(true);
		expect(
			added.some((e) => e.method === "linearRampToValueAtTime" || e.method === "setTargetAtTime")
		).toBe(true);
	});

	it("scales a single voice through the per-play volume option", async () => {
		const context = await enableAndUnlock();

		function peakOf(cue: SoundCue, volume?: number): number {
			const before = context.created.gains.length;
			nowMs += 500;
			sound.play(cue, volume === undefined ? undefined : { volume });
			const voices = context.created.gains.slice(before);
			expect(voices.length).toBeGreaterThan(0);
			return Math.max(...voices.flatMap((g) => g.gain.events.map((e) => e.value)));
		}

		const loud = peakOf("press");
		const quiet = peakOf("press", 0.2);
		expect(quiet).toBeGreaterThan(0);
		expect(quiet).toBeLessThan(loud);
		expect(quiet).toBeCloseTo(loud * 0.2, 10);
	});

	it("leaves the per-voice peak alone when only the master volume moves", async () => {
		const context = await enableAndUnlock();
		const master = context.created.gains[0]!;

		const before = context.created.gains.length;
		nowMs += 500;
		sound.play("press");
		const loud = Math.max(
			...context.created.gains.slice(before).flatMap((g) => g.gain.events.map((e) => e.value))
		);

		// The master gain — not the voice envelope — is where user volume lives,
		// so one node carries the change however many voices are sounding.
		sound.setVolume(0.1);
		const after = context.created.gains.length;
		nowMs += 500;
		sound.play("press");
		const stillLoud = Math.max(
			...context.created.gains.slice(after).flatMap((g) => g.gain.events.map((e) => e.value))
		);

		expect(stillLoud).toBeCloseTo(loud, 10);
		expect(master.gain.events.at(-1)!.value).toBeCloseTo(0.1 * SOUND_LIMITS.MASTER_CEILING, 10);
	});
});

describe("theme wiring", () => {
	it("plays every cue in the shipped theme", async () => {
		const context = await enableAndUnlock();
		for (const cue of SOUND_CUES) {
			expect(FANCY_SOUND_THEME.cues[cue].layers.length).toBeGreaterThan(0);
			const before = context.allNodes.length;
			nowMs += 500;
			sound.play(cue);
			expect(context.allNodes.length).toBeGreaterThan(before);
			context.advance(LONGEST_CUE_SECONDS);
		}
	});

	it("ignores an unknown theme name", () => {
		sound.setTheme("nope" as never);
		expect(sound.theme).toBe("fancy");
	});
});
