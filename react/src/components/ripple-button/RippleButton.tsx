import { forwardRef, useRef, useState } from "react";
import type { ButtonHTMLAttributes, CSSProperties, MouseEvent, ReactNode, Ref } from "react";
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
}

interface RippleState {
	x: number;
	y: number;
	size: number;
	key: number;
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
	if (typeof ref === "function") ref(node);
	else if (ref) (ref as { current: T | null }).current = node;
}

export const RippleButton = forwardRef<HTMLButtonElement, RippleButtonProps>(
	({ className, rippleColor = "#ADD8E6", duration = 600, children, onClick, ...restProps }, ref) => {
		const buttonRef = useRef<HTMLButtonElement | null>(null);
		const [ripples, setRipples] = useState<RippleState[]>([]);

		function createRipple(event: MouseEvent<HTMLButtonElement>) {
			const button = buttonRef.current;
			if (!button) return;

			const rect = button.getBoundingClientRect();
			const size = Math.max(rect.width, rect.height);
			const x = event.clientX - rect.left - size / 2;
			const y = event.clientY - rect.top - size / 2;

			const newRipple: RippleState = { x, y, size, key: Date.now() };
			setRipples((prev) => [...prev, newRipple]);

			// Remove ripple after animation completes
			setTimeout(() => {
				setRipples((prev) => prev.filter((r) => r.key !== newRipple.key));
			}, duration);
		}

		function handleClick(event: MouseEvent<HTMLButtonElement>) {
			createRipple(event);
			// Call the original onClick handler if provided
			onClick?.(event);
		}

		return (
			<button
				ref={(node) => {
					buttonRef.current = node;
					assignRef(ref, node);
				}}
				className={cn(
					"relative flex cursor-pointer items-center justify-center overflow-hidden",
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
