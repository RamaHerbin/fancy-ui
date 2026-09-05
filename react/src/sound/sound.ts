/**
 * Sound controller — the module-level singleton that owns the user's sound
 * preference, persists it, and drives the engine. It is a singleton because
 * `sound.play()` must be callable from anywhere, including code that never
 * runs inside a React tree.
 *
 * Invariants:
 * - ZERO browser-global access at module evaluation. Preferences hydrate
 *   lazily on the first IMPERATIVE entry point — any controller getter or
 *   method, or `hydrateSound()` called from an effect — never on import and
 *   never from a render path.
 * - `play()` is a no-op unless in the browser AND enabled AND the engine can
 *   schedule. It never throws.
 * - `enable()` never plays a cue itself; the confirmation cue lives in
 *   SoundToggle (inside the user's click).
 * - A cue that arrives while the AudioContext is still idle or suspended is
 *   not lost: exactly ONE pending cue is kept, the context is unlocked inside
 *   the same gesture, and that cue is replayed once the context runs. Bursts
 *   are never queued.
 * - `sound` is a plain object literal so tests can `vi.spyOn(sound, "play")`.
 *
 * React binding: a module-scope store read through `useSyncExternalStore`
 * (`subscribeSound` / `getSoundSnapshot` / `getSoundServerSnapshot`), with no
 * provider and no context. The `sound` prop is an ordinary boolean on seven
 * components and must work with zero setup; the state is genuinely global (one
 * storage key, one cross-tab listener, one AudioContext); and a store
 * re-renders only the components that actually subscribed, where a provider
 * would re-render its whole subtree on every volume change.
 */

import { createSoundEngine, type SoundEngine } from "./engine.js";
import { getSoundTheme } from "./themes.js";
import {
	DEFAULT_SOUND_PREFERENCES,
	SOUND_STORAGE_KEY,
	SOUND_THEME_NAMES,
	type SoundCue,
	type SoundPlayOptions,
	type SoundPreferences,
	type SoundStatus,
	type SoundThemeName,
} from "./types.js";

export interface SoundController {
	// --- current preferences (each read hydrates on first access) ---
	readonly enabled: boolean;
	readonly volume: number;
	readonly theme: SoundThemeName;
	/** Plain snapshot object (new object per read), safe to spread/JSON. */
	readonly preferences: SoundPreferences;
	/** Stable view over the live status; `getSoundStatus()` returns the same data as a fresh object. */
	readonly status: SoundStatus;

	// --- playback ---
	/** No-op (returns void, never throws) unless in browser AND enabled AND engine can schedule. */
	play(cue: SoundCue, options?: SoundPlayOptions): void;
	/** Creates/resumes the AudioContext inside the current gesture. Resolves engine-running. */
	unlock(): Promise<boolean>;

	// --- preferences (each persists, notifies subscribers, mirrors into the engine) ---
	/** Also calls unlock() fire-and-forget — the enabling click IS the gesture. Plays nothing. */
	enable(): void;
	disable(): void;
	/** Returns the new `enabled`. */
	toggle(): boolean;
	setEnabled(enabled: boolean): void;
	/** Clamped [0,1]; NaN ignored. */
	setVolume(volume: number): void;
	/** Unknown names ignored. */
	setTheme(theme: SoundThemeName): void;

	/** Store contract, unchanged: calls `run` immediately, then on every preference change. */
	subscribe(run: (prefs: SoundPreferences) => void): () => void;
}

/** What a `useSyncExternalStore` reader sees. Identity-cached — see `getSoundSnapshot`. */
export interface SoundSnapshot {
	readonly enabled: boolean;
	readonly volume: number;
	readonly theme: SoundThemeName;
	readonly status: SoundStatus;
}

function createInitialStatus(): SoundStatus {
	return {
		supported: false,
		enabled: false,
		volume: DEFAULT_SOUND_PREFERENCES.volume,
		theme: DEFAULT_SOUND_PREFERENCES.theme,
		engine: "idle",
		storage: "untouched",
		lastCue: null,
		lastPlayedAt: null,
		lastError: null,
	};
}

const prefs: SoundPreferences = { ...DEFAULT_SOUND_PREFERENCES };
const status: SoundStatus = createInitialStatus();
let hydrated = false;
let storageListenerAttached = false;
let engine: SoundEngine | null = null;
let pending: { cue: SoundCue; options?: SoundPlayOptions } | null = null;
let unlocking = false;
const subscribers = new Set<(prefs: SoundPreferences) => void>();
const reactListeners = new Set<() => void>();
/** Bumped by every mutation path; the snapshot cache is keyed on it. */
let version = 0;

/** Pure parser for the stored JSON. Never throws. Exported for tests. */
export function parseStoredPreferences(raw: string | null): SoundPreferences {
	if (raw == null) return { ...DEFAULT_SOUND_PREFERENCES };
	try {
		const data = JSON.parse(raw) as Partial<Record<string, unknown>> | null;
		if (!data || typeof data !== "object" || data.v !== 1) return { ...DEFAULT_SOUND_PREFERENCES };
		const volume =
			typeof data.volume === "number" && Number.isFinite(data.volume)
				? Math.min(1, Math.max(0, data.volume))
				: DEFAULT_SOUND_PREFERENCES.volume;
		const theme = (SOUND_THEME_NAMES as readonly string[]).includes(data.theme as string)
			? (data.theme as SoundThemeName)
			: DEFAULT_SOUND_PREFERENCES.theme;
		return { enabled: data.enabled === true, volume, theme };
	} catch {
		return { ...DEFAULT_SOUND_PREFERENCES };
	}
}

/**
 * Writes preferences field by field, never `prefs = …`. The Svelte reason (a
 * replacement `$state` proxy created inside a reader's own derived would be
 * untracked for that reader) is gone with the runes, but `ensureEngine`'s
 * options and `statusView` both read through this one object, so the rule is
 * kept: one object, mutated in place, and the two files stay diffable.
 */
function assignPrefs(next: SoundPreferences): void {
	prefs.enabled = next.enabled;
	prefs.volume = next.volume;
	prefs.theme = next.theme;
}

function snapshot(): SoundPreferences {
	return { enabled: prefs.enabled, volume: prefs.volume, theme: prefs.theme };
}

/**
 * Marks the state dirty and wakes every `useSyncExternalStore` reader.
 *
 * Deliberately split from `notify()`. `subscribe()`'s contract is a
 * PREFERENCES store: it must fire exactly where the Svelte controller fires it
 * and not one time more. A React reader additionally renders `status`, which
 * `persist()`, `markPlayed()` and the engine's `onStateChange` change without
 * touching preferences. So every mutation path bumps the version; only the
 * preference paths also fan out to `subscribers`.
 */
function bump(): void {
	version += 1;
	for (const listener of reactListeners) listener();
}

function notify(): void {
	bump();
	const next = snapshot();
	for (const run of subscribers) run(next);
}

/** Persists the current preferences. Every failure is swallowed into `status.storage`. */
function persist(): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 1, enabled: prefs.enabled, volume: prefs.volume, theme: prefs.theme })
		);
		status.storage = "ok";
	} catch (err) {
		status.storage = "error";
		status.lastError = err instanceof Error ? err.message : String(err);
	}
	bump();
}

/** Cross-tab sync. Never writes back to storage — that would loop the tab that wrote it. */
function handleStorage(event: StorageEvent): void {
	if (event.key !== SOUND_STORAGE_KEY && event.key !== null) return;
	const next = parseStoredPreferences(event.newValue);
	// The Svelte source wrapped the two writes below in `untrack`, because
	// Svelte rejects a `$state` write made while a derived is the active
	// reaction. React has no such rule and the wrappers are gone; nothing else
	// about this function changed.
	assignPrefs(next);
	status.storage = "ok";
	engine?.setMasterVolume(next.volume);
	engine?.setTheme(getSoundTheme(next.theme));
	notify();
}

/** Lazy hydration: reads storage once, attaches the cross-tab listener once, probes support once. */
function ensure(): void {
	if (hydrated) return;
	hydrated = true;
	if (typeof window === "undefined") return;
	try {
		assignPrefs(parseStoredPreferences(window.localStorage.getItem(SOUND_STORAGE_KEY)));
		status.storage = "ok";
	} catch {
		status.storage = "unavailable";
	}
	// Probe without constructing: a browser with no Web Audio is known
	// before the first click, so a SoundToggle can present itself honestly.
	status.supported = typeof window.AudioContext !== "undefined" || "webkitAudioContext" in window;
	if (!status.supported) status.engine = "unsupported";
	if (!storageListenerAttached) {
		storageListenerAttached = true;
		window.addEventListener("storage", handleStorage);
	}
	// React readers start at the frozen defaults — the same values the server
	// rendered — and this is the moment they learn the stored preference.
	// `subscribers` are NOT called: `subscribe()` runs `ensure()` before it
	// registers, so a store consumer never saw the pre-hydration value.
	bump();
}

/** Creates the engine on first use. Creating it allocates nothing (no AudioContext yet). */
function ensureEngine(): SoundEngine {
	if (!engine) {
		engine = createSoundEngine({
			onStateChange: (state, error) => {
				status.engine = state;
				// A transition without an error must not erase a storage message
				// the Sound Lab still wants to show; `lastError` means "last".
				if (error) status.lastError = error;
				bump();
			},
			masterVolume: prefs.volume,
			theme: getSoundTheme(prefs.theme),
		});
	}
	return engine;
}

function markPlayed(cue: SoundCue): void {
	status.lastCue = cue;
	status.lastPlayedAt = performance.now();
	bump();
}

/**
 * Stable view over the live status. A fresh spread would hand every caller a
 * new object identity on every read; with getters, `sound.status` is one
 * object for the life of the module and still reports live values.
 */
const statusView: SoundStatus = {
	get supported() {
		return status.supported;
	},
	get enabled() {
		return prefs.enabled;
	},
	get volume() {
		return prefs.volume;
	},
	get theme() {
		return prefs.theme;
	},
	get engine() {
		return status.engine;
	},
	get storage() {
		return status.storage;
	},
	get lastCue() {
		return status.lastCue;
	},
	get lastPlayedAt() {
		return status.lastPlayedAt;
	},
	get lastError() {
		return status.lastError;
	},
};

export const sound: SoundController = {
	get enabled() {
		ensure();
		return prefs.enabled;
	},
	get volume() {
		ensure();
		return prefs.volume;
	},
	get theme() {
		ensure();
		return prefs.theme;
	},
	get preferences() {
		ensure();
		return snapshot();
	},
	get status() {
		ensure();
		return statusView;
	},
	play(cue: SoundCue, options?: SoundPlayOptions): void {
		ensure();
		if (typeof window === "undefined") return;
		if (!prefs.enabled) return;
		const eng = ensureEngine();
		if (eng.play(cue, options)) {
			markPlayed(cue);
			return;
		}
		// Not scheduled. If that is because the context is still idle (first
		// cue after a cold load), suspended (browser paused it), or blocked (an
		// earlier resume() was rejected outside a gesture — this call comes from
		// one, so it can still recover), unlock inside this same gesture and
		// replay exactly this one cue once running. Any other reason
		// (unsupported, rate-limited, voice cap) stays dropped.
		if (eng.state !== "idle" && eng.state !== "suspended" && eng.state !== "blocked") return;
		pending = { cue, options };
		if (unlocking) return;
		unlocking = true;
		void eng.unlock().then((ok) => {
			unlocking = false;
			const next = pending;
			pending = null;
			if (!ok || !next || !prefs.enabled) return;
			if (eng.play(next.cue, next.options)) markPlayed(next.cue);
		});
	},
	unlock(): Promise<boolean> {
		ensure();
		if (typeof window === "undefined") return Promise.resolve(false);
		return ensureEngine().unlock();
	},
	enable(): void {
		ensure();
		prefs.enabled = true;
		persist();
		notify();
		// Fire-and-forget: the click that enables sound IS the user gesture that
		// may unlock the AudioContext. No cue plays here — see SoundToggle.
		void sound.unlock();
	},
	disable(): void {
		ensure();
		prefs.enabled = false;
		persist();
		notify();
	},
	// toggle() and setEnabled() route through enable()/disable() so all three
	// share one unlock policy — a consumer building their own control with
	// `sound.toggle()` gets the same gesture-bound AudioContext as SoundToggle.
	toggle(): boolean {
		ensure();
		if (prefs.enabled) sound.disable();
		else sound.enable();
		return prefs.enabled;
	},
	setEnabled(enabled: boolean): void {
		ensure();
		if (enabled === true) sound.enable();
		else sound.disable();
	},
	setVolume(volume: number): void {
		ensure();
		if (!Number.isFinite(volume)) return;
		prefs.volume = Math.min(1, Math.max(0, volume));
		persist();
		engine?.setMasterVolume(prefs.volume);
		notify();
	},
	setTheme(theme: SoundThemeName): void {
		ensure();
		if (!(SOUND_THEME_NAMES as readonly string[]).includes(theme)) return;
		prefs.theme = theme;
		persist();
		engine?.setTheme(getSoundTheme(theme));
		notify();
	},
	subscribe(run: (prefs: SoundPreferences) => void): () => void {
		ensure();
		subscribers.add(run);
		run(snapshot());
		return () => {
			subscribers.delete(run);
		};
	},
};

/** Non-reactive snapshot for status lines / logging. Always a fresh plain object. */
export function getSoundStatus(): SoundStatus {
	ensure();
	return {
		supported: status.supported,
		enabled: prefs.enabled,
		volume: prefs.volume,
		theme: prefs.theme,
		engine: status.engine,
		storage: status.storage,
		lastCue: status.lastCue,
		lastPlayedAt: status.lastPlayedAt,
		lastError: status.lastError,
	};
}

// ---------------------------------------------------------------------------
// The React store contract
// ---------------------------------------------------------------------------

/**
 * What the server renders and what the client's HYDRATION render returns:
 * the frozen defaults. Never calls `ensure()`, never touches localStorage, so
 * a server/client divergence is not reachable — the stored preference only
 * arrives after `hydrateSound()` runs in an effect.
 */
const SERVER_SNAPSHOT: SoundSnapshot = Object.freeze({
	enabled: DEFAULT_SOUND_PREFERENCES.enabled,
	volume: DEFAULT_SOUND_PREFERENCES.volume,
	theme: DEFAULT_SOUND_PREFERENCES.theme,
	status: Object.freeze(createInitialStatus()),
});

let snapshotCache: SoundSnapshot = SERVER_SNAPSHOT;
let snapshotVersion = version;

export function subscribeSound(listener: () => void): () => void {
	reactListeners.add(listener);
	return () => {
		reactListeners.delete(listener);
	};
}

/**
 * IDENTITY-CACHED, and mandatory: `useSyncExternalStore` calls `getSnapshot`
 * on every render and infinite-loops if the identity changes with no real
 * change. `sound.preferences` and `getSoundStatus()` still return a fresh
 * object per call by design — this cache is additive, rebuilt only when a
 * mutation path bumped the version.
 *
 * It never calls `ensure()`: a render path must not read localStorage. Before
 * hydration it returns exactly the object `getSoundServerSnapshot()` returns.
 */
export function getSoundSnapshot(): SoundSnapshot {
	if (snapshotVersion !== version) {
		snapshotVersion = version;
		snapshotCache = {
			enabled: prefs.enabled,
			volume: prefs.volume,
			theme: prefs.theme,
			status: {
				supported: status.supported,
				enabled: prefs.enabled,
				volume: prefs.volume,
				theme: prefs.theme,
				engine: status.engine,
				storage: status.storage,
				lastCue: status.lastCue,
				lastPlayedAt: status.lastPlayedAt,
				lastError: status.lastError,
			},
		};
	}
	return snapshotCache;
}

/** The frozen defaults. NEVER calls `ensure()`, never touches localStorage. */
export function getSoundServerSnapshot(): SoundSnapshot {
	return SERVER_SNAPSHOT;
}

/**
 * Idempotent. Reads localStorage, attaches the cross-tab listener, probes
 * AudioContext support without constructing one, then wakes every store
 * reader. Called from an EFFECT (`use-sound.ts`), never from a render.
 */
export function hydrateSound(): void {
	ensure();
}

/**
 * Test-only: disposes the engine, resets prefs to defaults, clears the storage
 * listener and the preference subscribers, forgets storage state. Not exported
 * from index.ts.
 *
 * `reactListeners` is deliberately NOT cleared: those subscriptions belong to
 * `useSyncExternalStore` and are released by its own cleanup. Dropping one
 * behind React's back would strand a still-mounted component with a store it
 * can never hear from again.
 */
export function resetSoundForTests(): void {
	engine?.dispose();
	engine = null;
	if (storageListenerAttached && typeof window !== "undefined") {
		window.removeEventListener("storage", handleStorage);
	}
	storageListenerAttached = false;
	subscribers.clear();
	pending = null;
	unlocking = false;
	hydrated = false;
	assignPrefs(DEFAULT_SOUND_PREFERENCES);
	Object.assign(status, createInitialStatus());
	bump();
}
