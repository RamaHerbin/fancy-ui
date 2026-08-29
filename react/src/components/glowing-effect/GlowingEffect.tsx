import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import { cn } from "../../utils.js";

export interface GlowingEffectProps {
	/** Blur amount for the glow. */
	blur?: number;
	/** Inner zone radius ratio where glow deactivates. */
	inactiveZone?: number;
	/** Extra proximity distance to activate glow. */
	proximity?: number;
	/** Spread angle of the conic gradient. */
	spread?: number;
	/** Color variant. */
	variant?: "default" | "white";
	/** Force glow visible. */
	glow?: boolean;
	/** Additional CSS classes. */
	className?: string;
	/** Disable mouse tracking. */
	disabled?: boolean;
	/** Animation speed. */
	movementDuration?: number;
	/** Border width in pixels. */
	borderWidth?: number;
}

interface MotionState {
	lastPosition: { x: number; y: number };
	animationFrameId: number;
	angleAnimationFrameId: number;
	currentAngle: number;
	targetAngle: number;
	animating: boolean;
}

export function GlowingEffect({
	blur = 0,
	inactiveZone = 0.7,
	proximity = 0,
	spread = 20,
	variant = "default",
	glow = false,
	className = "",
	disabled = true,
	movementDuration = 2,
	borderWidth = 1,
}: GlowingEffectProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const motionRef = useRef<MotionState>({
		lastPosition: { x: 0, y: 0 },
		animationFrameId: 0,
		angleAnimationFrameId: 0,
		currentAngle: 0,
		targetAngle: 0,
		animating: false,
	});
	// Live mirror of the props the frame handlers read, so a mounted listener
	// always sees the latest values (the Svelte closures read reactive props).
	const liveRef = useRef({ inactiveZone, proximity, movementDuration });
	useEffect(() => {
		liveRef.current = { inactiveZone, proximity, movementDuration };
	});
	// `disabled` is read once at mount, mirroring the Svelte onMount: toggling
	// it later does not attach/detach listeners on either side.
	const disabledAtMount = useRef(disabled);

	const containerStyle = {
		"--blur": `${blur}px`,
		"--spread": spread,
		"--start": "0",
		"--active": "0",
		"--glowingeffect-border-width": `${borderWidth}px`,
		"--repeating-conic-gradient-times": "5",
		"--gradient":
			variant === "white"
				? `repeating-conic-gradient(from 236.84deg at 50% 50%, var(--black), var(--black) calc(25% / var(--repeating-conic-gradient-times)))`
				: `radial-gradient(circle, #dd7bbb 10%, #dd7bbb00 20%), radial-gradient(circle at 40% 40%, #d79f1e 5%, #d79f1e00 15%), radial-gradient(circle at 60% 60%, #5a922c 10%, #5a922c00 20%), radial-gradient(circle at 40% 60%, #4c7894 10%, #4c789400 20%), repeating-conic-gradient(from 236.84deg at 50% 50%, #dd7bbb 0%, #d79f1e calc(25% / var(--repeating-conic-gradient-times)), #5a922c calc(50% / var(--repeating-conic-gradient-times)), #4c7894 calc(75% / var(--repeating-conic-gradient-times)), #dd7bbb calc(100% / var(--repeating-conic-gradient-times)))`,
	} as CSSProperties;

	useEffect(() => {
		if (disabledAtMount.current) return;

		const state = motionRef.current;

		function animateAngle() {
			// Lerp speed inversely proportional to movementDuration
			const speed = 0.08 / Math.max(liveRef.current.movementDuration, 0.1);
			state.currentAngle = state.currentAngle + (state.targetAngle - state.currentAngle) * speed;

			if (containerRef.current) {
				containerRef.current.style.setProperty("--start", String(state.currentAngle));
			}

			if (Math.abs(state.targetAngle - state.currentAngle) > 0.1) {
				state.angleAnimationFrameId = requestAnimationFrame(animateAngle);
			} else {
				state.currentAngle = state.targetAngle;
				if (containerRef.current) {
					containerRef.current.style.setProperty("--start", String(state.currentAngle));
				}
				state.animating = false;
			}
		}

		function handleMove(e?: { x: number; y: number }) {
			if (!containerRef.current) return;

			if (state.animationFrameId) {
				cancelAnimationFrame(state.animationFrameId);
			}

			state.animationFrameId = requestAnimationFrame(() => {
				const container = containerRef.current;
				if (!container) return;

				const { left, top, width, height } = container.getBoundingClientRect();
				const mouseX = e?.x ?? state.lastPosition.x;
				const mouseY = e?.y ?? state.lastPosition.y;

				if (e) {
					state.lastPosition = { x: mouseX, y: mouseY };
				}

				const center: [number, number] = [left + width * 0.5, top + height * 0.5];
				const distanceFromCenter = Math.hypot(mouseX - center[0], mouseY - center[1]);
				const inactiveRadius = 0.5 * Math.min(width, height) * liveRef.current.inactiveZone;

				if (distanceFromCenter < inactiveRadius) {
					container.style.setProperty("--active", "0");
					return;
				}

				const { proximity: liveProximity } = liveRef.current;
				const isActive =
					mouseX > left - liveProximity &&
					mouseX < left + width + liveProximity &&
					mouseY > top - liveProximity &&
					mouseY < top + height + liveProximity;

				container.style.setProperty("--active", isActive ? "1" : "0");

				if (!isActive) return;

				const rawTarget =
					(180 * Math.atan2(mouseY - center[1], mouseX - center[0])) / Math.PI + 90;

				// Shortest-path angle difference
				const angleDiff = ((rawTarget - state.currentAngle + 180) % 360) - 180;
				state.targetAngle = state.currentAngle + angleDiff;

				if (!state.animating) {
					state.animating = true;
					animateAngle();
				}
			});
		}

		function handlePointerMove(e: PointerEvent) {
			handleMove(e);
		}

		function handleScroll() {
			handleMove();
		}

		window.addEventListener("scroll", handleScroll, { passive: true });
		document.body.addEventListener("pointermove", handlePointerMove, { passive: true });

		return () => {
			if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
			if (state.angleAnimationFrameId) cancelAnimationFrame(state.angleAnimationFrameId);
			state.animating = false;
			window.removeEventListener("scroll", handleScroll);
			document.body.removeEventListener("pointermove", handlePointerMove);
		};
	}, []);

	return (
		<>
			<div
				className={cn(
					"pointer-events-none absolute -inset-px hidden rounded-[inherit] border opacity-0 transition-opacity",
					glow && "opacity-100",
					variant === "white" && "border-white",
					disabled && "!block"
				)}
				aria-hidden="true"
			></div>
			<div
				ref={containerRef}
				style={containerStyle}
				className={cn(
					"pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity",
					glow && "opacity-100",
					blur > 0 && "blur-[var(--blur)]",
					className,
					disabled && "!hidden"
				)}
				aria-hidden="true"
			>
				<div
					className={cn(
						"glow",
						"rounded-[inherit]",
						"after:absolute after:inset-[calc(-1*var(--glowingeffect-border-width))] after:rounded-[inherit] after:content-['']",
						"after:[border:var(--glowingeffect-border-width)_solid_transparent]",
						"after:[background-attachment:fixed] after:[background:var(--gradient)]",
						"after:opacity-[var(--active)] after:transition-opacity after:duration-300",
						"after:[mask-clip:padding-box,border-box]",
						"after:[mask-composite:intersect]",
						"after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]"
					)}
				></div>
			</div>
		</>
	);
}
