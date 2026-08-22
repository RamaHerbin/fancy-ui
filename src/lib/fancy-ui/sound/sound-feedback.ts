/**
 * `use:soundFeedback` — declarative event → cue mapping for any element.
 *
 * Semantics:
 * - SSR (`typeof document === "undefined"`) → return {}.
 * - Listeners are bound `{ passive: true }`; the action never calls
 *   `preventDefault`/`stopPropagation` — it only listens.
 * - Defaults to `{ click: "press" }`. Hover is opt-in (`on: { pointerenter:
 *   "hover" }`) — a hover cue is a deliberate choice for dense pointer UI, not
 *   something every button should inherit. `on` REPLACES the defaults.
 * - Universal guard: `opts.disabled` or the node matching
 *   `:disabled,[aria-disabled="true"],[data-disabled="true"]` → silent.
 * - Hover guard (pointerenter/mouseenter only), all of which must pass:
 *   · `event.isTrusted` unless `allowUntrusted`;
 *   · `pointerType` is "mouse" or "pen" — a touch tap fires pointerenter and
 *     then click, and one tap must be one cue; "" is a synthesized pointer; a
 *     compatibility mouseenter from a tap carries `sourceCapabilities.firesTouchEvents`;
 *   · a pointer actually moved within the last HOVER_RECENCY_MS — content
 *     scrolling under a stationary pointer also fires pointerenter, and that
 *     is not a hover;
 *   · `relatedTarget` is not inside the node (re-entry from a descendant).
 * - Resolver errors are swallowed — a broken resolver silences that event,
 *   it never throws into the DOM dispatch.
 * - `update()` unbinds every listener and rebinds from the new options.
 *   `destroy()` unbinds every listener.
 */

import type { Action } from "svelte/action";
import { sound } from "./sound.svelte.js";
import type { SoundCue } from "./types.js";

/** Return a cue to play, or null/undefined to stay silent for this event. */
export type SoundCueResolver = (event: Event) => SoundCue | null | undefined;
export type SoundCueSpec = SoundCue | SoundCueResolver;

export interface SoundFeedbackOptions {
	/**
	 * DOM event name → cue. When omitted the default is `{ click: "press" }`.
	 * When given it REPLACES the defaults — add `pointerenter: "hover"` to opt
	 * into hover feedback.
	 */
	on?: Record<string, SoundCueSpec>;
	/** Skips every cue while true. */
	disabled?: boolean;
	/** Forwarded to `sound.play` for every cue. */
	volume?: number;
	pitch?: number;
	/** Let `isTrusted === false` hover events through (tests, programmatic pointer events). Default false. */
	allowUntrusted?: boolean;
}

export const DEFAULT_SOUND_FEEDBACK_ON: Readonly<Record<string, SoundCue>> = Object.freeze({
	click: "press",
});

const HOVER_EVENTS = new Set(["pointerenter", "mouseenter"]);
const HOVER_POINTER_TYPES = new Set(["mouse", "pen"]);
/** A hover needs a pointer that moved this recently; scroll-under enters have no movement. */
const HOVER_RECENCY_MS = 150;

// One document-level pointermove listener shared by every action instance that
// maps a hover event, attached with the first and removed with the last.
let lastPointerMoveAt = -Infinity;
let hoverInstances = 0;
function onDocumentPointerMove(): void {
	lastPointerMoveAt = performance.now();
}
function retainHoverTracking(): void {
	if (hoverInstances++ === 0) {
		document.addEventListener("pointermove", onDocumentPointerMove, {
			capture: true,
			passive: true,
		});
	}
}
function releaseHoverTracking(): void {
	if (--hoverInstances === 0) {
		document.removeEventListener("pointermove", onDocumentPointerMove, { capture: true });
		lastPointerMoveAt = -Infinity;
	}
}

/** Test-only: drops the shared pointer-tracking state between tests. Not exported from index.ts. */
export function resetSoundFeedbackForTests(): void {
	if (hoverInstances > 0 && typeof document !== "undefined") {
		document.removeEventListener("pointermove", onDocumentPointerMove, { capture: true });
	}
	hoverInstances = 0;
	lastPointerMoveAt = -Infinity;
}

export const soundFeedback: Action<HTMLElement, SoundFeedbackOptions | undefined> = (
	node,
	initialOptions
) => {
	if (typeof document === "undefined") return {};

	let options = initialOptions ?? {};
	let bound: Array<{ event: string; listener: EventListener }> = [];
	let tracksHover = false;

	function isDisabled(): boolean {
		if (options.disabled) return true;
		return node.matches(':disabled,[aria-disabled="true"],[data-disabled="true"]');
	}

	function isSuppressedHover(event: Event): boolean {
		if (event.isTrusted === false && !options.allowUntrusted) return true;
		const pointerType = (event as PointerEvent).pointerType;
		// pointerenter always carries a pointerType; anything but mouse/pen is a
		// tap or a synthesized pointer. A bare mouseenter has none — then the only
		// tell for a tap is sourceCapabilities.firesTouchEvents.
		if (pointerType !== undefined && !HOVER_POINTER_TYPES.has(pointerType)) return true;
		const capabilities = (
			event as UIEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } }
		).sourceCapabilities;
		if (capabilities?.firesTouchEvents) return true;
		if (performance.now() - lastPointerMoveAt > HOVER_RECENCY_MS) return true;
		const relatedTarget = (event as MouseEvent).relatedTarget;
		if (relatedTarget instanceof Node && node.contains(relatedTarget)) return true;
		return false;
	}

	function makeListener(eventName: string, spec: SoundCueSpec): EventListener {
		return (event: Event) => {
			if (isDisabled()) return;
			if (HOVER_EVENTS.has(eventName) && isSuppressedHover(event)) return;

			let cue: SoundCue | null | undefined;
			try {
				cue = typeof spec === "function" ? spec(event) : spec;
			} catch {
				return;
			}
			if (cue == null) return;
			sound.play(cue, { volume: options.volume, pitch: options.pitch });
		};
	}

	function bind(): void {
		const on = options.on ?? DEFAULT_SOUND_FEEDBACK_ON;
		bound = Object.entries(on).map(([event, spec]) => {
			const listener = makeListener(event, spec);
			node.addEventListener(event, listener, { passive: true });
			return { event, listener };
		});
		tracksHover = bound.some(({ event }) => HOVER_EVENTS.has(event));
		if (tracksHover) retainHoverTracking();
	}

	function unbind(): void {
		for (const { event, listener } of bound) {
			node.removeEventListener(event, listener);
		}
		bound = [];
		if (tracksHover) {
			tracksHover = false;
			releaseHoverTracking();
		}
	}

	bind();

	return {
		update(next) {
			options = next ?? {};
			unbind();
			bind();
		},
		destroy() {
			unbind();
		},
	};
};
