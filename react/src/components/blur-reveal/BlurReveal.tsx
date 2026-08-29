import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../utils.js";
import "./blur-reveal.css";

/** Props for BlurReveal */
export interface BlurRevealProps {
	/** Animation duration in seconds */
	duration?: number;
	/** Stagger delay between children in seconds */
	delay?: number;
	/** Initial blur amount (CSS value) */
	blur?: string;
	/** Initial vertical offset in pixels */
	yOffset?: number;
	/** Additional CSS classes for the container */
	className?: string;
	/** Reveal style: "blur" softens in with blur/translate, "hard" snaps opacity with no easing */
	mode?: "blur" | "hard";
	/** Content to reveal */
	children?: ReactNode;
}

export function BlurReveal({
	duration = 1,
	delay = 0.2,
	blur = "20px",
	yOffset = 20,
	className,
	mode = "blur",
	children,
}: BlurRevealProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isInView, setIsInView] = useState(false);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setIsInView(true);
						observer.disconnect();
					}
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(container);

		return () => observer.disconnect();
	}, []);

	const style = {
		"--blur-reveal-duration": `${duration}s`,
		"--blur-reveal-delay": `${delay}s`,
		"--blur-reveal-blur": blur,
		"--blur-reveal-y": `${yOffset}px`,
	} as CSSProperties;

	return (
		<div ref={containerRef} className={cn(className)} style={style}>
			{children ? (
				<div
					className={cn("blur-reveal-wrapper", isInView && "is-visible", mode === "hard" && "mode-hard")}
				>
					{children}
				</div>
			) : null}
		</div>
	);
}
