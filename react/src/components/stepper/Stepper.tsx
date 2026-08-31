import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
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

	const select = useCallback(
		(index: number) => {
			if (!clickable) return;
			onStepClick?.(index);
			if (!isControlled) setUncontrolledCurrent(index);
			onCurrentChange?.(index);
		},
		[clickable, isControlled, onStepClick, onCurrentChange]
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
			register,
			indexOf,
			select,
		}),
		[orientation, clickable, activeIndex, registered, register, indexOf, select]
	);

	return (
		<STEPPER_KEY.Provider value={context}>
			<ol
				ref={ref}
				className={cn(
					"ft-stepper flex list-none",
					orientation === "vertical" ? "flex-col" : "w-full items-start",
					className
				)}
				data-orientation={orientation}
			>
				{children}
			</ol>
		</STEPPER_KEY.Provider>
	);
});

Stepper.displayName = "Stepper";

/*
  No colocated stylesheet here: the root `<ol>` itself never paints the brand
  purple — only a `Step`'s current bullet, halo, and done connector do — so
  `--ft-nav-accent` is declared in `step.css` instead, the same split a toggle
  group (no purple of its own) and its items (declaring their focus-ring accent
  locally) already use.
*/
