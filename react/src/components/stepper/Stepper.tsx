import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { STEPPER_KEY } from "./types.js";
import type { StepperContext } from "./types.js";

export interface StepperProps {
	/**
	 * The active step's 0-based index. Controlled when supplied: pair it
	 * with `onCurrentChange`, the React counterpart of the Svelte source's
	 * `bind:current`. Left out, the stepper keeps the index itself and
	 * starts at 0.
	 */
	current?: number;
	/** Called with the new index whenever it changes, however the change happened. */
	onCurrentChange?: (current: number) => void;
	/** The rail's stacking axis. Defaults to `"horizontal"`. */
	orientation?: "horizontal" | "vertical";
	/** Whether steps render as buttons a reader can click to jump between them. Defaults to `false`. */
	clickable?: boolean;
	/** Called with a step's index when it's activated by a click. Only fires when `clickable`. */
	onStepClick?: (index: number) => void;
	/** The `Step`s. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the select cue through the sound controller. Off by default;
	 * only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/**
 * The rail a set of `Step`s reads its shared state from.
 *
 * The root element arrives through the ref channel rather than a `ref`
 * prop, per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 *
 * Rest props are not spread: the Svelte source reads only these props off
 * `$props()` and has no `...restProps`, so the port carries no wider
 * attribute surface than the component it mirrors.
 */
export const Stepper = forwardRef<HTMLOListElement, StepperProps>(function Stepper(
	{
		current,
		onCurrentChange,
		orientation = "horizontal",
		clickable = false,
		onStepClick,
		children,
		className,
		sound = false,
	},
	ref
) {
	// `current = $bindable(0)` on the Svelte side. A supplied prop wins and
	// the consumer owns the value; with nothing supplied the component owns
	// it, starting at the same 0 the Svelte default uses.
	const [uncontrolledCurrent, setUncontrolledCurrent] = useState(0);
	const isControlled = current !== undefined;
	const activeIndex = isControlled ? current : uncontrolledCurrent;

	// Ids, not elements: a `Step` can register the instant its own effect
	// runs, with no need to wait on a ref to have landed first.
	//
	// The live registry is a ref, and the state array is the render-visible
	// copy of it. Both are needed: a `Step` registers from its own mount
	// effect, and React runs sibling effects back to back before it
	// re-renders anything, so the second sibling has to see the first
	// sibling's write immediately — a `setState` updater alone would work,
	// but `register` also has to *read* the current list synchronously to
	// refuse a duplicate and to hand back an unregister that splices the
	// right entry.
	//
	// `register` is wrapped in a `useCallback` with an empty dependency
	// list, and that is load-bearing rather than tidy: a `Step`'s
	// registration effect depends on it, so a `register` rebuilt whenever
	// the registry changes would make every step's effect re-run the
	// instant its own call mutated the registry — unregister, register,
	// re-render, unregister, forever. This is the React shape of the exact
	// bug the Svelte source's `untrack` calls guard against.
	const registryRef = useRef<string[]>([]);
	const [registered, setRegistered] = useState<string[]>([]);

	const register = useCallback((id: string): (() => void) => {
		if (!registryRef.current.includes(id)) {
			registryRef.current = [...registryRef.current, id];
			setRegistered(registryRef.current);
		}
		return () => {
			const index = registryRef.current.indexOf(id);
			if (index !== -1) {
				const next = [...registryRef.current];
				next.splice(index, 1);
				registryRef.current = next;
				setRegistered(next);
			}
		};
	}, []);

	// Reads the rendered copy, not the ref: a `Step` calls this during its
	// own render, and the answer has to be the one this render pass was
	// scheduled for.
	const indexOf = useCallback((id: string): number => registered.indexOf(id), [registered]);

	// Motion is opt-in on the client only: the server render (and the
	// hydration pass) paints the still composition, and the animated classes
	// arrive once the browser has actually been asked about
	// `prefers-reduced-motion` — `asked` flips in a mount effect, the
	// counterpart of the Svelte source's `reduced.start()` + `asked = true`.
	// Under reduce they never arrive, so the rails fill by colour alone.
	const reduced = useReducedMotion();
	const [asked, setAsked] = useState(false);
	useEffect(() => {
		setAsked(true);
	}, []);
	const animate = asked && !reduced;

	// Where the light set off from: the active index *before* the latest
	// change. Steps read it to order the rail sweeps (and the arrival of the
	// bullets behind them) as one continuous run from the old step to the new
	// one, instead of every rail lighting in the same frame. It starts at 0 —
	// not at `current` — so the first paint plays the same run from the first
	// step, a one-time arrival over rails that are already filled.
	//
	// The Svelte source writes it from an `$effect.pre`, i.e. before the DOM
	// update that shows the new index. The React counterpart is the "adjust
	// state while rendering" pattern: when the index differs from the one last
	// settled, the pair is updated during this render, React re-renders before
	// committing, and no frame ever shows the new index with a stale origin.
	const [run, setRun] = useState(() => ({ settled: activeIndex, origin: 0 }));
	let origin = run.origin;
	if (run.settled !== activeIndex) {
		origin = run.settled;
		setRun({ settled: activeIndex, origin: run.settled });
	}

	const playCue = useSoundCue(sound);

	const select = useCallback(
		(index: number) => {
			if (!clickable) return;
			// Changed-only, and ahead of every callback: re-picking the step that
			// is already current still reports through `onStepClick` and
			// `onCurrentChange`, but makes no sound — the rail did not move.
			if (activeIndex !== index) playCue("select");
			onStepClick?.(index);
			if (!isControlled) setUncontrolledCurrent(index);
			onCurrentChange?.(index);
		},
		[clickable, isControlled, onStepClick, onCurrentChange, activeIndex, playCue]
	);

	// Rebuilt when any of its inputs actually changes — that rebuild is what
	// re-renders the steps reading it, and it is the React counterpart of the
	// Svelte context's live getters.
	const context = useMemo<StepperContext>(
		() => ({
			orientation,
			clickable,
			current: activeIndex,
			count: registered.length,
			origin,
			animate,
			register,
			indexOf,
			select,
		}),
		[orientation, clickable, activeIndex, registered, origin, animate, register, indexOf, select]
	);

	return (
		<STEPPER_KEY.Provider value={context}>
			{/*
				`role="list"` is stated rather than left implicit: `list-style: none`
				strips list semantics in Safari, and a step's position in the count is
				the only thing telling a reader it is "2 of 5" — the visible number is
				`aria-hidden`.
			*/}
			<ol
				ref={ref}
				role="list"
				className={cn(
					"ft-stepper flex list-none",
					orientation === "vertical" ? "flex-col" : "w-full items-start",
					className
				)}
				data-orientation={orientation}
				data-motion={animate ? "full" : "reduced"}
			>
				{children}
			</ol>
		</STEPPER_KEY.Provider>
	);
});

Stepper.displayName = "Stepper";

/*
  No colocated stylesheet here: the root `<ol>` itself never paints the brand
  purple — only a `Step`'s current bullet, halo, and lit rail do — so
  `--ft-nav-accent` is declared in `step.css` instead, the same split a toggle
  group (no purple of its own) and its items (declaring their focus-ring accent
  locally) already use.
*/
