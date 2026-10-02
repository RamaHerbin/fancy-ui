import { forwardRef, useRef, useState } from "react";
import type {
	ButtonHTMLAttributes,
	CSSProperties,
	MouseEvent,
	PointerEvent,
	ReactNode,
} from "react";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { cn } from "../../utils.js";
import "./ripple-button.css";

export interface RippleButtonProps extends Omit<
	ButtonHTMLAttributes<HTMLButtonElement>,
	"className"
> {
	/** Additional CSS classes */
	className?: string;
	/** Color of the ripple: its glow, its rings and the border tint */
	rippleColor?: string;
	/** Animation duration in milliseconds */
	duration?: number;
	/** Button content */
	children?: ReactNode;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

interface Ripple {
	x: number;
	y: number;
	size: number;
	key: number;
}

/**
 * Where a ripple starts and how big it grows: from the pointer, or from the
 * centre for a keyboard press (no pointer position), with a diameter that
 * reaches the farthest corner.
 */
export function rippleGeometry(
	rect: { left: number; top: number; width: number; height: number },
	event: { clientX: number; clientY: number; detail: number }
): { x: number; y: number; size: number } {
	const keyboard = event.detail === 0;
	const cx = keyboard ? rect.width / 2 : event.clientX - rect.left;
	const cy = keyboard ? rect.height / 2 : event.clientY - rect.top;
	const dx = Math.max(cx, rect.width - cx);
	const dy = Math.max(cy, rect.height - cy);
	const size = 2 * Math.hypot(dx, dy);
	return { x: cx - size / 2, y: cy - size / 2, size };
}

export const RippleButton = forwardRef<HTMLButtonElement, RippleButtonProps>(
	(
		{
			className,
			rippleColor = "#60a5fa",
			duration = 900,
			children,
			onClick,
			onPointerMove,
			sound = false,
			...restProps
		},
		forwardedRef
	) => {
		const buttonRef = useRef<HTMLButtonElement | null>(null);
		// One composed callback whose identity changes only when the incoming
		// ref does — a click pushes and later drops a ripple, and a consumer's
		// callback ref must not be detached and re-attached on those renders.
		const composedRef = useComposedRefs(forwardedRef, buttonRef);
		const [ripples, setRipples] = useState<Ripple[]>([]);
		// A monotonic counter, not a wall-clock stamp: two clicks landing in the
		// same millisecond would otherwise mint the same key, and the removal
		// filter below would then drop both ripples on the first timeout.
		const nextRippleKey = useRef(0);

		const playCue = useSoundCue(sound);

		function handleClick(event: MouseEvent<HTMLButtonElement>) {
			// The native `disabled` attribute already blocks real interaction,
			// but a synthetic event dispatched straight at the element — as a
			// test does — walks past that guard, so the cue repeats it.
			if (!restProps.disabled) playCue("press");
			createRipple(event);
			// Call the original onClick handler if provided
			onClick?.(event);
		}

		// The hover glow follows the pointer: two CSS variables, no re-render.
		function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
			const el = event.currentTarget;
			const rect = el.getBoundingClientRect();
			el.style.setProperty("--ripple-x", `${event.clientX - rect.left}px`);
			el.style.setProperty("--ripple-y", `${event.clientY - rect.top}px`);
			onPointerMove?.(event);
		}

		function createRipple(event: MouseEvent<HTMLButtonElement>) {
			const button = buttonRef.current;
			if (!button) return;

			const { x, y, size } = rippleGeometry(button.getBoundingClientRect(), event);
			const newRipple: Ripple = { x, y, size, key: nextRippleKey.current++ };
			setRipples((prev) => [...prev, newRipple]);

			// Remove ripple after animation completes
			setTimeout(() => {
				setRipples((prev) => prev.filter((r) => r.key !== newRipple.key));
			}, duration);
		}

		return (
			<button
				ref={composedRef}
				className={cn(
					"ripple-button relative isolate flex cursor-pointer items-center justify-center overflow-hidden",
					"bg-background text-foreground border-border rounded-lg border px-5 py-2.5 text-center font-medium",
					"shadow-[inset_0_1px_0_rgb(255_255_255/0.06),0_1px_2px_rgb(0_0_0/0.08)]",
					"transition-[transform,border-color,background-color] duration-300 ease-out",
					"hover:bg-muted/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
					className
				)}
				style={
					{
						"--ripple-duration": `${duration}ms`,
						"--ripple-color": rippleColor,
					} as CSSProperties
				}
				data-rippling={ripples.length > 0 ? "" : undefined}
				onClick={handleClick}
				onPointerMove={handlePointerMove}
				{...restProps}
			>
				<div className="relative z-10">{children}</div>

				{/* Hover: a soft glow under the pointer, and a faint ring that keeps pulsing from it */}
				<span className="ripple-hover" aria-hidden="true" />

				<span className="pointer-events-none absolute inset-0" aria-hidden="true">
					{ripples.map((ripple) => (
						<span
							key={ripple.key}
							className="ripple-animation absolute rounded-full"
							style={{
								width: `${ripple.size}px`,
								height: `${ripple.size}px`,
								top: `${ripple.y}px`,
								left: `${ripple.x}px`,
							}}
						/>
					))}
				</span>
			</button>
		);
	}
);

RippleButton.displayName = "RippleButton";
