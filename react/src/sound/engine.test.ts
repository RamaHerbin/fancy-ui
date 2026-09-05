import { afterEach, describe, expect, it, vi } from "vitest";
import {
	FakeAudioContext,
	installFakeAudioContext,
	type FakeAudioContextOptions,
} from "./web-audio-mock.js";
import { createSoundEngine, type SoundEngine, type SoundEngineOptions } from "./engine.js";
import { FANCY_SOUND_THEME } from "./themes.js";
import { SOUND_LIMITS, SOUND_MIN_INTERVAL_MS } from "./types.js";

/** A manual clock so rate-limit tests are deterministic. */
function makeClock(start = 0) {
	let now = start;
	return {
		now: () => now,
		advance: (ms: number) => {
			now += ms;
		},
	};
}

function makeEngine(
	fakeOptions: FakeAudioContextOptions = {},
	overrides: Partial<SoundEngineOptions> = {}
): { engine: SoundEngine; fake: FakeAudioContext; clock: ReturnType<typeof makeClock> } {
	const fake = new FakeAudioContext(fakeOptions);
	const clock = makeClock();
	const engine = createSoundEngine({
		getContext: () => fake as unknown as AudioContext,
		now: clock.now,
		canCreateContext: () => true,
		...overrides,
	});
	return { engine, fake, clock };
}

let installed: { instances: FakeAudioContext[]; restore(): void } | null = null;

afterEach(() => {
	installed?.restore();
	installed = null;
	vi.restoreAllMocks();
});

describe("createSoundEngine allocation", () => {
	it("allocates nothing until play() or unlock()", () => {
		const getContext = vi.fn(() => new FakeAudioContext() as unknown as AudioContext);
		createSoundEngine({ getContext, canCreateContext: () => true });
		expect(getContext).not.toHaveBeenCalled();
	});

	it("starts idle with no error and 0 voices", () => {
		const { engine } = makeEngine();
		expect(engine.state).toBe("idle");
		expect(engine.lastError).toBeNull();
		expect(engine.voiceCount).toBe(0);
	});
});

describe("context creation paths", () => {
	it("stays idle when canCreateContext() is false and no context exists yet", () => {
		const getContext = vi.fn(() => new FakeAudioContext() as unknown as AudioContext);
		const engine = createSoundEngine({ getContext, canCreateContext: () => false });
		expect(engine.play("press")).toBe(false);
		expect(engine.state).toBe("idle");
		expect(getContext).not.toHaveBeenCalled();
	});

	it("goes unsupported when getContext() returns null", () => {
		const onStateChange = vi.fn();
		const engine = createSoundEngine({
			getContext: () => null,
			canCreateContext: () => true,
			onStateChange,
		});
		expect(engine.play("press")).toBe(false);
		expect(engine.state).toBe("unsupported");
		expect(onStateChange).toHaveBeenCalledWith("unsupported", null);
	});

	it("goes unsupported + records lastError when the constructor throws", () => {
		const onStateChange = vi.fn();
		const engine = createSoundEngine({
			getContext: () => {
				throw new Error("AudioContext refused");
			},
			canCreateContext: () => true,
			onStateChange,
		});
		expect(() => engine.play("press")).not.toThrow();
		expect(engine.play("press")).toBe(false);
		expect(engine.state).toBe("unsupported");
		expect(engine.lastError).toBe("AudioContext refused");
		expect(onStateChange).toHaveBeenCalledWith("unsupported", "AudioContext refused");
	});

	it("short-circuits further play() calls once unsupported (no repeat getContext calls)", () => {
		const getContext = vi.fn(() => null);
		const engine = createSoundEngine({ getContext, canCreateContext: () => true });
		engine.play("press");
		engine.play("press");
		engine.play("hover");
		expect(getContext).toHaveBeenCalledTimes(1);
	});

	it("uses the default getContext via installFakeAudioContext (standard + webkit)", () => {
		installed = installFakeAudioContext(globalThis as unknown as Record<string, unknown>, {
			initialState: "running",
		});
		const engine = createSoundEngine({ canCreateContext: () => true });
		expect(engine.play("press")).toBe(true);
		expect(installed.instances).toHaveLength(1);
	});

	it("uses the webkit-prefixed constructor when that is all that exists", () => {
		installed = installFakeAudioContext(globalThis as unknown as Record<string, unknown>, {
			initialState: "running",
			webkitOnly: true,
		});
		const engine = createSoundEngine({ canCreateContext: () => true });
		expect(engine.play("press")).toBe(true);
		expect(installed.instances).toHaveLength(1);
	});
});

describe("graph shape", () => {
	it("builds master -> compressor -> destination on first play", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("press");
		expect(fake.created.gains.length).toBeGreaterThan(0);
		expect(fake.created.compressors).toHaveLength(1);
		const master = fake.created.gains[0]!;
		expect(master.outputs).toContain(fake.created.compressors[0]);
		expect(fake.created.compressors[0]!.outputs).toContain(fake.destination);
	});

	it("connects master straight to destination when the compressor is absent", () => {
		const { engine, fake } = makeEngine({ initialState: "running", withoutCompressor: true });
		engine.play("press");
		const master = fake.created.gains[0]!;
		expect(fake.created.compressors).toHaveLength(0);
		expect(master.outputs).toContain(fake.destination);
	});

	it("wires an oscillator layer as source -> gain -> master", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover");
		const master = fake.created.gains[0]!;
		const osc = fake.created.oscillators[0]!;
		const layerGain = fake.created.gains[1]!;
		expect(osc.outputs.length).toBeGreaterThan(0);
		expect(layerGain.outputs).toContain(master);
	});

	it("wires a filtered layer as source -> filter -> gain -> master", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover"); // hover has one oscillator layer with a highpass filter
		const osc = fake.created.oscillators[0]!;
		const filter = fake.created.filters[0]!;
		const layerGain = fake.created.gains[1]!;
		expect(osc.outputs).toContain(filter);
		expect(filter.outputs).toContain(layerGain);
	});

	it("wires a noise layer as bufferSource -> gain -> master using the shared buffer", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("press"); // press has a noise layer
		expect(fake.created.sources).toHaveLength(1);
		expect(fake.created.sources[0]!.loop).toBe(true);
		expect(fake.created.sources[0]!.buffer).not.toBeNull();
	});
});

describe("envelope automation", () => {
	it("starts and ends at 0 gain, respecting attack/release floors", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		// tick[0] has attack:1 (< MIN_ATTACK_MS) and release:8 (== MIN_RELEASE_MS)
		engine.play("tick");
		const gainNode = fake.created.gains.find((g) => g !== fake.created.gains[0])!;
		const events = gainNode.gain.events;
		expect(events[0]).toMatchObject({ method: "setValueAtTime", value: 0 });
		const last = events[events.length - 1]!;
		expect(last).toMatchObject({ method: "linearRampToValueAtTime", value: 0 });

		const attackEvent = events[1]!;
		const t0 = events[0]!.time;
		const flooredAttackSec = SOUND_LIMITS.MIN_ATTACK_MS / 1000;
		expect(attackEvent.time).toBeCloseTo(t0 + flooredAttackSec, 5);
	});

	it("floors an attack below MIN_ATTACK_MS", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("tick"); // layer[0] attack = 1ms, below the 2ms floor
		const gainNode = fake.created.gains[1]!;
		const t0 = gainNode.gain.events[0]!.time;
		const attackTime = gainNode.gain.events[1]!.time;
		expect(attackTime - t0).toBeCloseTo(SOUND_LIMITS.MIN_ATTACK_MS / 1000, 5);
	});
});

describe("start/stop scheduling", () => {
	it("schedules start at t0 and stop at t0 + duration + 10ms", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover");
		const osc = fake.created.oscillators[0]!;
		expect(osc.startTime).toBeCloseTo(0, 5);
		// hover layer duration is 45ms
		expect(osc.stopTime).toBeCloseTo(0.045 + 0.01, 5);
	});

	it("offsets a delayed layer's start time", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("toggle-on"); // second layer has delay: 45ms
		const secondOsc = fake.created.oscillators[1]!;
		expect(secondOsc.startTime).toBeCloseTo(0.045, 5);
	});
});

describe("pitch and playbackRate math", () => {
	it("doubles oscillator frequency at +12 semitones", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover", { pitch: 12 });
		const osc = fake.created.oscillators[0]!;
		expect(osc.frequency.value).toBeCloseTo(1760 * 2, 3);
	});

	it("halves oscillator frequency at -12 semitones", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover", { pitch: -12 });
		const osc = fake.created.oscillators[0]!;
		expect(osc.frequency.value).toBeCloseTo(1760 / 2, 3);
	});

	it("does not pitch-shift noise layers", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("press", { pitch: 12 }); // press layer[1] is noise
		expect(fake.created.sources).toHaveLength(1);
		// no frequency param on a buffer source; presence alone proves it wasn't skipped
		expect(fake.created.sources[0]!.playbackRate.value).toBe(1);
	});

	it("halves every scheduled time at playbackRate 2", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover", { playbackRate: 2 });
		const osc = fake.created.oscillators[0]!;
		// duration 45ms / rate 2 = 22.5ms, + 10ms fixed stop offset
		expect(osc.stopTime).toBeCloseTo(0.0225 + 0.01, 5);
	});

	it("clamps pitch and playbackRate to their limits", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover", { pitch: 999, playbackRate: 999 });
		const osc = fake.created.oscillators[0]!;
		expect(osc.frequency.value).toBeCloseTo(1760 * 2 ** (24 / 12), 3);
	});
});

describe("volume scaling and clamps", () => {
	it("scales the layer peak by opts.volume", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover", { volume: 0.5 });
		const gainNode = fake.created.gains[1]!;
		const peakEvent = gainNode.gain.events[1]!;
		expect(peakEvent.value).toBeCloseTo(0.12 * 0.5, 5);
	});

	it("clamps the resulting peak to LAYER_PEAK_CEILING", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("press", { volume: 10 }); // layer[0] gain 0.5 * volume(clamped to 1) = 0.5, fine
		const gainNode = fake.created.gains[1]!;
		const peakEvent = gainNode.gain.events[1]!;
		expect(peakEvent.value).toBeLessThanOrEqual(SOUND_LIMITS.LAYER_PEAK_CEILING);
	});

	it("clamps opts.volume itself to [0,1]", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover", { volume: -5 });
		const gainNode = fake.created.gains[1]!;
		const peakEvent = gainNode.gain.events[1]!;
		expect(peakEvent.value).toBe(0);
	});
});

describe("rate limiting", () => {
	it("drops a repeat of the same cue inside its minimum interval", () => {
		const { engine, clock } = makeEngine({ initialState: "running" });
		expect(engine.play("hover")).toBe(true);
		clock.advance(SOUND_MIN_INTERVAL_MS.hover - 1);
		expect(engine.play("hover")).toBe(false);
	});

	it("allows the same cue again once the interval has elapsed", () => {
		const { engine, clock } = makeEngine({ initialState: "running" });
		expect(engine.play("hover")).toBe(true);
		clock.advance(SOUND_MIN_INTERVAL_MS.hover);
		expect(engine.play("hover")).toBe(true);
	});

	it("does not rate-limit across different cues", () => {
		const { engine } = makeEngine({ initialState: "running" });
		expect(engine.play("hover")).toBe(true);
		expect(engine.play("press")).toBe(true);
	});

	it("honours a minIntervals override", () => {
		const { engine, clock } = makeEngine(
			{ initialState: "running" },
			{ minIntervals: { press: 500 } }
		);
		expect(engine.play("press")).toBe(true);
		clock.advance(499);
		expect(engine.play("press")).toBe(false);
		clock.advance(1);
		expect(engine.play("press")).toBe(true);
	});
});

describe("unknown cue", () => {
	it("returns false for a cue absent from the theme", () => {
		const { engine } = makeEngine({ initialState: "running" });
		expect(engine.play("not-a-cue" as never)).toBe(false);
	});
});

describe("MAX_VOICES and leak cleanup", () => {
	it("admits a cue only when all of its layers fit under MAX_VOICES (counted per layer)", () => {
		const { engine, fake, clock } = makeEngine({ initialState: "running" });
		// "hover" is a single layer; fill all but one slot with it.
		for (let i = 0; i < SOUND_LIMITS.MAX_VOICES - 1; i++) {
			expect(engine.play("hover")).toBe(true);
			clock.advance(100);
		}
		expect(engine.voiceCount).toBe(SOUND_LIMITS.MAX_VOICES - 1);
		// "press" has two layers: one free slot is not enough.
		expect(engine.play("press")).toBe(false);
		expect(engine.voiceCount).toBe(SOUND_LIMITS.MAX_VOICES - 1);
		// A single-layer cue still fits.
		expect(engine.play("hover")).toBe(true);
		expect(engine.voiceCount).toBeLessThanOrEqual(SOUND_LIMITS.MAX_VOICES);
		fake.advance(10);
		expect(engine.voiceCount).toBe(0);
	});

	it("drops new cues once MAX_VOICES is reached and recovers after voices end", () => {
		const { engine, fake, clock } = makeEngine({ initialState: "running" });
		// hover has exactly one layer, so each successful play() adds exactly one
		// voice; advancing past its own rate limit each round keeps it un-throttled.
		let scheduled = 0;
		let guard = 0;
		while (scheduled < SOUND_LIMITS.MAX_VOICES && guard < 100) {
			if (engine.play("hover")) scheduled++;
			clock.advance(SOUND_MIN_INTERVAL_MS.hover);
			guard++;
		}
		expect(engine.voiceCount).toBe(SOUND_LIMITS.MAX_VOICES);
		expect(engine.play("copy")).toBe(false);

		fake.advance(10); // past every layer's stop time
		expect(engine.voiceCount).toBe(0);
	});

	it("liveNodes() returns to baseline after every voice ends (no leaked nodes)", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover"); // force master/compressor creation
		fake.advance(1);
		const baseline = fake.liveNodes().length;

		for (let i = 0; i < 20; i++) {
			engine.play(["hover", "press", "select", "tick", "copy"][i % 5] as never);
			fake.advance(1);
		}
		expect(fake.liveNodes().length).toBe(baseline);
		expect(engine.voiceCount).toBe(0);
	});
});

describe("noise buffer", () => {
	it("is 250 ms long — longer than any transient a valid theme may contain, not a full second", () => {
		const { engine, fake } = makeEngine({ initialState: "running", sampleRate: 48000 });
		engine.play("press");
		expect(fake.created.buffers[0]!.length).toBe(12000);
	});

	it("starts consecutive noise voices at rotating offsets so transients are not bit-identical", () => {
		const { engine, fake, clock } = makeEngine({ initialState: "running" });
		engine.play("tick");
		clock.advance(100);
		fake.advance(0.1);
		engine.play("tick");
		const offsets = fake.created.sources.map((s) => s.startOffset);
		expect(offsets).toHaveLength(2);
		expect(offsets[0]).not.toBe(offsets[1]);
	});

	it("is created once per context and reused across noise layers", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("press"); // noise layer
		fake.advance(1);
		engine.play("copy"); // also has a noise layer
		expect(fake.created.buffers).toHaveLength(1);
	});

	it("is deterministic for a given sample rate", () => {
		const { engine: engineA, fake: fakeA } = makeEngine({
			initialState: "running",
			sampleRate: 8000,
		});
		engineA.play("press");
		const dataA = [...fakeA.created.buffers[0]!.getChannelData(0)];

		const { engine: engineB, fake: fakeB } = makeEngine({
			initialState: "running",
			sampleRate: 8000,
		});
		engineB.play("press");
		const dataB = [...fakeB.created.buffers[0]!.getChannelData(0)];

		expect(dataA).toEqual(dataB);
		expect(dataA.some((v) => v !== 0)).toBe(true);
		expect(dataA.every((v) => v >= -1 && v <= 1)).toBe(true);
	});
});

describe("context state transitions", () => {
	it("suspended -> kicks resume() -> ready once it resolves; cue is dropped, never queued", async () => {
		const { engine, fake } = makeEngine({ initialState: "suspended", resume: "resolve" });
		expect(engine.play("press")).toBe(false);
		expect(fake.resumeCalls).toBe(1);
		await Promise.resolve();
		await Promise.resolve();
		expect(engine.state).toBe("ready");
		expect(engine.voiceCount).toBe(0); // the triggering cue itself was dropped
	});

	it("does not kick a second resume() while one is still in flight", () => {
		const { engine, fake } = makeEngine({ initialState: "suspended", resume: "pending" });
		expect(engine.play("press")).toBe(false);
		expect(engine.play("hover")).toBe(false);
		expect(engine.play("tick")).toBe(false);
		expect(fake.resumeCalls).toBe(1);
	});

	it("resume() rejecting sets state to blocked", async () => {
		const onStateChange = vi.fn();
		const { engine } = makeEngine(
			{ initialState: "suspended", resume: "reject" },
			{ onStateChange }
		);
		expect(engine.play("press")).toBe(false);
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		expect(engine.state).toBe("blocked");
	});

	it("maps a nonstandard 'interrupted' statechange to suspended", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover"); // establishes the context + listener
		fake.setState("interrupted" as never);
		expect(engine.state).toBe("suspended");
	});

	it("maps closed to blocked", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover");
		fake.setState("closed");
		expect(engine.state).toBe("blocked");
	});
});

describe("unlock()", () => {
	it("resolves true once the context is running", async () => {
		const { engine } = makeEngine({ initialState: "running" });
		await expect(engine.unlock()).resolves.toBe(true);
	});

	it("resolves true after resuming a suspended context", async () => {
		const { engine } = makeEngine({ initialState: "suspended", resume: "resolve" });
		await expect(engine.unlock()).resolves.toBe(true);
	});

	it("resolves false and never rejects when resume() rejects", async () => {
		const { engine } = makeEngine({ initialState: "suspended", resume: "reject" });
		await expect(engine.unlock()).resolves.toBe(false);
	});

	it("resolves false when no context can be created", async () => {
		const engine = createSoundEngine({ getContext: () => null, canCreateContext: () => true });
		await expect(engine.unlock()).resolves.toBe(false);
	});

	it("resolves false when canCreateContext() blocks creation", async () => {
		const engine = createSoundEngine({
			getContext: () =>
				new FakeAudioContext({ initialState: "running" }) as unknown as AudioContext,
			canCreateContext: () => false,
		});
		await expect(engine.unlock()).resolves.toBe(false);
	});
});

describe("setMasterVolume", () => {
	it("remembers the volume before a context exists and applies it on creation", () => {
		const { engine, fake } = makeEngine({ initialState: "running" }, { masterVolume: 0.1 });
		engine.setMasterVolume(0.9);
		engine.play("hover");
		const master = fake.created.gains[0]!;
		expect(master.gain.value).toBeCloseTo(0.9 * SOUND_LIMITS.MASTER_CEILING, 5);
	});

	it("ramps master gain over ~20ms once a context exists", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover"); // create the context/master
		const master = fake.created.gains[0]!;
		master.gain.events.length = 0;
		engine.setMasterVolume(0.25);
		const ramp = master.gain.events.find((e) => e.method === "linearRampToValueAtTime");
		expect(ramp).toBeDefined();
		expect(ramp!.value).toBeCloseTo(0.25 * SOUND_LIMITS.MASTER_CEILING, 5);
		expect(ramp!.time).toBeCloseTo(fake.currentTime + 0.02, 5);
	});

	it("clamps volume to [0,1]", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover");
		engine.setMasterVolume(5);
		const master = fake.created.gains[0]!;
		const ramp = [...master.gain.events]
			.reverse()
			.find((e) => e.method === "linearRampToValueAtTime");
		expect(ramp!.value).toBeCloseTo(SOUND_LIMITS.MASTER_CEILING, 5);
	});
});

describe("setTheme", () => {
	it("swaps recipes used by subsequent play() calls", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		const customTheme = {
			...FANCY_SOUND_THEME,
			cues: {
				...FANCY_SOUND_THEME.cues,
				hover: {
					layers: [
						{
							kind: "oscillator" as const,
							wave: "square" as const,
							frequency: 100,
							gain: 0.2,
							envelope: { attack: 2, decay: 6, sustain: 0, release: 8 },
							duration: 20,
						},
					],
				},
			},
		};
		engine.setTheme(customTheme);
		engine.play("hover");
		expect(fake.created.oscillators[0]!.type).toBe("square");
		expect(fake.created.oscillators[0]!.frequency.value).toBeCloseTo(100, 5);
	});
});

describe("MAX_LAYER_MS clamp", () => {
	it("clamps a custom theme's layer duration to MAX_LAYER_MS before scheduling", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		const hugeDurationMs = SOUND_LIMITS.MAX_LAYER_MS * 100; // a huge finite duration
		const customTheme = {
			...FANCY_SOUND_THEME,
			cues: {
				...FANCY_SOUND_THEME.cues,
				hover: {
					layers: [
						{
							kind: "oscillator" as const,
							wave: "sine" as const,
							frequency: 440,
							gain: 0.2,
							envelope: { attack: 2, decay: 6, sustain: 0, release: 8 },
							duration: hugeDurationMs,
						},
					],
				},
			},
		};
		engine.setTheme(customTheme);
		engine.play("hover");
		const osc = fake.created.oscillators[0]!;
		// stop() = durationSec + the fixed 10ms tail; an unclamped engine would
		// schedule this ~40s out instead of capping at MAX_LAYER_MS, keeping the
		// oscillator and its voice slot alive for minutes.
		expect(osc.stopTime).toBeCloseTo(SOUND_LIMITS.MAX_LAYER_MS / 1000 + 0.01, 5);
	});
});

describe("dispose()", () => {
	it("stops sources, disconnects nodes, closes the context, and returns to idle", () => {
		const { engine, fake } = makeEngine({ initialState: "running" });
		engine.play("hover");
		expect(fake.closeCalls).toBe(0);
		engine.dispose();
		expect(fake.closeCalls).toBe(1);
		expect(engine.state).toBe("idle");
		expect(engine.voiceCount).toBe(0);
		expect(fake.liveNodes()).toHaveLength(0);
	});

	it("is idempotent", () => {
		const { engine } = makeEngine({ initialState: "running" });
		engine.play("hover");
		expect(() => {
			engine.dispose();
			engine.dispose();
			engine.dispose();
		}).not.toThrow();
		expect(engine.state).toBe("idle");
	});

	it("is safe to call before any context was ever created", () => {
		const engine = createSoundEngine({ getContext: () => null, canCreateContext: () => true });
		expect(() => engine.dispose()).not.toThrow();
		expect(engine.state).toBe("idle");
	});

	// A resume() still in flight at teardown must not resurrect the engine: its
	// continuation holds a context dispose() already closed and disowned.
	it("ignores a resume that resolves after dispose()", async () => {
		const fake = new FakeAudioContext({ initialState: "suspended" });
		let settle!: () => void;
		fake.resume = () =>
			new Promise<void>((resolve) => {
				settle = () => {
					fake.state = "running";
					resolve();
				};
			});
		const onStateChange = vi.fn();
		const engine = createSoundEngine({
			getContext: () => fake as unknown as AudioContext,
			canCreateContext: () => true,
			onStateChange,
		});
		const unlocking = engine.unlock();
		engine.dispose();
		onStateChange.mockClear();
		settle();
		await unlocking;

		expect(engine.state).toBe("idle");
		expect(onStateChange).not.toHaveBeenCalled();
	});

	it("ignores a resume that rejects after dispose()", async () => {
		const fake = new FakeAudioContext({ initialState: "suspended" });
		let fail!: () => void;
		fake.resume = () =>
			new Promise<void>((_resolve, reject) => {
				fail = () => reject(new Error("resume rejected"));
			});
		const onStateChange = vi.fn();
		const engine = createSoundEngine({
			getContext: () => fake as unknown as AudioContext,
			canCreateContext: () => true,
			onStateChange,
		});
		const unlocking = engine.unlock();
		engine.dispose();
		onStateChange.mockClear();
		fail();
		await unlocking;

		expect(engine.state).toBe("idle");
		expect(engine.lastError).toBeNull();
		expect(onStateChange).not.toHaveBeenCalled();
	});
});

describe("onStateChange", () => {
	it("fires on every real transition, not on no-op repeats", () => {
		const onStateChange = vi.fn();
		const { engine, fake } = makeEngine({ initialState: "running" }, { onStateChange });
		engine.play("hover"); // idle -> ready
		expect(onStateChange).toHaveBeenCalledWith("ready", null);
		const callsAfterFirst = onStateChange.mock.calls.length;
		fake.setState("running"); // already ready; statechange fires but should not add a call
		expect(onStateChange.mock.calls.length).toBe(callsAfterFirst);
		fake.setState("suspended");
		expect(onStateChange).toHaveBeenLastCalledWith("suspended", null);
	});
});

describe("supported", () => {
	it("is false when no AudioContext constructor exists on the server", () => {
		const engine = createSoundEngine({ getContext: () => null, canCreateContext: () => true });
		if (typeof window === "undefined") {
			expect(engine.supported).toBe(false);
		}
	});

	it("is true once a constructor is installed on window", () => {
		installed = installFakeAudioContext(globalThis as unknown as Record<string, unknown>);
		const engine = createSoundEngine({ canCreateContext: () => true });
		expect(engine.supported).toBe(true);
	});

	it("does not construct anything while probing", () => {
		installed = installFakeAudioContext(globalThis as unknown as Record<string, unknown>);
		const engine = createSoundEngine({ canCreateContext: () => true });
		void engine.supported;
		void engine.supported;
		expect(installed.instances).toHaveLength(0);
	});
});

describe("render failure rollback", () => {
	it("disconnects the partial graph and returns false when a layer throws mid-render", () => {
		const { fake } = makeEngine({ initialState: "running" });
		const badTheme = {
			...FANCY_SOUND_THEME,
			cues: {
				...FANCY_SOUND_THEME.cues,
				press: {
					layers: [
						...FANCY_SOUND_THEME.cues.press.layers,
						{
							kind: "oscillator" as const,
							wave: "sine" as const,
							frequency: 200,
							gain: 0.1,
							envelope: { attack: 2, decay: 6, sustain: 0, release: 8 },
							duration: 20,
						},
					],
				},
			},
		};
		const engine = createSoundEngine({
			getContext: () => fake as unknown as AudioContext,
			canCreateContext: () => true,
			theme: badTheme,
		});
		const originalCreateOscillator = fake.createOscillator.bind(fake);
		let calls = 0;
		fake.createOscillator = () => {
			calls++;
			if (calls === 2) throw new Error("boom");
			return originalCreateOscillator();
		};
		const result = engine.play("press");
		expect(result).toBe(false);
		expect(engine.lastError).toBe("boom");
		expect(engine.voiceCount).toBe(0);
		expect(
			fake
				.liveNodes()
				.filter((n) => n !== fake.created.gains[0] && n !== fake.created.compressors[0])
		).toHaveLength(0);
	});
});
