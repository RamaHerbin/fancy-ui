import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { cn } from "../../utils.js";
import { createGlowingEffect, type GlowingEffectEngine } from "./glowing-effect-core.js";

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
	// Latest values for the engine: the mount effect reads them once, and the
	// effect below pushes later changes into the running engine.
	const live = useLiveRef({ inactiveZone, proximity, movementDuration });
	const engineRef = useRef<GlowingEffectEngine | null>(null);
	// `disabled` is read once at mount, mirroring the Svelte onMount: toggling
	// it later does not create or destroy the engine on either side.
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
		const container = containerRef.current;
		if (disabledAtMount.current || !container) return;

		const engine = createGlowingEffect({ container }, live.current);
		engineRef.current = engine;

		return () => {
			engine?.destroy();
			engineRef.current = null;
		};
	}, [live]);

	// Live proximity/tween props reach the running engine without recreating it.
	useEffect(() => {
		engineRef.current?.setOptions({ inactiveZone, proximity, movementDuration });
	}, [inactiveZone, proximity, movementDuration]);

	return (
		<>
			<div
				className={cn(
					"pointer-events-none absolute -inset-px hidden rounded-[inherit] border opacity-0 motion-safe:transition-opacity",
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
					"pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 motion-safe:transition-opacity",
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
						"after:opacity-[var(--active)] after:motion-safe:transition-opacity after:motion-safe:duration-300",
						"after:[mask-clip:padding-box,border-box]",
						"after:[mask-composite:intersect]",
						"after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]"
					)}
				></div>
			</div>
		</>
	);
}
