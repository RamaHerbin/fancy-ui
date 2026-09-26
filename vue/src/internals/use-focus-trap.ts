import { onScopeDispose, toValue, watch, type WatchSource } from "vue";
import { focusTrap, type FocusTrapOptions as CoreFocusTrapOptions } from "./focus-trap.js";

/**
 * The composable's own option surface.
 *
 * Two deliberate differences from the core's `FocusTrapOptions`:
 *
 * 1. `initialFocus` accepts a `WatchSource` as well as a bare element. The
 *    core cannot: it is a shared, framework-free file and may not name a
 *    framework type. A caller's initial-focus target is almost always a
 *    template ref, which is `null` during `setup` and only becomes an element
 *    once the branch mounts, so accepting the source itself — and unwrapping
 *    it with `toValue()` at attach and update time — is what makes the option
 *    usable at all. A plain element or `null` still works unchanged.
 * 2. `onActivate` is absent. It exists in the Svelte action only because an
 *    action has no return channel to its template — the composable simply
 *    RETURNS the two functions instead (see `FocusTrapHandle` below). An
 *    `active: boolean` option is deliberately not offered either: it would
 *    need its own watcher plus a first-run guard for the same two moments,
 *    and it would drop the `returnFocus: false` + eager-return contradiction
 *    rule the core's own `onActivate` doc comment spells out.
 *
 * Every other field keeps the core's name, default and doc comment.
 */
export interface FocusTrapOptions {
	/** Element to focus when the trap activates. Defaults to the first focusable descendant of node. */
	initialFocus?: WatchSource<HTMLElement | null> | HTMLElement | null;
	/**
	 * Whether to restore focus to the previously active element on unmount.
	 * Defaults to true. Does NOT govern `returnFocusNow()` — asking for the
	 * eager return IS asking for the return.
	 */
	returnFocus?: boolean;
	/**
	 * Called on teardown, but only when the element that had focus before the
	 * trap activated is no longer in the document. Should return a
	 * still-connected element to focus instead, typically the overlay's own
	 * trigger, or `null`/`undefined` to fall through to the last resort.
	 */
	fallbackFocus?: () => HTMLElement | null | undefined;
}

/** The two functions the Svelte action hands out through `onActivate`. */
export interface FocusTrapHandle {
	/**
	 * Runs the three-step return chain immediately and disarms the unmount
	 * return. Idempotent. Call at the dismiss instant (e.g. from the
	 * exit-start hook of a presence).
	 */
	returnFocusNow(): void;
	/**
	 * Undoes that latch and pulls focus back inside, recapturing the element
	 * it displaced. Call when a surface is reopened mid-exit.
	 */
	rearm(): void;
}

/** The core's three stored locals, resolved. What `update()` replaces wholesale. */
function resolve(options?: () => FocusTrapOptions): CoreFocusTrapOptions {
	const o = options?.() ?? {};
	return {
		initialFocus: toValue(o.initialFocus) ?? null,
		returnFocus: o.returnFocus,
		fallbackFocus: o.fallbackFocus,
	};
}

/**
 * Vue counterpart of `use:focusTrap`. Called in `setup`, where the element is
 * still `null` and the core does not exist yet, so the returned handle is a
 * small object created ONCE — its identity never changes and its methods are
 * no-ops until the core attaches from the post-flush watcher below. Handing a
 * caller the core handle directly, or a `computed`, is a port error: the
 * caller captures this object in its own `setup` closure and must be able to
 * call it before the trap has attached.
 */
export function useFocusTrap(
	el: WatchSource<HTMLElement | null>,
	options?: () => FocusTrapOptions,
): FocusTrapHandle {
	let core: { update?(o: CoreFocusTrapOptions): void; destroy?(): void } | undefined;
	let returnFocusNowImpl: (() => void) | undefined;
	let rearmImpl: (() => void) | undefined;

	const handle: FocusTrapHandle = {
		returnFocusNow() {
			returnFocusNowImpl?.();
		},
		rearm() {
			rearmImpl?.();
		},
	};

	function teardown() {
		core?.destroy?.();
		core = undefined;
		returnFocusNowImpl = undefined;
		rearmImpl = undefined;
	}

	watch(
		el,
		(node) => {
			teardown();
			if (node) {
				core =
					focusTrap(node, {
						...resolve(options),
						onActivate: (returnFocusNow, rearm) => {
							returnFocusNowImpl = returnFocusNow;
							rearmImpl = rearm;
						},
					}) ?? undefined;
			}
		},
		{ flush: "post" },
	);

	// Keyed on exactly the three fields the core stores as locals and replaces
	// in `update()` — `returnFocus`, `fallbackFocus`, `initialFocus` — with
	// `initialFocus` read through `toValue()` so a template ref that resolves
	// (or retargets, between form steps) drives the update too. `onActivate`
	// is deliberately NOT re-sent: the core only calls it at attach.
	watch(
		[
			() => toValue(options?.().initialFocus) ?? null,
			() => options?.().returnFocus,
			() => options?.().fallbackFocus,
		],
		() => {
			core?.update?.(resolve(options));
		},
		{ flush: "post" },
	);

	onScopeDispose(teardown);

	return handle;
}
