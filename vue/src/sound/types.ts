/**
 * Sound design — shared types and constants.
 *
 * Themes are DATA (a map from semantic cue to a synthesis recipe) and the
 * engine is the interpreter. Components only ever name a cue; they never
 * know how it sounds, which is what lets a future sound theme follow a visual
 * skin without coupling audio code to it.
 *
 * This module has no runtime side effects and touches no browser global.
 */

/** Semantic UI cues. Every theme defines a recipe for each one. */
export const SOUND_CUES = [
	"hover",
	"press",
	"toggle-on",
	"toggle-off",
	"open",
	"close",
	"select",
	"success",
	"error",
	"tick",
	"copy",
] as const;
export type SoundCue = (typeof SOUND_CUES)[number];

export const SOUND_THEME_NAMES = ["fancy"] as const;
export type SoundThemeName = (typeof SOUND_THEME_NAMES)[number];

export interface SoundPlayOptions {
	/** Multiplier on the cue's own gain, clamped to [0, 1]. Default 1. */
	volume?: number;
	/** Semitone offset applied to every oscillator layer, clamped to [-24, 24]. Noise layers are unaffected. Default 0. */
	pitch?: number;
	/** Time-stretch divisor on every envelope, duration and delay, clamped to [0.25, 4]. 2 = twice as fast. Default 1. */
	playbackRate?: number;
}

export interface SoundPreferences {
	/** Master switch. Default false — sound is strictly opt-in. */
	enabled: boolean;
	/** 0..1, default 0.5. The engine multiplies it again by SOUND_LIMITS.MASTER_CEILING. */
	volume: number;
	theme: SoundThemeName;
}

export const DEFAULT_SOUND_PREFERENCES: Readonly<SoundPreferences> = Object.freeze({
	enabled: false,
	volume: 0.5,
	theme: "fancy",
});

/** What `localStorage["fancy-ui-sound"]` holds: `{ v: 1, ...SoundPreferences }`. */
export interface SoundPreferencesV1 extends SoundPreferences {
	v: 1;
}
export const SOUND_STORAGE_KEY = "fancy-ui-sound";

// ---------------------------------------------------------------------------
// Synthesis description
// ---------------------------------------------------------------------------

export type SoundWave = "sine" | "triangle" | "square" | "sawtooth";

/** All times in milliseconds (before `playbackRate`). `sustain` is a level 0..1. */
export interface SoundEnvelope {
	attack: number;
	decay: number;
	sustain: number;
	release: number;
}

export interface SoundFilter {
	type: "lowpass" | "highpass" | "bandpass" | "notch" | "peaking";
	/** Hz at the layer's start. */
	frequency: number;
	/** Hz at the layer's end; exponential glide over the layer's `duration` when set. */
	frequencyEnd?: number;
	q?: number;
}

interface SoundLayerBase {
	/** Peak linear gain 0..1 (engine clamps to SOUND_LIMITS.LAYER_PEAK_CEILING). */
	gain: number;
	envelope: SoundEnvelope;
	filter?: SoundFilter;
	/** Ms after the cue's start before this layer begins. Default 0. */
	delay?: number;
	/** Total ms from this layer's start to the end of its release. Release begins at `duration - envelope.release`. */
	duration: number;
}

export interface SoundOscillatorLayer extends SoundLayerBase {
	kind: "oscillator";
	wave: SoundWave;
	/** Hz at start. */
	frequency: number;
	/** Hz at end; exponential glide over `duration` when set. */
	frequencyEnd?: number;
	/** Cents. Default 0. */
	detune?: number;
}

export interface SoundNoiseLayer extends SoundLayerBase {
	kind: "noise";
}

export type SoundLayer = SoundOscillatorLayer | SoundNoiseLayer;

export interface CueRecipe {
	layers: SoundLayer[];
	/** Trim applied to every layer, 0..1. Default 1. */
	gain?: number;
}

export interface SoundThemeDefinition {
	name: SoundThemeName;
	cues: Record<SoundCue, CueRecipe>;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * idle         — no AudioContext yet (nothing attempted, or attempted outside a user gesture)
 * ready        — context running
 * suspended    — context exists but is suspended/interrupted; resume pending or awaiting next gesture
 * unsupported  — no AudioContext constructor, or construction threw (also SSR)
 * blocked      — resume() rejected, or the context is closed
 */
export type SoundEngineState = "idle" | "ready" | "suspended" | "unsupported" | "blocked";

/** Default same-cue minimum interval, ms. Engine-enforced, independent of the action's own guards. */
export const SOUND_MIN_INTERVAL_MS: Readonly<Record<SoundCue, number>> = Object.freeze({
	hover: 60,
	tick: 40,
	select: 40,
	press: 15,
	"toggle-on": 15,
	"toggle-off": 15,
	open: 15,
	close: 15,
	success: 15,
	error: 15,
	copy: 15,
});

/** Hard safety limits. Not configurable. */
export const SOUND_LIMITS = Object.freeze({
	/** Master gain = prefs.volume * MASTER_CEILING. */
	MASTER_CEILING: 0.8,
	/** Per-layer peak gain clamp. */
	LAYER_PEAK_CEILING: 0.9,
	/** Concurrent voices; extra `play()` calls are dropped, never steal. */
	MAX_VOICES: 8,
	/** Minimum attack / release enforced for click-free edges. */
	MIN_ATTACK_MS: 2,
	MIN_RELEASE_MS: 8,
	/** Longest any single layer may run (guards a malformed theme). */
	MAX_LAYER_MS: 400,
});

export interface SoundStatus {
	/** `true` once an AudioContext constructor was found in this environment. `false` on the server and until first probe. */
	supported: boolean;
	enabled: boolean;
	volume: number;
	theme: SoundThemeName;
	engine: SoundEngineState;
	/** Outcome of the most recent storage read/write. */
	storage: "untouched" | "ok" | "unavailable" | "error";
	lastCue: SoundCue | null;
	/** `performance.now()` of the last cue actually scheduled, or null. */
	lastPlayedAt: number | null;
	/** Last swallowed Web Audio / storage error message, for the Sound Lab status line. */
	lastError: string | null;
}
