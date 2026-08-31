/**
 * Sound engine — a lazy, rune-free Web Audio interpreter for cue recipes.
 *
 * Owned by Agent 03. Exported names and signatures are the contract
 * (see workflow/contracts.md §3) and must not change.
 *
 * Invariants every implementation must keep:
 * - `createSoundEngine()` allocates nothing. Only `play()` / `unlock()` may
 *   touch Web Audio, and only through `ensureContext()`.
 * - Never throws. Every failure is swallowed into `state` / `lastError`.
 * - No module-evaluation access to window/navigator/AudioContext.
 */

import {
	SOUND_LIMITS,
	SOUND_MIN_INTERVAL_MS,
	type SoundCue,
	type SoundEngineState,
	type SoundLayer,
	type SoundPlayOptions,
	type SoundThemeDefinition,
} from "./types.js";
import { FANCY_SOUND_THEME } from "./themes.js";

export interface SoundEngineOptions {
	/**
	 * Returns the context to use, or null when none can/should be created.
	 * Default: lazily `new (window.AudioContext ?? window.webkitAudioContext)()`, memoised.
	 * Tests inject a FakeAudioContext here.
	 */
	getContext?: () => AudioContext | null;
	/** Monotonic clock in ms for rate limiting. Default `performance.now`, falling back to `Date.now`. */
	now?: () => number;
	/**
	 * Whether a context may be created right now. Default:
	 * `typeof navigator === "undefined" ? false : (navigator.userActivation?.isActive ?? true)`.
	 * Keeps context creation inside a user gesture; when it returns false and no
	 * context exists yet, `play()` returns false and state stays "idle".
	 */
	canCreateContext?: () => boolean;
	/** Initial theme. Default `FANCY_SOUND_THEME`. */
	theme?: SoundThemeDefinition;
	/** Overrides for `SOUND_MIN_INTERVAL_MS`. */
	minIntervals?: Partial<Record<SoundCue, number>>;
	/** Initial master volume 0..1. Default 0.5. */
	masterVolume?: number;
	/** Mirrors every state transition (the controller lifts this into `$state`). */
	onStateChange?: (state: SoundEngineState, error: string | null) => void;
}

export interface SoundEngine {
	readonly state: SoundEngineState;
	readonly lastError: string | null;
	/** Voices currently sounding (for leak tests and the status line). */
	readonly voiceCount: number;
	/**
	 * `true` once an AudioContext constructor was found in this environment
	 * (probed without constructing). `false` on the server.
	 */
	readonly supported: boolean;
	/**
	 * Schedules `cue` now. Returns true only if a voice was actually scheduled.
	 * Returns false (never throws) when: unsupported, no context and creation not
	 * allowed, context not running (resume is kicked off, cue dropped), rate-limited,
	 * MAX_VOICES reached, unknown cue.
	 */
	play(cue: SoundCue, options?: SoundPlayOptions): boolean;
	/**
	 * Creates the context if allowed and resumes it if suspended. Resolves true
	 * when the context is running afterwards. Never rejects. Call from a gesture.
	 */
	unlock(): Promise<boolean>;
	/** 0..1; engine multiplies by SOUND_LIMITS.MASTER_CEILING. Ramped over ~20ms. */
	setMasterVolume(volume: number): void;
	setTheme(theme: SoundThemeDefinition): void;
	/** Fades live voices out, stops/disconnects all nodes, closes an owned context, state → "idle". Idempotent. */
	dispose(): void;
}

interface VoiceHandle {
	nodes: AudioNode[];
	source: OscillatorNode | AudioBufferSourceNode;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

function defaultGetContext(): AudioContext | null {
	if (typeof window === "undefined") return null;
	const w = window as unknown as {
		AudioContext?: typeof AudioContext;
		webkitAudioContext?: typeof AudioContext;
	};
	const Ctor = w.AudioContext ?? w.webkitAudioContext;
	return Ctor ? new Ctor() : null;
}

function defaultCanCreateContext(): boolean {
	if (typeof navigator === "undefined") return false;
	const nav = navigator as Navigator & { userActivation?: { isActive: boolean } };
	return nav.userActivation?.isActive ?? true;
}

function defaultNow(): number {
	return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function probeSupported(): boolean {
	if (typeof window === "undefined") return false;
	const w = window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown };
	return typeof w.AudioContext !== "undefined" || typeof w.webkitAudioContext !== "undefined";
}

/** Seeded xorshift32 noise, mapped to [-1, 1]. Deterministic for a given length. */
function fillNoise(data: Float32Array): void {
	let s = 0x9e3779b9;
	for (let i = 0; i < data.length; i++) {
		s ^= s << 13;
		s >>>= 0;
		s ^= s >>> 17;
		s >>>= 0;
		s ^= s << 5;
		s >>>= 0;
		data[i] = (s / 0xffffffff) * 2 - 1;
	}
}

export function createSoundEngine(options: SoundEngineOptions = {}): SoundEngine {
	const getContextFn = options.getContext ?? defaultGetContext;
	const canCreateContextFn = options.canCreateContext ?? defaultCanCreateContext;
	const nowFn = options.now ?? defaultNow;
	const minIntervals = options.minIntervals ?? {};
	let theme = options.theme ?? FANCY_SOUND_THEME;
	let masterVolume = clamp(
		Number.isFinite(options.masterVolume) ? (options.masterVolume as number) : 0.5,
		0,
		1
	);
	const onStateChangeCb = options.onStateChange;

	let ctx: AudioContext | null = null;
	let master: GainNode | null = null;
	let limiter: DynamicsCompressorNode | null = null;
	let statechangeListener: (() => void) | null = null;
	let noiseBuffer: AudioBuffer | null = null;
	let resumePromise: Promise<void> | null = null;
	// Bumped by dispose(). Async continuations captured before a teardown compare
	// against it and stay silent when they belong to a previous life.
	let disposeGeneration = 0;
	let state: SoundEngineState = "idle";
	let lastError: string | null = null;
	let voiceCount = 0;
	const activeVoices = new Set<VoiceHandle>();
	const lastAt: Partial<Record<SoundCue, number>> = {};

	function setState(next: SoundEngineState, error: string | null): void {
		if (next === state) {
			if (error) lastError = error;
			return;
		}
		state = next;
		lastError = error;
		onStateChangeCb?.(next, error);
	}

	function syncFromContextState(rawState: string): void {
		if (rawState === "running") setState("ready", null);
		else if (rawState === "suspended" || rawState === "interrupted") setState("suspended", null);
		else if (rawState === "closed") setState("blocked", null);
	}

	function attachContext(context: AudioContext): void {
		ctx = context;
		const listener = () => syncFromContextState(context.state);
		context.addEventListener("statechange", listener);
		statechangeListener = listener;

		master = context.createGain();
		master.gain.value = masterVolume * SOUND_LIMITS.MASTER_CEILING;

		if (typeof context.createDynamicsCompressor === "function") {
			try {
				const comp = context.createDynamicsCompressor();
				comp.threshold.value = -12;
				comp.knee.value = 6;
				comp.ratio.value = 12;
				comp.attack.value = 0.003;
				comp.release.value = 0.1;
				master.connect(comp);
				comp.connect(context.destination);
				limiter = comp;
			} catch {
				limiter = null;
				master.connect(context.destination);
			}
		} else {
			master.connect(context.destination);
		}

		syncFromContextState(context.state);
	}

	function ensureContext(): AudioContext | null {
		if (ctx) return ctx;
		if (!canCreateContextFn()) return null;
		let created: AudioContext | null;
		try {
			created = getContextFn();
			if (!created) {
				setState("unsupported", null);
				return null;
			}
			// A context whose createGain()/addEventListener throws degrades to
			// "unsupported" here instead of throwing out through a click handler.
			attachContext(created);
		} catch (err) {
			setState("unsupported", errorMessage(err));
			return null;
		}
		return created;
	}

	function kickResume(context: AudioContext): Promise<void> {
		if (resumePromise) return resumePromise;
		// dispose() can land while resume() is still pending. The continuations
		// below then hold a context this engine no longer owns, so they may only
		// touch state while that context is still the current one — otherwise a
		// disposed engine would report itself ready/blocked again and call its
		// state callback from an obsolete context.
		const generation = disposeGeneration;
		const isCurrent = () => generation === disposeGeneration && ctx === context;
		resumePromise = context
			.resume()
			.then(() => {
				if (isCurrent()) syncFromContextState(context.state);
			})
			.catch((err: unknown) => {
				if (isCurrent()) setState("blocked", errorMessage(err));
			})
			.finally(() => {
				// A dispose() already cleared this slot (and a later kickResume may
				// own it now); only the current generation may null it out.
				if (generation === disposeGeneration) resumePromise = null;
			});
		return resumePromise;
	}

	// 250 ms is longer than any noise layer a valid theme may contain
	// (SOUND_LIMITS.MAX_LAYER_MS is 400 but every transient is < 100 ms), and
	// sources loop — a full second would cost ~190 KiB and ~0.8 ms of fill on
	// the user's very first cue for nothing.
	const NOISE_BUFFER_SECONDS = 0.25;
	function getNoiseBuffer(context: AudioContext): AudioBuffer {
		if (noiseBuffer) return noiseBuffer;
		const length = Math.max(1, Math.round(context.sampleRate * NOISE_BUFFER_SECONDS));
		const buffer = context.createBuffer(1, length, context.sampleRate);
		fillNoise(buffer.getChannelData(0));
		noiseBuffer = buffer;
		return buffer;
	}
	// Each noise voice starts at a different offset into the shared buffer so
	// consecutive transients are not bit-identical; the rotation is
	// deterministic (no Math.random) so tests stay reproducible.
	let noiseOffsetStep = 0;
	function nextNoiseOffset(buffer: AudioBuffer): number {
		noiseOffsetStep = (noiseOffsetStep + 1) % 8;
		return (buffer.duration * noiseOffsetStep) / 8;
	}

	function renderLayer(
		context: AudioContext,
		masterNode: AudioNode,
		layer: SoundLayer,
		recipeGain: number,
		opts: { volume: number; pitch: number; rate: number }
	): VoiceHandle {
		const { volume, pitch, rate } = opts;
		const delayMs = layer.delay ?? 0;
		const t0 = context.currentTime + delayMs / 1000 / rate;
		const durationSec = layer.duration / 1000 / rate;
		const pitchMul = 2 ** (pitch / 12);

		let source: OscillatorNode | AudioBufferSourceNode;
		let noiseStartOffset = 0;
		if (layer.kind === "oscillator") {
			const osc = context.createOscillator();
			osc.type = layer.wave;
			const freqStart = layer.frequency * pitchMul;
			osc.frequency.value = freqStart;
			if (layer.detune) osc.detune.value = layer.detune;
			if (layer.frequencyEnd != null) {
				const freqEnd = layer.frequencyEnd * pitchMul;
				osc.frequency.setValueAtTime(freqStart, t0);
				osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + durationSec);
			}
			source = osc;
		} else {
			const buf = context.createBufferSource();
			buf.buffer = getNoiseBuffer(context);
			buf.loop = true;
			source = buf;
			noiseStartOffset = nextNoiseOffset(buf.buffer);
		}

		const nodes: AudioNode[] = [source];
		let node: AudioNode = source;

		if (layer.filter) {
			const filterNode = context.createBiquadFilter();
			filterNode.type = layer.filter.type;
			filterNode.frequency.value = layer.filter.frequency;
			if (layer.filter.q != null) filterNode.Q.value = layer.filter.q;
			if (layer.filter.frequencyEnd != null) {
				filterNode.frequency.setValueAtTime(layer.filter.frequency, t0);
				filterNode.frequency.exponentialRampToValueAtTime(
					Math.max(1, layer.filter.frequencyEnd),
					t0 + durationSec
				);
			}
			node.connect(filterNode);
			node = filterNode;
			nodes.push(filterNode);
		}

		const gainNode = context.createGain();
		node.connect(gainNode);
		gainNode.connect(masterNode);
		nodes.push(gainNode);

		const a = Math.max(layer.envelope.attack, SOUND_LIMITS.MIN_ATTACK_MS) / 1000 / rate;
		const d = layer.envelope.decay / 1000 / rate;
		const r = Math.max(layer.envelope.release, SOUND_LIMITS.MIN_RELEASE_MS) / 1000 / rate;
		const sustain = layer.envelope.sustain;
		const peak = Math.min(layer.gain * recipeGain * volume, SOUND_LIMITS.LAYER_PEAK_CEILING);
		const tRel = t0 + durationSec - r;

		gainNode.gain.setValueAtTime(0, t0);
		gainNode.gain.linearRampToValueAtTime(peak, t0 + a);
		gainNode.gain.linearRampToValueAtTime(peak * sustain, t0 + a + d);
		gainNode.gain.setValueAtTime(peak * sustain, tRel);
		gainNode.gain.linearRampToValueAtTime(0, tRel + r);

		if (layer.kind === "noise") (source as AudioBufferSourceNode).start(t0, noiseStartOffset);
		else source.start(t0);
		source.stop(t0 + durationSec + 0.01);

		return { nodes, source };
	}

	return {
		get state(): SoundEngineState {
			return state;
		},
		get lastError(): string | null {
			return lastError;
		},
		get voiceCount(): number {
			return voiceCount;
		},
		get supported(): boolean {
			return probeSupported();
		},

		play(cue: SoundCue, options: SoundPlayOptions = {}): boolean {
			if (state === "unsupported") return false;

			const recipe = theme.cues[cue];
			if (!recipe) return false;

			const interval = minIntervals[cue] ?? SOUND_MIN_INTERVAL_MS[cue] ?? 15;
			const last = lastAt[cue] ?? Number.NEGATIVE_INFINITY;
			if (nowFn() - last < interval) return false;

			const context = ensureContext();
			if (!context) return false;

			if (context.state !== "running") {
				void kickResume(context);
				return false;
			}

			// Voices are counted per layer, so admit a cue only if ALL its layers fit.
			if (voiceCount + recipe.layers.length > SOUND_LIMITS.MAX_VOICES) return false;

			const volume = clamp(Number.isFinite(options.volume) ? (options.volume as number) : 1, 0, 1);
			const pitch = clamp(Number.isFinite(options.pitch) ? (options.pitch as number) : 0, -24, 24);
			const rate = clamp(
				Number.isFinite(options.playbackRate) ? (options.playbackRate as number) : 1,
				0.25,
				4
			);
			const recipeGain = recipe.gain ?? 1;

			const createdVoices: VoiceHandle[] = [];
			try {
				if (!master) throw new Error("master gain missing");
				for (const layer of recipe.layers) {
					createdVoices.push(
						renderLayer(context, master, layer, recipeGain, { volume, pitch, rate })
					);
				}
			} catch (err) {
				for (const voice of createdVoices) {
					for (const n of voice.nodes) {
						try {
							n.disconnect();
						} catch {
							// already disconnected
						}
					}
				}
				lastError = errorMessage(err);
				return false;
			}

			voiceCount += createdVoices.length;
			for (const voice of createdVoices) {
				activeVoices.add(voice);
				voice.source.onended = () => {
					activeVoices.delete(voice);
					for (const n of voice.nodes) {
						try {
							n.disconnect();
						} catch {
							// already disconnected
						}
					}
					voiceCount = Math.max(0, voiceCount - 1);
				};
			}

			lastAt[cue] = nowFn();
			return true;
		},

		async unlock(): Promise<boolean> {
			try {
				const context = ensureContext();
				if (!context) return false;
				if (context.state !== "running") {
					await kickResume(context);
				}
				return context.state === "running";
			} catch {
				return false;
			}
		},

		setMasterVolume(volume: number): void {
			const v = clamp(Number.isFinite(volume) ? volume : 0, 0, 1);
			masterVolume = v;
			if (master && ctx) {
				const now = ctx.currentTime;
				const target = v * SOUND_LIMITS.MASTER_CEILING;
				master.gain.cancelScheduledValues(now);
				master.gain.linearRampToValueAtTime(target, now + 0.02);
			}
		},

		setTheme(next: SoundThemeDefinition): void {
			theme = next;
		},

		dispose(): void {
			// Invalidates every async continuation captured before this point.
			disposeGeneration += 1;
			// A hard stop by design: dispose() tears the graph down synchronously
			// (the context is closed right after), so a fade scheduled here could
			// never render. Voices are ≤ 300 ms and dispose() is not a user path.
			for (const voice of [...activeVoices]) {
				try {
					const now = ctx ? ctx.currentTime : 0;
					const gainNode = voice.nodes[voice.nodes.length - 1] as GainNode;
					gainNode.gain.cancelScheduledValues(now);
					gainNode.gain.setValueAtTime(0, now);
					voice.source.stop(now);
				} catch {
					// best-effort; ignore
				}
				for (const n of voice.nodes) {
					try {
						n.disconnect();
					} catch {
						// already disconnected
					}
				}
			}
			activeVoices.clear();
			voiceCount = 0;

			if (master) {
				try {
					master.disconnect();
				} catch {
					// already disconnected
				}
				master = null;
			}
			if (limiter) {
				try {
					limiter.disconnect();
				} catch {
					// already disconnected
				}
				limiter = null;
			}
			if (ctx) {
				if (statechangeListener) {
					try {
						ctx.removeEventListener("statechange", statechangeListener);
					} catch {
						// ignore
					}
				}
				try {
					void ctx.close();
				} catch {
					// ignore
				}
				ctx = null;
			}
			statechangeListener = null;
			noiseBuffer = null;
			resumePromise = null;
			for (const key of Object.keys(lastAt)) delete lastAt[key as SoundCue];

			setState("idle", null);
		},
	};
}
