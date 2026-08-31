/**
 * The transition sampler — the one mechanism every `transition:`-driven
 * component in this library runs through, reproduced from the framework's own
 * `animate()` so the React port animates the SAME curve rather than a
 * hand-matched approximation of it.
 *
 * The decisive fact behind the whole design: a css-only transition is already
 * WAAPI. The framework samples `css(t, 1 - t)` at
 * `n = Math.ceil(duration / (1000 / 60))` points, converts each string to a
 * keyframe object and hands the array to `element.animate()`. Running that same
 * algorithm against the same `css()` produces a byte-identical keyframe array
 * and therefore a pixel-identical animation — fidelity is structural here, not
 * aspirational. It also inherits, free: the `duration: 0` fast path reduced
 * motion relies on, reversal from an in-flight position rather than a full
 * restart, and testability through an `Element.prototype.animate` stub.
 *
 * The curve lives entirely in the SAMPLE POSITIONS (`t = t1 + delta *
 * easing(i / n)`), never in a WAAPI `easing` option — which is exactly why
 * every `css(t, u)` in `transitions.ts` and `anchored.ts` interpolates
 * linearly in `t`: by the time `css` is called, `t` has already been eased.
 *
 * Two things the source has and this does not, both deliberate:
 *
 * - `tick`. `TransitionSpec` has no `tick` field (nothing in this library uses
 *   one), so the per-frame JS loop and the `reset()` handle it exists for are
 *   both gone with it.
 * - The `overflow: hidden` inline-style workaround for a Safari < 18 bug. It
 *   triggers only when a sampled keyframe declares `overflow: hidden`, and no
 *   `css()` in this package emits `overflow` at all — porting it would ship a
 *   branch no test can reach.
 *
 * There is deliberately NO "the host cannot animate" `setTimeout` fallback:
 * the source has none, and inventing one would put an untested code path into
 * production. jsdom is handled by the `Element.prototype.animate` stub in
 * `test-setup.ts`, which is a hard requirement of this module's suite.
 *
 * SSR: nothing here touches a browser global at module scope. `runTransition`
 * itself is only ever called from a layout effect.
 */

import type { TransitionSpec } from "./transitions.js";
import { linear } from "./easing.js";

function noop(): void {}

/** `float` and `offset` are special-cased in compliance with the spec, and a
 * custom property (`--x`) is never renamed — a `--`-prefixed key reaches
 * `element.animate()` exactly as written. Everything else is `kebab-case` →
 * `camelCase`. */
function cssPropertyToCamelcase(style: string): string {
	// in compliance with spec
	if (style === "float") return "cssFloat";
	if (style === "offset") return "cssOffset";

	// do not rename custom @properties
	if (style.startsWith("--")) return style;

	const parts = style.split("-");
	if (parts.length === 1) return parts[0] ?? style;
	return (
		(parts[0] ?? "") +
		parts
			.slice(1)
			.map((word) => (word[0] ?? "").toUpperCase() + word.slice(1))
			.join("")
	);
}

/**
 * One `css(t, u)` declaration string → one WAAPI keyframe object.
 *
 * Split on `;`, split each part at the FIRST `:`, and **break** — not
 * `continue` — on a malformed part: a declaration missing its value ends the
 * parse rather than being skipped, which is the source's behaviour and is what
 * keeps a trailing `;` harmless.
 */
export function cssToKeyframe(css: string): Keyframe {
	const keyframe: Keyframe = {};
	const parts = css.split(";");
	for (const part of parts) {
		const [property, value] = part.split(":");
		if (!property || value === undefined) break;

		const formattedProperty = cssPropertyToCamelcase(property.trim());
		keyframe[formattedProperty] = value.trim();
	}
	return keyframe;
}

/** The handle one transition leg hands back. The counterpart of a running leg
 * is read (`t()`) and then torn down (`abort()`) by the leg that replaces it. */
export interface TransitionRun {
	/** Current eased position in `css()`'s own `t` space: `1 - to` before the
	 * delay elapses, the interpolated position while the main animation runs,
	 * and `to` once it has finished. Read by a reversing counterpart so a
	 * reopen mid-close starts from where the close actually got to. */
	t(): number;
	/** Cancel without finishing. Also nulls the animation's `effect` (a
	 * Chromium leak) and replaces `onfinish` with a no-op, because a cancelled
	 * animation can still fire `onfinish` in rare cases. */
	abort(): void;
	/** Silence this run's `onFinish` without stopping it. Called on the
	 * counterpart the instant a new leg starts, so a superseded leg cannot
	 * unmount the node the new leg is animating back in. */
	deactivate(): void;
}

/**
 * Runs one transition leg on `element`, from its current position to `to`
 * (`1` = visible, `0` = hidden), and calls `onFinish` when it lands.
 *
 * Order matters in five places, and every one of them is visible if broken:
 *
 * 1. `counterpart?.deactivate()` runs FIRST, before anything else.
 * 2. A falsy `spec.duration` finishes SYNCHRONOUSLY and never calls
 *    `element.animate()` — the reduced-motion fast path, and the reason a
 *    reduced-motion close completes inside the same layout effect, before
 *    paint.
 * 3. A leading dummy animation is ALWAYS created, even at `delay: 0`. Its
 *    keyframes pin the hidden state (`css(0, 1)`, twice) only for a fresh
 *    intro, and are empty otherwise. Pinning is what stops a DELAYED entrance
 *    painting one frame at rest first; keeping the dummy at `delay: 0` is what
 *    defers the real keyframes until the DOM has updated. The consequence for
 *    every caller: the main animation always starts ASYNCHRONOUSLY, in the
 *    dummy's `onfinish`.
 * 4. Inside that `onfinish`: cancel the dummy, then READ `counterpart.t()`,
 *    then abort the counterpart — the read strictly before the abort, or a
 *    reversal restarts from the far end instead of from the in-flight
 *    position.
 * 5. The sample loop runs `i = 0` to `i <= n` INCLUSIVE (n + 1 keyframes);
 *    `n` must be an integer or the `to` value is missed entirely.
 */
export function runTransition(
	element: Element,
	spec: TransitionSpec,
	to: 0 | 1,
	counterpart: TransitionRun | undefined,
	onFinish: () => void
): TransitionRun {
	const isIntro = to === 1;

	counterpart?.deactivate();

	if (!spec.duration) {
		onFinish();

		return {
			abort: noop,
			deactivate: noop,
			t: () => to,
		};
	}

	const { delay = 0, css, easing = linear } = spec;

	const dummyKeyframes: Keyframe[] = [];

	if (isIntro && counterpart === undefined) {
		const styles = cssToKeyframe(css(0, 1));
		dummyKeyframes.push(styles, styles);
	}

	let getT = () => 1 - to;
	// Reassigned by `deactivate()`, exactly as the source reassigns its own
	// `on_finish` parameter.
	let finish = onFinish;

	// A dummy animation that lasts as long as the delay. In the common case
	// that it is `0` we keep it anyway, so the real CSS keyframes are not
	// created until the DOM has updated. `fill: "forwards"` prevents the
	// element rendering without styles applied.
	let animation = element.animate(dummyKeyframes, { duration: delay, fill: "forwards" });

	animation.onfinish = () => {
		// Remove the dummy from the stack so it cannot conflict with the main
		// animation.
		animation.cancel();

		// For bidirectional transitions we start from the CURRENT position
		// rather than doing a full intro/outro — hence the read before the abort.
		const t1 = counterpart?.t() ?? 1 - to;
		counterpart?.abort();

		const delta = to - t1;
		const duration = spec.duration * Math.abs(delta);
		const keyframes: Keyframe[] = [];

		if (duration > 0) {
			// `n` must be an integer, or we risk missing the `to` value.
			const n = Math.ceil(duration / (1000 / 60));

			for (let i = 0; i <= n; i += 1) {
				const t = t1 + delta * easing(i / n);
				keyframes.push(cssToKeyframe(css(t, 1 - t)));
			}

			getT = () => {
				const time = animation.currentTime as number;
				return t1 + delta * easing(time / duration);
			};
		}

		// No `easing` option and no `delay` option: the curve is already baked
		// into the sample positions above, and the delay was the dummy's job.
		animation = element.animate(keyframes, { duration, fill: "forwards" });

		animation.onfinish = () => {
			getT = () => to;
			finish();
		};
	};

	return {
		abort: () => {
			animation.cancel();
			// Prevents a memory leak in Chromium.
			(animation as unknown as { effect: AnimationEffect | null }).effect = null;
			// Prevents `onfinish` firing after `cancel()`, which happens in
			// some rare cases.
			animation.onfinish = noop;
		},
		deactivate: () => {
			finish = noop;
		},
		t: () => getT(),
	};
}
