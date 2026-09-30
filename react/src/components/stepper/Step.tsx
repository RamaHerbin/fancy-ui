import { forwardRef, useContext } from "react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { STEPPER_KEY } from "./types.js";
import "./step.css";

export interface StepProps {
	/**
	 * The step's primary label. Required: with `children` also omitted, a
	 * clickable step's only accessible text is its `sr-only` status span —
	 * every upcoming step in the same `Stepper` would then read as the
	 * identical "not started, button" with nothing to tell them apart.
	 */
	label: string;
	/** Optional secondary line shown under the label. */
	description?: string;
	/** Overrides the bullet's default content (checkmark / number / outline). */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

type StepStatus = "done" | "current" | "upcoming";

const STATUS_TEXT: Record<StepStatus, string> = {
	done: "completed",
	current: "current step",
	upcoming: "not started",
};

/**
 * One stop on a `Stepper`'s rail. Its number and status come from its
 * position among its registered siblings, never from a prop.
 *
 * The root element arrives through the ref channel rather than a `ref`
 * prop, per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 */
export const Step = forwardRef<HTMLLIElement, StepProps>(function Step(
	{ label, description, children, className },
	ref
) {
	// Undefined outside a Stepper: the step then has no shared index or
	// status to derive, and renders as a plain, always-"upcoming",
	// never-clickable item rather than throwing.
	const stepper = useContext(STEPPER_KEY);

	// `useFancyId()` rather than `_internals/id.ts`'s `uid()`: this needs to
	// be stable and available immediately, including during SSR, and
	// `uid()` is client-only by design (see its own doc comment).
	const id = useFancyId();

	// Registers on mount, unregisters on unmount. The effect depends on the
	// `register` function alone, never on the whole context object: the
	// context is rebuilt every time the registry changes, so depending on it
	// would re-run this effect as a result of this effect's own call — see
	// `Stepper.tsx` for the fuller account of the loop that guards against.
	//
	// A layout effect, not a passive one: every number, status colour,
	// connector and `aria-current` on the rail is derived from the index this
	// call settles, so a passive registration would let the browser paint one
	// frame in which every step still reads -1 — bullets numbered "0", a
	// leading connector on the first step, and no current step at all.
	const register = stepper?.register;
	useIsomorphicLayoutEffect(() => {
		if (!register) return;
		return register(id);
	}, [register, id]);

	const index = stepper ? stepper.indexOf(id) : -1;

	const status: StepStatus = (() => {
		if (!stepper || index === -1) return "upcoming";
		if (index < stepper.current) return "done";
		if (index === stepper.current) return "current";
		return "upcoming";
	})();

	const orientation = stepper?.orientation ?? "horizontal";
	const clickable = stepper?.clickable ?? false;
	const isFirst = index === 0;
	const isLast = stepper ? index === stepper.count - 1 : true;

	// A rail is the segment between two neighbouring steps, identified by the
	// index of the step it leaves. Horizontally a step draws the rail that
	// arrives at it (so the first step has none); vertically it draws the one
	// that leaves it (so the last step has none). Either way the rail is lit
	// exactly when the step it leaves is done.
	const railFrom = orientation === "vertical" ? index : index - 1;
	const connectorDone = stepper && index !== -1 ? railFrom < stepper.current : false;

	const animate = stepper?.animate ?? false;

	// Order within one run of light, in beats. Moving forward from `origin`
	// (the previous active step), rail k lights `k - origin` beats after the
	// first one; moving back, rails retract from the far end first. Clamped at
	// 0: anything outside the run moves (if at all) immediately.
	const origin = stepper?.origin ?? 0;
	const forward = stepper ? stepper.current >= origin : true;
	const railOrder = Math.max(0, forward ? railFrom - origin : origin - 1 - railFrom);

	// A step the light is travelling *to* (past the origin, up to and
	// including the new current one) settles when the light reaches it:
	// its incoming rail's beat, plus the part of a sweep it takes the head to
	// arrive. `undefined` leaves the CSS fallback (no delay) in charge.
	const arrival =
		stepper && forward && index > origin && index <= stepper.current
			? index - origin - 1 + 0.6
			: undefined;

	// Custom properties are written as inline styles, the counterpart of the
	// Svelte source's `style:--ft-step-*` directives. An `undefined` arrival
	// leaves the attribute off entirely, as the directive does.
	const railStyle = { "--ft-step-order": railOrder } as CSSProperties;
	const bulletStyle =
		arrival === undefined ? undefined : ({ "--ft-step-arrival": arrival } as CSSProperties);

	function handleClick() {
		if (!stepper || !clickable || index === -1) return;
		stepper.select(index);
	}

	const bulletClasses = cn(
		"ft-step-bullet relative inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums",
		status === "done" && "ft-step-bullet-done",
		status === "current" && "ft-step-bullet-current ft-step-bullet-halo",
		status === "upcoming" && "ft-step-bullet-upcoming text-muted-foreground"
	);

	// `children ?? …` rather than a truthiness test: the Svelte side branches
	// on whether the snippet exists, and `null`/`undefined` are the only
	// React values that mean "nothing was passed".
	const defaultBullet =
		status === "done" ? (
			<svg
				className="ft-step-glyph ft-step-check size-3.5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2.75"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M20 6 9 17l-5-5" pathLength={1} />
			</svg>
		) : (
			<span className="ft-step-glyph" aria-hidden="true">
				{index + 1}
			</span>
		);

	const bulletContent = (
		<span className={bulletClasses} data-status={status} style={bulletStyle}>
			{children ?? defaultBullet}
			<span className="sr-only"> {STATUS_TEXT[status]}</span>
		</span>
	);

	const textContent = (
		<span
			className={cn("flex flex-col", orientation === "horizontal" && "items-center text-center")}
		>
			{label ? (
				<span
					className={cn(
						"ft-step-label text-xs transition-colors",
						status === "current" && "text-foreground font-medium",
						status === "done" && "text-foreground/80",
						status === "upcoming" && "text-muted-foreground"
					)}
				>
					{label}
				</span>
			) : null}
			{description ? (
				<span className="ft-step-description text-muted-foreground/80 text-[11px] leading-snug">
					{description}
				</span>
			) : null}
		</span>
	);

	return (
		<li
			ref={ref}
			className={cn(
				"ft-step flex",
				orientation === "vertical"
					? cn("flex-row items-stretch gap-3", isLast ? "pb-0" : "pb-7")
					: cn("flex-col items-center", isFirst ? "flex-none" : "flex-1"),
				animate && "ft-step-animate",
				className
			)}
			data-status={status}
			data-orientation={orientation}
			aria-current={status === "current" ? "step" : undefined}
		>
			{orientation === "horizontal" ? (
				<div className="flex w-full items-start">
					{!isFirst && (
						<span
							className={cn(
								"ft-step-connector bg-border relative mx-1.5 mt-[13px] h-0.5 flex-1 rounded-full",
								connectorDone && "ft-step-connector-done ft-step-connector-lit"
							)}
							style={railStyle}
							aria-hidden="true"
						/>
					)}
					{clickable ? (
						<button
							type="button"
							className="ft-step-trigger flex shrink-0 cursor-pointer flex-col items-center gap-1.5 px-1 focus-visible:outline-none"
							onClick={handleClick}
						>
							{bulletContent}
							{textContent}
						</button>
					) : (
						<div className="ft-step-trigger flex shrink-0 flex-col items-center gap-1.5 px-1">
							{bulletContent}
							{textContent}
						</div>
					)}
				</div>
			) : (
				<>
					{/*
						`-mb-7` mirrors the li's own `pb-7`: without it the bullet column
						stretches only to the li's content box, which is barely taller than
						the bullet, so the rail's `flex-1` resolved to ~0px and the vertical
						rail never showed. Reaching into the padding gives it the gap to span.
					*/}
					<div className={cn("flex flex-col items-center self-stretch", !isLast && "-mb-7")}>
						{bulletContent}
						{!isLast && (
							<span
								className={cn(
									"ft-step-connector bg-border relative my-1 w-0.5 flex-1 rounded-full",
									connectorDone && "ft-step-connector-done ft-step-connector-lit"
								)}
								style={railStyle}
								aria-hidden="true"
							/>
						)}
					</div>
					{clickable ? (
						<button
							type="button"
							className="ft-step-trigger flex cursor-pointer flex-col gap-0.5 pt-0.5 text-left focus-visible:outline-none"
							onClick={handleClick}
						>
							{textContent}
						</button>
					) : (
						<div className="ft-step-trigger flex flex-col gap-0.5 pt-0.5 text-left">
							{textContent}
						</div>
					)}
				</>
			)}
		</li>
	);
});

Step.displayName = "Step";
