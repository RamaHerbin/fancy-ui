import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, HTMLAttributes, RefCallback } from "react";
import { cn } from "../../utils.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { runTransition, type TransitionRun } from "../../internals/motion/animate.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { DURATIONS, STAGGERS, STAGGER_CAPS } from "../../internals/motion/tokens.js";
import type { StaggerFrom } from "../../internals/motion/types.js";
import { rollIn, rollOut, type RollTransitionParams } from "./roll-transitions.js";
import "./text-roll.css";

export interface TextRollProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
	/**
	 * The text to display. A change after mount triggers a per-grapheme
	 * roll to the new value. TextRoll has no `trigger` prop of its own
	 * (unlike Reveal) — it only ever reacts to `value` changing, so the
	 * very first render is always a plain, non-animated real-layer text
	 * node. That is what keeps it safe from Presence's documented "no
	 * intro on first mount" trap without any special-casing here.
	 */
	value: string;
	/**
	 * Which way the cells travel. `"auto"` compares the trimmed old and
	 * new values as numbers and rolls up for an increase, down for a
	 * decrease; a non-numeric change, a tie, or an empty side falls back
	 * to `"up"`.
	 */
	direction?: "auto" | "up" | "down";
	/** Roll duration in ms. Collapsed to `0` under
	 * `prefers-reduced-motion: reduce` (synchronous swap). */
	duration?: number;
	/** Per-cell stagger step in ms, before compression — see
	 * `STAGGER_CAPS.text` (200ms total). Collapsed to `0` under reduced
	 * motion, same as `duration`. */
	stagger?: number;
	/** Stagger origin, forwarded to the shared `staggerDelay` helper. */
	from?: StaggerFrom;
	/** `font-variant-numeric: tabular-nums` on BOTH layers (must be both,
	 * or the two layers stop being the same width) — locks digit advance
	 * width, primarily useful alongside a numeric `direction="auto"`
	 * ticker. Does not fix general alignment risk for non-digit text. */
	tabular?: boolean;
	/**
	 * Off by default: a live region firing on every tick of a fast
	 * counter is worse than silence. `"polite"`/`"assertive"` put the
	 * matching `role` + `aria-live` pair on the real (unsplit) text layer
	 * only — the cell layer stays `aria-hidden` in every state, so
	 * assistive tech never gets fragmented per-grapheme spam.
	 */
	live?: "off" | "polite" | "assertive";
}

// The prop default IS the token, not a second hardcoded `300` that could
// drift from it — `tokens.ts` is the one place these numbers live (see
// its own header comment).
const DEFAULT_DURATION = DURATIONS.base;

/**
 * Grapheme splitting. `Intl.Segmenter` groups combining marks and
 * ZWJ-joined emoji into ONE cluster each (`Array.from`/code-unit
 * splitting does not — it breaks "café"'s composed `é` into `e` + a
 * detached accent, and shreds a ZWJ family emoji into seven broken
 * pieces); when the API is unavailable the string is not split at all —
 * one cell, the whole value crossfades as a unit — never a code-unit
 * fallback that would silently corrupt those cases. The
 * `typeof Intl.Segmenter` probe lives INSIDE the function and nothing is
 * cached at module scope, so a test that deletes `Intl.Segmenter` and
 * mounts a fresh instance sees the fallback take effect immediately.
 */
function segmentGraphemes(text: string): string[] {
	if (typeof Intl.Segmenter !== "function") return [text];
	const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
	const graphemes: string[] = [];
	for (const { segment } of segmenter.segment(text)) graphemes.push(segment);
	return graphemes;
}

/**
 * `direction="auto"` resolution. Guards the classic `Number("") === 0`
 * footgun explicitly: an empty trimmed side never resolves through the
 * numeric branch, so clearing a field never reads as "counted down to
 * nothing".
 */
function resolveDirection(
	prev: string,
	next: string,
	requested: "auto" | "up" | "down"
): "up" | "down" {
	if (requested !== "auto") return requested;
	const p = prev.trim();
	const n = next.trim();
	if (p !== "" && n !== "") {
		const pn = Number(p);
		const nn = Number(n);
		if (Number.isFinite(pn) && Number.isFinite(nn) && pn !== nn) return nn > pn ? "up" : "down";
	}
	return "up";
}

/**
 * One overlay-layer cell as actually rendered. The Svelte source leans on
 * its keyed `{#each}` plus `in:`/`out:` directives to keep a leaving cell in
 * the DOM until its outro finishes; React removes a dropped child in the
 * same commit, so the leaving cells have to be owned explicitly — `phase`
 * is that ownership. `"idle"` is a first-mount cell (never animated,
 * mirroring "no intro on first mount"), `"enter"` runs `rollIn`, `"exit"`
 * runs `rollOut` and is filtered out of the list when it lands.
 */
interface RenderCell {
	key: string;
	grapheme: string;
	/** Frozen at the render that created the cell — a cell being REMOVED
	 * keeps the index it actually held (see `RollTransitionParams.index`). */
	index: number;
	phase: "idle" | "enter" | "exit";
}

interface CurrentCell {
	key: string;
	grapheme: string;
	index: number;
}

/**
 * The React spelling of Svelte's keyed-each reconciliation against the
 * `${generation}:${index}:${grapheme}` keys: an unchanged key keeps its
 * object (and therefore its DOM node), a new key enters, a dropped key is
 * kept in the list but flipped to `"exit"` so its node survives long enough
 * to roll out. A key that comes BACK while its old cell is still exiting is
 * resurrected as `"enter"` — the reversal case the sampler's counterpart
 * mechanism smooths from the in-flight position.
 */
function mergeCells(current: CurrentCell[], prev: RenderCell[]): RenderCell[] {
	const currentKeys = new Set(current.map((c) => c.key));
	const prevByKey = new Map(prev.map((c) => [c.key, c]));

	const next: RenderCell[] = current.map((c) => {
		const existing = prevByKey.get(c.key);
		if (!existing) return { ...c, phase: "enter" as const };
		if (existing.phase === "exit") return { ...existing, phase: "enter" as const };
		return existing;
	});
	for (const p of prev) {
		if (currentKeys.has(p.key)) continue;
		next.push(p.phase === "exit" ? p : { ...p, phase: "exit" as const });
	}
	return next;
}

/** One cell's seat on the roll: the leg it last started (`to`) and, while
 * that leg is still in flight, its run — kept as the counterpart a
 * reversing leg reads its start position from. */
interface CellLeg {
	run: TransitionRun | undefined;
	to: 0 | 1 | null;
}

export const TextRoll = forwardRef<HTMLSpanElement, TextRollProps>(function TextRoll(
	{
		value,
		direction = "auto",
		duration = DEFAULT_DURATION,
		// Same rationale as `DEFAULT_DURATION` above: `STAGGERS.char` IS
		// TextRoll's per-grapheme step (that key's own comment in `tokens.ts`
		// says so) — not a second `15` that could silently drift from it.
		stagger = STAGGERS.char,
		from = "first",
		tabular = false,
		live = "off",
		className,
		style,
		...restProps
	},
	ref
) {
	const reduced = useReducedMotion();

	// Reduced motion collapses BOTH knobs. `effDuration` is what actually
	// disables the roll: the transition sampler (`runTransition`)
	// short-circuits synchronously BEFORE it ever reads `delay` or calls
	// `element.animate` when `duration` is `0`, so a non-zero stagger next to
	// a zero duration could never produce a staggered sequence of its own.
	// Collapsing `effStagger` too is defensive belt-and-braces — correct, and
	// keeps this component honest if that short-circuit ever changes — not
	// the mechanism that makes reduced motion synchronous.
	const effDuration = reduced ? 0 : duration;
	const effStagger = reduced ? 0 : stagger;

	// Cached on `value` alone, the source's `$derived(segmentGraphemes(value))`
	// dependency exactly. It matters more here than there: a roll re-renders
	// this component once per settled cell leg (each WAAPI `onfinish` lands
	// `endTransition` in its own task, so those updates are not batched), and
	// an uncached call would build a fresh `Intl.Segmenter` and re-walk the
	// whole string on every one of them, inside the animation window.
	const graphemes = useMemo(() => segmentGraphemes(value), [value]);

	// `generation` is the mechanism behind "same length ⇒ minimal diff,
	// different length ⇒ safe full re-roll": every cell's key is prefixed
	// with it, so leaving it unchanged lets an untouched `${index}:${grapheme}`
	// position keep its DOM node (keyed reconciliation IS the diff — no
	// custom algorithm needed), while bumping it forces EVERY key to change
	// at once, even ones that would otherwise coincidentally still match.
	// That second case matters because a positional-alignment heuristic
	// across a length change is guessable but wrong in general (a
	// trailing-zero append like "4.5"→"4.50" would break a right-edge
	// heuristic badly) — a full reroll is the honest fallback. Bumped in the
	// same post-commit effect that arms the backstop, mirroring the source's
	// after-DOM-update effect timing.
	const [generation, setGeneration] = useState(0);
	const [resolvedDirection, setResolvedDirection] = useState<"up" | "down">(() =>
		direction === "auto" ? "up" : direction
	);
	const [inFlight, setInFlight] = useState(0);
	const rollState = inFlight > 0 ? "rolling" : "idle";

	// Same caching rationale as `graphemes` above, and the same dependencies
	// the source's `$derived` has: the key list can only move when the
	// graphemes or the generation move, never because a leg settled.
	const cells: CurrentCell[] = useMemo(
		() =>
			graphemes.map((grapheme, index) => ({
				key: `${generation}:${index}:${grapheme}`,
				grapheme,
				index,
			})),
		[graphemes, generation]
	);

	// Derived-during-render state: the rendered list is re-merged
	// synchronously in the render whose keys changed, BEFORE React commits —
	// the only moment a dropped cell can still be caught and kept as
	// `"exit"` instead of being unmounted with its outro unplayed.
	const [rendered, setRendered] = useState<RenderCell[]>(() =>
		cells.map((c) => ({ ...c, phase: "idle" as const }))
	);
	const keysSignature = useMemo(() => cells.map((c) => c.key).join("\u0000"), [cells]);
	const [prevKeysSignature, setPrevKeysSignature] = useState(keysSignature);
	if (keysSignature !== prevKeysSignature) {
		setPrevKeysSignature(keysSignature);
		setRendered((prev) => mergeCells(cells, prev));
	}

	// Live mirrors for the values a leg's params read at the instant it
	// starts — never captured per render by the orchestrator, so a
	// `duration`-only change can neither restart legs nor retime ones
	// already in flight (the source's `untrack` on `effDuration`).
	const effDurationRef = useLiveRef(effDuration);
	const effStaggerRef = useLiveRef(effStagger);
	const fromRef = useLiveRef(from);
	const countRef = useLiveRef(graphemes.length);

	const nodesRef = useRef(new Map<string, HTMLSpanElement>());
	const legsRef = useRef(new Map<string, CellLeg>());
	const refCallbacksRef = useRef(new Map<string, RefCallback<HTMLSpanElement>>());
	// Written by the direction effect below (which runs before the
	// orchestrator — declaration order is execution order), so the legs a
	// value change starts read the direction resolved from THAT change.
	const dirRef = useRef(resolvedDirection);

	/** Cached for the life of the cell, so React never detaches and
	 * reattaches a node just because the component re-rendered. */
	function getCellRef(key: string): RefCallback<HTMLSpanElement> {
		let callback = refCallbacksRef.current.get(key);
		if (!callback) {
			// Block body, never a concise arrow: React 19 reads a returned
			// value as a cleanup function (convention C-3).
			callback = (node) => {
				if (node) {
					nodesRef.current.set(key, node);
					return;
				}
				// The node is leaving the DOM in this very commit; the
				// animation goes with it, so drop it rather than leaving a
				// Chromium effect leak behind.
				nodesRef.current.delete(key);
				const leg = legsRef.current.get(key);
				leg?.run?.abort();
				legsRef.current.delete(key);
				// Evict by identity: a newer callback for a key that came back
				// mid-exit must not be dropped by the old one's detach.
				if (refCallbacksRef.current.get(key) === callback) {
					refCallbacksRef.current.delete(key);
				}
			};
			refCallbacksRef.current.set(key, callback);
		}
		return callback;
	}

	function beginTransition() {
		setInFlight((n) => n + 1);
	}
	function endTransition() {
		setInFlight((n) => Math.max(0, n - 1));
	}

	function startLeg(cell: RenderCell, to: 0 | 1): void {
		const node = nodesRef.current.get(cell.key);
		if (!node) return;

		const leg = legsRef.current.get(cell.key) ?? { run: undefined, to: null };
		const params: RollTransitionParams = {
			direction: dirRef.current,
			duration: effDurationRef.current,
			index: cell.index,
			count: countRef.current,
			step: effStaggerRef.current,
			from: fromRef.current,
		};
		const spec = to === 1 ? rollIn(node, params) : rollOut(node, params);

		// Read BEFORE the bookkeeping below overwrites it: the in-flight leg
		// is this one's counterpart, and `runTransition` reads its position
		// before aborting it — a resurrection mid-exit resumes from where the
		// exit actually got to. A superseded leg's own finish callback is
		// deactivated by `runTransition`, so its `endTransition` never fires
		// — exactly the "interrupted transition may never fire its end event"
		// case the hard timeout backstop below exists to recover from.
		const counterpart = leg.run;
		leg.to = to;
		leg.run = undefined;
		legsRef.current.set(cell.key, leg);

		beginTransition();
		let finished = false;
		const handle: { current: TransitionRun | undefined } = { current: undefined };
		const run = runTransition(node, spec, to, counterpart, () => {
			finished = true;
			endTransition();
			if (to === 1) {
				// On ENTER finish, abort: that removes `fill: forwards` so the
				// cell falls back to its resting style (the visible end state
				// by construction). On EXIT finish, deliberately do NOT — the
				// node stays in the DOM until React processes the filtered
				// list, and dropping fill-forwards would flash it back for a
				// frame.
				handle.current?.abort();
				leg.run = undefined;
				return;
			}
			legsRef.current.delete(cell.key);
			setRendered((prev) => prev.filter((p) => p.key !== cell.key));
		});
		handle.current = run;
		// A duration-0 leg already finished synchronously inside the call
		// above; keeping its handle would hand a settled leg to the next one
		// as a counterpart.
		if (!finished) leg.run = run;
	}

	// Two SEPARATE effects for direction and for the generation/backstop
	// bookkeeping, not one — deliberately, transposed from the source:
	// `resolvedDirection` must react to `direction` alone (an explicit prop
	// flip must update `data-direction` even with no new `value`), while the
	// backstop effect must NEVER re-run on a `direction`-only change — its
	// cleanup tears the armed timer down before the new body runs, so an
	// early-return guard inside the body could not protect it. Keeping
	// `direction` (and `duration`) out of that effect's dependency array is
	// what actually keeps the timer intact.

	// Effect 1: `resolvedDirection`. No cleanup of its own, so re-running it
	// on every `value` OR `direction` change is inert. Layout phase, and
	// declared BEFORE the orchestrator, so the legs started for this very
	// value change already read the freshly resolved direction.
	const priorValueForDirectionRef = useRef(value);
	const priorRequestedDirectionRef = useRef(direction);
	useIsomorphicLayoutEffect(() => {
		const nextValue = value;
		const requested = direction;
		// Keyed on the value/direction EDGE, not on "first run": the seed run and
		// a StrictMode replay both see the values the refs were seeded with and
		// do nothing, so a double-invoked mount cannot resolve against a stale
		// (or missing) prior value.
		if (
			priorValueForDirectionRef.current === nextValue &&
			priorRequestedDirectionRef.current === requested
		) {
			return;
		}
		const resolved = resolveDirection(
			priorValueForDirectionRef.current ?? "",
			nextValue ?? "",
			requested
		);
		priorValueForDirectionRef.current = nextValue;
		priorRequestedDirectionRef.current = requested;
		dirRef.current = resolved;
		setResolvedDirection(resolved);
	}, [value, direction]);

	// The leg orchestrator: starts exactly the legs whose desired direction
	// differs from the one their cell last started — everything else is a
	// no-op, so re-running on every `rendered` change is safe. Layout phase
	// (contract §4): a transition leg's absence is visible in the first
	// painted frame. NO cleanup here — a cleanup would abort every in-flight
	// leg on each re-render, which is the one thing the per-key `CellLeg`
	// bookkeeping exists to avoid; teardown lives in the unmount-only effect
	// below and in each cell's ref cleanup.
	useIsomorphicLayoutEffect(() => {
		for (const cell of rendered) {
			const desired: 0 | 1 | null =
				cell.phase === "exit" ? 0 : cell.phase === "enter" ? 1 : null;
			if (desired === null) continue;
			const leg = legsRef.current.get(cell.key);
			if (leg && leg.to === desired) continue;
			startLeg(cell, desired);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rendered]);

	// Effect 2: generation bump + the hard timeout backstop. Depends ONLY on
	// `value` — never `direction`, and never `effDuration` (read through its
	// live ref, the source's `untrack`): re-arming or re-sizing the window
	// mid-roll would let a `duration`-only change end `inFlight` at the
	// 600ms floor and expose the real layer under still-animating cells. The
	// window is sized once, from the duration the roll actually started
	// with. `firstRun` skips the bookkeeping on mount — there is no prior
	// value to diff against yet, and skipping it also means the backstop
	// timer is never armed for content that never rolled.
	const priorLengthRef = useRef(graphemes.length);
	const backstopFirstRunRef = useRef(true);
	useEffect(() => {
		const nextLength = graphemes.length;

		if (backstopFirstRunRef.current) {
			backstopFirstRunRef.current = false;
			priorLengthRef.current = nextLength;
			return;
		}

		if (nextLength !== priorLengthRef.current) setGeneration((g) => g + 1);
		priorLengthRef.current = nextLength;

		// Unconditional backstop: whatever happens to the per-cell leg
		// bookkeeping above — an interrupted transition, dropped by ANOTHER
		// value arriving mid-roll, may never fire its end callback — this
		// roll is guaranteed to read "idle" again. `DURATIONS.entrance`
		// (600ms) is the floor this contract names; a longer `duration` plus
		// the worst-case stagger spread (`STAGGER_CAPS.text`) can
		// legitimately run past that floor, so the budget grows past 600ms
		// rather than silently truncating a caller's own `duration`.
		// `DURATIONS.fast` is slack for the delay-then-animate double
		// `element.animate()` call the sampler makes. The returned cleanup
		// clears this timer both on the NEXT value change (re-arming a fresh
		// window rather than trusting whatever was left on the old one) and
		// on unmount.
		const backstopMs = Math.max(
			DURATIONS.entrance,
			effDurationRef.current + STAGGER_CAPS.text + DURATIONS.fast
		);
		const timeoutId = setTimeout(() => {
			setInFlight(0);
		}, backstopMs);

		return () => clearTimeout(timeoutId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value]);

	// Unmount-only teardown: abort whatever is still in flight. Each cell's
	// ref cleanup already does this per node as React detaches it; this is
	// the belt for the pair of braces.
	useIsomorphicLayoutEffect(() => {
		const legs = legsRef.current;
		return () => {
			for (const leg of legs.values()) leg.run?.abort();
			legs.clear();
		};
	}, []);

	const liveRole = live === "off" ? undefined : live === "polite" ? "status" : "alert";
	const liveAriaLive = live === "off" ? undefined : live;

	// Conditional inline var write — see `DEFAULT_DURATION` above: an inline
	// style always wins over a stylesheet, so writing it unconditionally
	// would make the CSS fallback chain in text-roll.css unreachable. Vars
	// land AFTER the caller's `style` so they win, matching the source's
	// style: directive beating the style attribute.
	const vars: Record<string, string> = {};
	if (duration !== DEFAULT_DURATION) vars["--ft-textroll-duration"] = `${duration}ms`;

	const layerStyle: CSSProperties | undefined = tabular
		? { fontVariantNumeric: "tabular-nums" }
		: undefined;

	return (
		<span
			{...restProps}
			ref={ref}
			className={cn("ft-textroll", className)}
			style={{ ...style, ...vars } as CSSProperties}
			data-state={rollState}
			data-direction={resolvedDirection}
		>
			<span className="ft-textroll-real" style={layerStyle} role={liveRole} aria-live={liveAriaLive}>
				{value}
			</span>
			<span className="ft-textroll-cells" aria-hidden="true" style={layerStyle}>
				{rendered.map((cell) => (
					<span
						key={cell.key}
						ref={getCellRef(cell.key)}
						className="ft-textroll-cell"
						style={{ gridColumnStart: cell.index + 1 }}
					>
						{cell.grapheme}
					</span>
				))}
			</span>
		</span>
	);
});
