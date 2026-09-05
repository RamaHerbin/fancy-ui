import { forwardRef, useRef, useState } from "react";
import type { ButtonHTMLAttributes, CSSProperties, MouseEvent, ReactNode } from "react";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { cn } from "../../utils.js";
import "./ripple-button.css";

export interface RippleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
	/** Additional CSS classes */
	className?: string;
	/** Color of the ripple effect */
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

interface RippleState {
	x: number;
	y: number;
	size: number;
	key: number;
}

export const RippleButton = forwardRef<HTMLButtonElement, RippleButtonProps>(
	(
		{
			className,
			rippleColor = "#ADD8E6",
			duration = 600,
			children,
			onClick,
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
		const [ripples, setRipples] = useState<RippleState[]>([]);
		// A monotonic counter, not a wall-clock stamp: two clicks landing in the
		// same millisecond would otherwise mint the same key, and the removal
		// filter below would then drop both ripples on the first timeout.
		const nextKey = useRef(0);

		const playCue = useSoundCue(sound);

		function createRipple(event: MouseEvent<HTMLButtonElement>) {
			const button = buttonRef.current;
			if (!button) return;

			const rect = button.getBoundingClientRect();
			const size = Math.max(rect.width, rect.height);
			const x = event.clientX - rect.left - size / 2;
			const y = event.clientY - rect.top - size / 2;

			const newRipple: RippleState = { x, y, size, key: nextKey.current++ };
			setRipples((prev) => [...prev, newRipple]);

			// Remove ripple after animation completes
			setTimeout(() => {
				setRipples((prev) => prev.filter((r) => r.key !== newRipple.key));
			}, duration);
		}

		function handleClick(event: MouseEvent<HTMLButtonElement>) {
			// The native `disabled` attribute already blocks real interaction,
			// but a synthetic event dispatched straight at the element — as a
			// test does — walks past that guard, so the cue repeats it.
			if (!restProps.disabled) playCue("press");
			createRipple(event);
			// Call the original onClick handler if provided
			onClick?.(event);
		}

		return (
			<button
				ref={composedRef}
				className={cn(
					"ripple-button relative flex cursor-pointer items-center justify-center overflow-hidden",
					"bg-background text-primary rounded-lg border-2 px-4 py-2 text-center",
					className
				)}
				style={{ "--ripple-duration": `${duration}ms` } as CSSProperties}
				onClick={handleClick}
				{...restProps}
			>
				<div className="relative z-10">{children}</div>

				<span className="pointer-events-none absolute inset-0">
					{ripples.map((ripple) => (
						<span
							key={ripple.key}
							className="ripple-animation absolute rounded-full opacity-30"
							style={{
								width: `${ripple.size}px`,
								height: `${ripple.size}px`,
								top: `${ripple.y}px`,
								left: `${ripple.x}px`,
								backgroundColor: rippleColor,
							}}
						/>
					))}
				</span>
			</button>
		);
	}
);

RippleButton.displayName = "RippleButton";
