import type { Component } from "svelte";

/** Every egg id, in one place so stores and tests can validate against it. */
export const EGG_IDS = [
	"cheatcode",
	"console",
	"matrix",
	"logo",
	"lost",
	"retro",
	"humans",
	"melody",
] as const;

export type EggId = (typeof EGG_IDS)[number];

/** Above CommandSearch (z 70), Toaster/FluidCursor (50) and DatamoshTransition's default 9999. */
export const EGG_OVERLAY_Z = 10000;

export type EggTrigger =
	/** Compared against KeyboardEvent.key, lower-cased ("arrowup", "b"). */
	| { kind: "sequence"; keys: readonly string[] }
	/** Single printable keys typed outside editables, lower-cased, ring buffer of 16. */
	| { kind: "word"; word: string }
	/** Delegated on document: `count` hits on `selector` within `windowMs`. */
	| {
			kind: "dom";
			event: "click" | "pointerenter";
			selector: string;
			count: number;
			windowMs: number;
	  }
	/** Only runtime.trigger(id) / page code. */
	| { kind: "manual" };

export interface EggContext {
	id: EggId;
	/** isPaused() at fire time (user paused decorative motion OR OS reduced motion). */
	reducedMotion: boolean;
	/** Unmount this egg's overlay / end the run. No-op once another egg replaced it. */
	dismiss(): void;
	/** Record discovery (for foundOn: "payload"). */
	found(): void;
	/** Chaining (logo -> cheatcode). */
	trigger(id: EggId): Promise<void>;
}

export interface EggPayloadModule {
	/** Rendered inside the overlay host; the wrapper carries data-egg-overlay={id}. */
	default?: Component<{ ctx: EggContext }>;
	/** Overlay-less payloads (melody). */
	run?: (ctx: EggContext) => void | Promise<void>;
}

export interface EggDef {
	id: EggId;
	/** Display order in window.fancy.eggs(). */
	order: number;
	/** e.g. "Party mode". */
	title: string;
	/** Cryptic one-liner shown when not yet found. */
	hint: string;
	trigger: EggTrigger;
	/** The ONLY place that may reference .svelte / $lib/fancy-ui / canvas-confetti (dynamic import). */
	load?: () => Promise<EggPayloadModule>;
	/** Reduced-motion path; default = quiet note. */
	fallback?: (ctx: EggContext) => void;
	/** Default true; false = never diverted to fallback (melody). */
	motionSensitive?: boolean;
	/** Default "trigger". */
	foundOn?: "trigger" | "payload";
	/** 0/undefined = payload manages; the runtime always handles Escape. */
	autoDismissMs?: number;
	/** Re-trigger while active dismisses instead. */
	toggle?: boolean;
	/** Excluded from EGG_TOTAL and from the eggs() count (humans). */
	hidden?: boolean;
}
