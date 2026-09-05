import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { cn } from "../../utils.js";

export interface SpringConfig {
	/** Controls how quickly the animation settles (default: 45) */
	damping?: number;
	/** Controls the spring stiffness (default: 400) */
	stiffness?: number;
	/** Controls the virtual mass of the animated object (default: 1) */
	mass?: number;
}

export interface SmoothCursorProps {
	/** Custom cursor node to replace the default arrow cursor */
	cursor?: ReactNode;
	/** Spring physics configuration */
	springConfig?: SpringConfig;
	/** Additional CSS classes */
	className?: string;
}

export function SmoothCursor({ cursor, springConfig = {}, className = "" }: SmoothCursorProps) {
	const config = {
		damping: springConfig.damping ?? 45,
		stiffness: springConfig.stiffness ?? 400,
		mass: springConfig.mass ?? 1,
	};

	const cursorElRef = useRef<HTMLDivElement | null>(null);
	const [visible, setVisible] = useState(false);

	// Latest spring config, readable from inside the persistent rAF loop.
	const configRef = useLiveRef(config);

	// Mutable animation state — mirrors the Svelte component's plain (non-reactive)
	// locals. Per-frame values never round-trip through React state.
	const stateRef = useRef({
		visible: false,
		reducedMotion: false,
		posX: 0,
		posY: 0,
		velX: 0,
		velY: 0,
		targetX: 0,
		targetY: 0,
		rotation: 0,
		prevX: 0,
		prevY: 0,
		rafId: null as number | null,
		lastTime: 0,
	});

	useEffect(() => {
		const s = stateRef.current;

		function startAnimation() {
			if (s.rafId === null) {
				s.lastTime = 0;
				s.rafId = requestAnimationFrame(animate);
			}
		}

		function stopAnimation() {
			if (s.rafId !== null) {
				cancelAnimationFrame(s.rafId);
				s.rafId = null;
			}
		}

		function snapToTarget() {
			s.posX = s.targetX;
			s.posY = s.targetY;
			s.velX = 0;
			s.velY = 0;
			if (cursorElRef.current) {
				cursorElRef.current.style.transform = `translate3d(${s.posX}px, ${s.posY}px, 0)`;
			}
		}

		function onMouseMove(e: MouseEvent) {
			s.targetX = e.clientX;
			s.targetY = e.clientY;

			if (!s.visible) {
				s.posX = s.targetX;
				s.posY = s.targetY;
				s.prevX = s.targetX;
				s.prevY = s.targetY;
				s.visible = true;
				setVisible(true);
			}

			if (s.reducedMotion) {
				snapToTarget();
			} else {
				startAnimation();
			}
		}

		function onMouseLeave() {
			s.visible = false;
			setVisible(false);
			stopAnimation();
		}

		function onMouseEnter(e: MouseEvent) {
			s.targetX = e.clientX;
			s.targetY = e.clientY;
			s.posX = s.targetX;
			s.posY = s.targetY;
			s.prevX = s.targetX;
			s.prevY = s.targetY;
			s.visible = true;
			setVisible(true);

			if (!s.reducedMotion) {
				startAnimation();
			} else {
				snapToTarget();
			}
		}

		function animate(time: number) {
			if (!s.visible) {
				s.rafId = null;
				return;
			}

			s.rafId = requestAnimationFrame(animate);

			if (s.lastTime === 0) {
				s.lastTime = time;
				return;
			}

			const dt = Math.min((time - s.lastTime) / 1000, 0.064);
			s.lastTime = time;

			const { stiffness, damping, mass } = configRef.current;

			// Spring physics: F = -k * displacement - c * velocity
			const forceX = -stiffness * (s.posX - s.targetX) - damping * s.velX;
			const forceY = -stiffness * (s.posY - s.targetY) - damping * s.velY;

			const accX = forceX / mass;
			const accY = forceY / mass;

			s.velX += accX * dt;
			s.velY += accY * dt;

			s.posX += s.velX * dt;
			s.posY += s.velY * dt;

			// Calculate rotation based on movement direction
			const dx = s.posX - s.prevX;
			const dy = s.posY - s.prevY;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance > 0.1) {
				const targetRotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
				let diff = targetRotation - s.rotation;
				while (diff > 180) diff -= 360;
				while (diff < -180) diff += 360;
				s.rotation += diff * 0.3;
			}

			s.prevX = s.posX;
			s.prevY = s.posY;

			if (cursorElRef.current) {
				cursorElRef.current.style.transform = `translate3d(${s.posX}px, ${s.posY}px, 0) rotate(${s.rotation}deg)`;
			}
		}

		const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		s.reducedMotion = motionQuery.matches;

		function onMotionChange(e: MediaQueryListEvent) {
			s.reducedMotion = e.matches;
			if (s.reducedMotion) {
				stopAnimation();
				snapToTarget();
			} else if (s.visible) {
				startAnimation();
			}
		}

		motionQuery.addEventListener("change", onMotionChange);

		document.body.style.cursor = "none";

		document.addEventListener("mousemove", onMouseMove);
		document.documentElement.addEventListener("mouseleave", onMouseLeave);
		document.documentElement.addEventListener("mouseenter", onMouseEnter);

		return () => {
			document.body.style.cursor = "";
			motionQuery.removeEventListener("change", onMotionChange);
			document.removeEventListener("mousemove", onMouseMove);
			document.documentElement.removeEventListener("mouseleave", onMouseLeave);
			document.documentElement.removeEventListener("mouseenter", onMouseEnter);
			stopAnimation();
		};
	}, []);

	return (
		<div
			ref={cursorElRef}
			aria-hidden="true"
			className={cn(
				"pointer-events-none fixed top-0 left-0 z-[9999]",
				visible ? "opacity-100" : "opacity-0",
				className
			)}
			style={{ willChange: "transform", translate: "-50% -50%" }}
		>
			{cursor || (
				// Default cursor: arrow SVG
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="32"
					height="32"
					viewBox="0 0 32 32"
					focusable="false"
				>
					<path
						fill="currentColor"
						d="M9.391 2.32C8.42 1.56 7 2.253 7 3.486V28.41c0 1.538 1.966 2.18 2.874.938l6.225-8.523a2 2 0 0 1 1.615-.82h9.69c1.512 0 2.17-1.912.978-2.844z"
					/>
				</svg>
			)}
		</div>
	);
}
