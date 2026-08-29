import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils.js";

/**
 * BoxReveal - Sliding box reveal animation
 *
 * Content fades up while a colored box slides from left to right,
 * revealing the content underneath. Triggers when entering viewport
 * via IntersectionObserver.
 */
export interface BoxRevealProps extends Omit<HTMLAttributes<HTMLDivElement>, "className" | "children"> {
	/** Color of the reveal box */
	color?: string;
	/** Animation duration in seconds */
	duration?: number;
	/** Delay before animation starts (seconds) */
	delay?: number;
	/** Additional CSS classes */
	className?: string;
	children: ReactNode;
}

export function BoxReveal({
	color = "#5046e6",
	duration = 0.5,
	delay = 0.25,
	className,
	children,
	...props
}: BoxRevealProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isInView, setIsInView] = useState(false);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					setIsInView(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(el);

		return () => observer.disconnect();
	}, []);

	return (
		<div ref={containerRef} className={cn("box-reveal relative overflow-hidden", className)} {...props}>
			{/* Content (fades up) */}
			<div
				className="box-reveal-content"
				style={{
					opacity: isInView ? 1 : 0,
					transform: `translateY(${isInView ? 0 : 25}px)`,
					transition: `opacity ${duration}s ease ${delay * 2}s,transform ${duration}s ease ${delay * 2}s`,
				}}
			>
				{children}
			</div>

			{/* Sliding box overlay */}
			<div
				className="box-reveal-overlay absolute inset-0 z-20"
				style={{
					background: color,
					left: isInView ? "100%" : "0%",
					transition: `left ${duration}s ease-in ${delay}s`,
				}}
			/>
		</div>
	);
}
