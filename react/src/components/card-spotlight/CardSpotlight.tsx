import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { attachHdrLight, hdrLightAvailable } from "../../internals/hdr/hdr-light.js";
import { cn } from "../../utils.js";
import { createCardSpotlightProbe } from "./card-spotlight-hdr.js";

export interface CardSpotlightProps {
	/** Classes for the outer container. */
	className?: string;
	/** Classes for the content wrapper. */
	slotClass?: string;
	/** Radius of the spotlight gradient. */
	gradientSize?: number;
	/** Color of the spotlight. */
	gradientColor?: string;
	/** Opacity of the gradient overlay. */
	gradientOpacity?: number;
	/**
	 * Beta, off by default. On a display that reports HDR, add a hot core to the spotlight in a
	 * WebGPU layer with extended tone mapping, brighter than SDR white.
	 * Elsewhere nothing changes.
	 */
	hdr?: boolean;
	/** The card content. */
	children?: ReactNode;
}

export function CardSpotlight({
	className = "",
	slotClass = "",
	gradientSize = 200,
	gradientColor = "#262626",
	gradientOpacity = 0.8,
	hdr = false,
	children,
}: CardSpotlightProps) {
	const overlayRef = useRef<HTMLDivElement>(null);
	const restingX = -gradientSize * 10;
	const restingY = -gradientSize * 10;

	// The pointer position lives in a ref and is written straight to the overlay's
	// `background`: a mousemove patches one style property instead of re-rendering
	// the card and re-running its class merges.
	const pointerRef = useRef({ x: restingX, y: restingY });
	const hoveringRef = useRef(false);
	// The canvas exists only where the light can run; SSR and SDR devices render none.
	const [hdrCapable, setHdrCapable] = useState(false);
	useEffect(() => {
		setHdrCapable(hdrLightAvailable());
	}, []);

	const [host, hostRef] = useElementRef<HTMLDivElement>();
	const [hdrCanvas, hdrCanvasRef] = useElementRef<HTMLCanvasElement>();
	const live = useLiveRef({ gradientSize, gradientColor, gradientOpacity });

	useEffect(() => {
		if (!host || !hdrCanvas) return;
		return attachHdrLight({
			host,
			canvas: hdrCanvas,
			pad: 0,
			probe: createCardSpotlightProbe(() => ({
				x: pointerRef.current.x,
				y: pointerRef.current.y,
				hovering: hoveringRef.current,
				size: live.current.gradientSize,
				color: live.current.gradientColor,
				opacity: live.current.gradientOpacity,
			})),
		});
	}, [host, hdrCanvas, live]);

	function paint(x: number, y: number) {
		pointerRef.current = { x, y };
		const overlay = overlayRef.current;
		if (overlay) {
			overlay.style.background = `radial-gradient(circle at ${x}px ${y}px, ${gradientColor} 0%, rgba(0, 0, 0, 0) 70%)`;
		}
	}

	function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
		const target = e.currentTarget;
		const rect = target.getBoundingClientRect();
		hoveringRef.current = true;
		paint(e.clientX - rect.left, e.clientY - rect.top);
	}

	function handleMouseLeave() {
		hoveringRef.current = false;
		paint(restingX, restingY);
	}

	const restingBackground = `radial-gradient(circle at ${restingX}px ${restingY}px, ${gradientColor} 0%, rgba(0, 0, 0, 0) 70%)`;

	// React rewrites `background` whenever the value in the style object below changes,
	// which would snap a live spotlight back to the resting offsets; put the current
	// pointer position back in the same commit.
	useIsomorphicLayoutEffect(() => {
		const overlay = overlayRef.current;
		if (!overlay) return;
		const { x, y } = pointerRef.current;
		overlay.style.background = `radial-gradient(circle at ${x}px ${y}px, ${gradientColor} 0%, rgba(0, 0, 0, 0) 70%)`;
	}, [restingBackground, gradientColor]);

	return (
		<div
			ref={hostRef}
			className={cn(
				"group relative flex size-full overflow-hidden rounded-xl border bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white",
				className
			)}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
		>
			<div className={cn("relative z-10", slotClass)}>{children}</div>
			<div
				ref={overlayRef}
				className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 motion-safe:transition-opacity motion-safe:duration-300"
				style={{ background: restingBackground, opacity: gradientOpacity }}
			></div>
			{hdr && hdrCapable ? (
				<canvas
					ref={hdrCanvasRef}
					className="pointer-events-none absolute inset-0 h-full w-full"
					aria-hidden="true"
				/>
			) : null}
		</div>
	);
}
