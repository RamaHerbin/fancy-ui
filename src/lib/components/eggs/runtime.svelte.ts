/**
 * The easter-egg runtime: one keydown listener plus delegated click/pointerover
 * listeners on document, dispatching to each egg's trigger, then loading its
 * payload on demand. Nothing touches window/document until `start()`.
 */

import { untrack, type Component } from "svelte";
import { createMotionState } from "$lib/stores";
import { markFound, isFound } from "./discovery.svelte.js";
import { createKeySequenceMatcher, type KeySequenceMatcher } from "./sequence.js";
import { createTypedWordBuffer, type TypedWordBuffer } from "./typed-word.js";
import { hasModifier, isEditableTarget, isPrintableKey } from "./shared.js";
import { EGGS } from "./registry.js";
import type { EggContext, EggDef, EggId } from "./types.js";

export const QUIET_NOTE_MS = 4000;

export interface ActiveEgg {
	id: EggId;
	component: Component<{ ctx: EggContext }>;
	ctx: EggContext;
}

export interface EggRuntime {
	readonly active: ActiveEgg | null;
	/** Quiet-note state (reduced motion). */
	readonly note: { id: EggId; title: string } | null;
	/** Installs document listeners, returns stop(); idempotent. */
	start(): () => void;
	trigger(id: EggId): Promise<void>;
	dismiss(): void;
	list(): { id: EggId; title: string; hint: string; found: boolean; hidden: boolean }[];
}

export interface EggRuntimeDeps {
	isPaused?: () => boolean;
	now?: () => number;
}

export function createEggRuntime(
	defs: readonly EggDef[] | (() => readonly EggDef[]),
	deps: EggRuntimeDeps = {}
): EggRuntime {
	const getDefs = typeof defs === "function" ? defs : () => defs;
	let motion: ReturnType<typeof createMotionState> | undefined;
	// The motion module is a static import; only its state (and its matchMedia
	// read) is created lazily, on the first trigger.
	const isPaused = deps.isPaused ?? (() => (motion ??= createMotionState()).paused);
	const now = deps.now ?? (() => Date.now());

	// Raw: a deep proxy would break the `active.ctx === ctx` identity check.
	let active = $state.raw<ActiveEgg | null>(null);
	let note = $state<{ id: EggId; title: string } | null>(null);
	let dismissTimer: ReturnType<typeof setTimeout> | undefined;
	let noteTimer: ReturnType<typeof setTimeout> | undefined;
	/**
	 * Bumped on every overlay fire and on every public dismiss, so a slow load
	 * never overrides a newer egg nor mounts one the visitor already dismissed.
	 */
	let generation = 0;
	/** Stops observing the motion preference for the mounted overlay. */
	let stopMotionWatch: (() => void) | undefined;
	/** dom-trigger hit timestamps per egg; lives as long as the runtime (root layout). */
	const hits = new Map<EggId, number[]>();
	let stopFn: (() => void) | null = null;

	const find = (id: string) => getDefs().find((d) => d.id === id);

	function clearDismissTimer() {
		if (dismissTimer !== undefined) clearTimeout(dismissTimer);
		dismissTimer = undefined;
	}

	function dismissOverlay() {
		clearDismissTimer();
		stopMotionWatch?.();
		stopMotionWatch = undefined;
		active = null;
	}

	/**
	 * Keeps watching the motion preference while a motion-sensitive overlay is
	 * up: pausing decorative motion, or the OS switching to reduced motion
	 * (both surface through `isPaused()`, which reads the reactive motion
	 * store), ends the effect now instead of at its auto-dismiss timeout.
	 */
	function watchMotion(ctx: EggContext) {
		stopMotionWatch = $effect.root(() => {
			$effect(() => {
				if (isPaused()) untrack(() => ctx.dismiss());
			});
		});
	}

	/** Public dismiss: the overlay, any quiet note, and any overlay still loading. */
	function dismiss() {
		generation++;
		dismissOverlay();
		if (noteTimer !== undefined) clearTimeout(noteTimer);
		noteTimer = undefined;
		note = null;
	}

	function showQuietNote(ctx: EggContext) {
		const def = find(ctx.id);
		if (noteTimer !== undefined) clearTimeout(noteTimer);
		note = { id: ctx.id, title: def?.title ?? ctx.id };
		noteTimer = setTimeout(() => {
			note = null;
			noteTimer = undefined;
		}, QUIET_NOTE_MS);
	}

	function makeContext(def: EggDef, reducedMotion: boolean): EggContext {
		const ctx: EggContext = {
			id: def.id,
			reducedMotion,
			dismiss() {
				// Only the overlay this context belongs to; a newer egg stays up.
				if (active?.ctx === ctx) dismissOverlay();
			},
			found() {
				markFound(def.id);
			},
			trigger: (id) => trigger(id),
		};
		return ctx;
	}

	async function trigger(id: EggId): Promise<void> {
		const def = find(id);
		if (!def) return;
		if (active?.id === id && def.toggle) {
			dismissOverlay();
			return;
		}
		if (def.foundOn !== "payload") markFound(id);
		const paused = isPaused();
		const ctx = makeContext(def, paused);
		if (def.motionSensitive !== false && paused) {
			(def.fallback ?? showQuietNote)(ctx);
			return;
		}
		if (!def.load) return;
		const gen = ++generation;
		let mod;
		try {
			mod = await def.load();
		} catch (error) {
			// A failed chunk (offline, stale deploy) must never break the page.
			console.warn(`[eggs] ${id} failed to load`, error);
			return;
		}
		if (mod?.default) {
			if (gen !== generation) return;
			dismissOverlay();
			active = { id, component: mod.default, ctx };
			if (def.motionSensitive !== false) watchMotion(ctx);
			if (def.autoDismissMs && def.autoDismissMs > 0) {
				dismissTimer = setTimeout(() => ctx.dismiss(), def.autoDismissMs);
			}
		} else if (mod?.run) {
			await mod.run(ctx);
		}
	}

	function start(): () => void {
		if (stopFn) return stopFn;
		if (typeof document === "undefined") return () => {};

		const all = getDefs();
		const sequences: [EggId, KeySequenceMatcher][] = [];
		const wordOwner = new Map<string, EggId>();
		for (const def of all) {
			if (def.trigger.kind === "sequence") {
				sequences.push([def.id, createKeySequenceMatcher(def.trigger.keys)]);
			} else if (def.trigger.kind === "word") {
				wordOwner.set(def.trigger.word.toLowerCase(), def.id);
			}
		}
		const words: TypedWordBuffer = createTypedWordBuffer([...wordOwner.keys()]);
		const domDefs = all.filter(
			(d): d is EggDef & { trigger: Extract<EggDef["trigger"], { kind: "dom" }> } =>
				d.trigger.kind === "dom"
		);

		// Never preventDefault / stopPropagation: eggs only listen.
		function onKeydown(e: KeyboardEvent) {
			if (hasModifier(e)) return;
			// Escape first: an overlay must close even while focus sits in a field.
			// No preventDefault, so the field's own Escape still works. Always
			// dismiss: an overlay chunk still loading must not mount afterwards.
			if (e.key === "Escape") {
				dismiss();
				words.reset();
				return;
			}
			if (isEditableTarget(e.target)) return;
			const key = e.key.toLowerCase();
			for (const [id, matcher] of sequences) {
				if (matcher.feed(key)) void trigger(id);
			}
			if (isPrintableKey(e.key)) {
				const word = words.feed(key);
				const id = word ? wordOwner.get(word) : undefined;
				if (id) void trigger(id);
			}
		}

		function record(def: (typeof domDefs)[number]) {
			const { count, windowMs } = def.trigger;
			const t = now();
			const list = (hits.get(def.id) ?? []).filter((ts) => t - ts < windowMs);
			list.push(t);
			if (list.length >= count) {
				hits.delete(def.id);
				void trigger(def.id);
			} else {
				hits.set(def.id, list);
			}
		}

		function onDom(e: Event, kind: "click" | "pointerenter") {
			const target = e.target;
			if (!(target instanceof Element)) return;
			for (const def of domDefs) {
				if (def.trigger.event !== kind) continue;
				const el = target.closest(def.trigger.selector);
				if (!el) continue;
				if (kind === "pointerenter") {
					// pointerover bubbles from children: only count entering the element itself.
					const from = (e as PointerEvent).relatedTarget;
					if (from instanceof Node && el.contains(from)) continue;
				}
				record(def);
			}
		}

		const onClick = (e: Event) => onDom(e, "click");
		const onOver = (e: Event) => onDom(e, "pointerenter");
		document.addEventListener("keydown", onKeydown);
		if (domDefs.length > 0) {
			document.addEventListener("click", onClick);
			document.addEventListener("pointerover", onOver);
		}

		stopFn = () => {
			document.removeEventListener("keydown", onKeydown);
			document.removeEventListener("click", onClick);
			document.removeEventListener("pointerover", onOver);
			stopFn = null;
		};
		return stopFn;
	}

	return {
		get active() {
			return active;
		},
		get note() {
			return note;
		},
		start,
		trigger,
		dismiss,
		list() {
			return getDefs().map((d) => ({
				id: d.id,
				title: d.title,
				hint: d.hint,
				found: isFound(d.id),
				hidden: d.hidden === true,
			}));
		},
	};
}

/** Site singleton. The constructor touches neither window nor document. */
export const eggRuntime: EggRuntime = createEggRuntime(() => EGGS);
