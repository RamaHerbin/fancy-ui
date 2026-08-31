import { forwardRef, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
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
	const register = stepper?.register;
	useEffect(() => {
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

	// The segment connecting this step back to the previous one is "done"
	// exactly when that previous step is done — i.e. this step's own index
	// is at or before the active one.
	const connectorDone = stepper ? index <= stepper.current : false;

	function handleClick() {
		if (!stepper || !clickable || index === -1) return;
		stepper.select(index);
	}

	const bulletClasses = cn(
		"ft-step-bullet relative inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
		status === "done" && "ft-step-bullet-done",
		status === "current" && "ft-step-bullet-current",
		status === "upcoming" && "border-border text-muted-foreground border-[1.5px] bg-transparent"
	);

	// `children ?? …` rather than a truthiness test: the Svelte side branches
	// on whether the snippet exists, and `null`/`undefined` are the only
	// React values that mean "nothing was passed".
	const defaultBullet =
		status === "done" ? (
			<svg
				className="size-3.5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M20 6 9 17l-5-5" />
			</svg>
		) : (
			<span aria-hidden="true">{index + 1}</span>
		);

	const bulletContent = (
		<span className={bulletClasses} data-status={status}>
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
						"text-xs",
						status === "current" ? "text-foreground font-medium" : "text-muted-foreground"
					)}
				>
					{label}
				</span>
			) : null}
			{description ? <span className="text-muted-foreground text-xs">{description}</span> : null}
		</span>
	);

	return (
		<li
			ref={ref}
			className={cn(
				"ft-step flex",
				orientation === "vertical"
					? cn("flex-row items-stretch gap-3", isLast ? "pb-0" : "pb-6")
					: cn("flex-col items-center", isFirst ? "flex-none" : "flex-1"),
				className
			)}
			data-status={status}
			data-orientation={orientation}
			aria-current={status === "current" ? "step" : undefined}
		>
			{orientation === "horizontal" ? (
				<div className="flex w-full items-center">
					{!isFirst && (
						<span
							className={cn(
								"ft-step-connector mt-[13px] h-0.5 flex-1",
								connectorDone ? "ft-step-connector-done" : "bg-border"
							)}
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
					<div className="flex flex-col items-center self-stretch">
						{bulletContent}
						{!isLast && (
							<span
								className={cn(
									"ft-step-connector my-1 w-0.5 flex-1",
									connectorDone ? "ft-step-connector-done" : "bg-border"
								)}
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
