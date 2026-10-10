/**
 * The composable over `soundFeedback` — the counterpart of the source's
 * `use:soundFeedback`, which cannot be a directive here (a directive cannot
 * return a handle, and this package binds element behaviour through
 * composables).
 *
 * The core in `sound-feedback.ts` is a byte-identical shared file and owns all
 * the semantics: the default `{ click: "press" }`, the universal disabled
 * guard, the four-part hover guard, the shared document-level `pointermove`
 * tracking, the swallowed resolver errors and the `{ passive: true }` binding.
 * This file adds nothing but lifecycle.
 *
 * One optimisation is kept from the sibling port: the bind watcher is keyed on
 * the SORTED, JOINED event-name list, so listeners rebind only when the set of
 * event names actually changes. The cue specs, `disabled`, `volume`, `pitch`
 * and `allowUntrusted` are read through the options getter at event time.
 * Observably identical to the action's unbind-and-rebind-everything `update()`,
 * strictly less work.
 */

import { onMounted, onScopeDispose, toValue, watch, type WatchSource } from "vue";
import {
	DEFAULT_SOUND_FEEDBACK_ON,
	soundFeedback,
	type SoundCueSpec,
	type SoundFeedbackOptions,
} from "./sound-feedback.js";

/** The handle the core returns — the action's `{ update, destroy }`. */
type SoundFeedbackHandle = ReturnType<typeof soundFeedback>;

const EMPTY_OPTIONS: SoundFeedbackOptions = Object.freeze({});
/** Not a legal DOM event name, so it can never collide with one. */
const EVENT_KEY_SEPARATOR = " ";

export function useSoundFeedback(
	el: WatchSource<HTMLElement | null>,
	options?: () => SoundFeedbackOptions
): void {
	const read = (): SoundFeedbackOptions => options?.() ?? EMPTY_OPTIONS;
	const eventKey = (): string =>
		Object.keys(read().on ?? DEFAULT_SOUND_FEEDBACK_ON)
			.sort()
			.join(EVENT_KEY_SEPARATOR);

	let handle: SoundFeedbackHandle | null = null;
	let boundNode: HTMLElement | null = null;
	let boundKey: string | null = null;

	function release(): void {
		handle?.destroy?.();
		handle = null;
		boundNode = null;
		boundKey = null;
	}

	/** Idempotent for an unchanged (element, event-name-set) pair. */
	function arm(node: HTMLElement | null, key: string): void {
		if (node === boundNode && key === boundKey) return;
		release();
		if (!node) return;

		const names = key === "" ? [] : key.split(EVENT_KEY_SEPARATOR);
		const on: Record<string, SoundCueSpec> = {};
		for (const name of names) {
			// A delegating resolver, so a changed cue for an unchanged event
			// name needs no rebind. The core's own try/catch still swallows a
			// consumer resolver that throws, because it calls this one inside it.
			on[name] = (event: Event) => {
				const spec = (read().on ?? DEFAULT_SOUND_FEEDBACK_ON)[name];
				return typeof spec === "function" ? spec(event) : spec;
			};
		}

		// Getters, not a spread: the core reads these at dispatch time, so
		// every option but the event-name set stays live without rebinding.
		const live: SoundFeedbackOptions = {
			on,
			get disabled() {
				return read().disabled;
			},
			get volume() {
				return read().volume;
			},
			get pitch() {
				return read().pitch;
			},
			get allowUntrusted() {
				return read().allowUntrusted;
			},
		};

		handle = soundFeedback(node, live);
		boundNode = node;
		boundKey = key;
	}

	// Two entry points, one body. `onMounted` arms in the same flush as the
	// mount, so a click in the very next statement is already heard; the
	// post-flush watcher takes over for every later change. `arm()` being
	// idempotent is what makes the overlap between them free. Neither runs on
	// the server: the watcher has no `immediate` and `onMounted` never fires.
	onMounted(() => {
		arm(toValue(el), eventKey());
	});
	watch(
		[el, eventKey] as const,
		([node, key]) => {
			arm(node, key);
		},
		{ flush: "post" }
	);

	// `failSilently`: the composable is legal outside a component scope (a
	// standalone element binding), where there is simply nothing to dispose.
	onScopeDispose(release, true);
}
