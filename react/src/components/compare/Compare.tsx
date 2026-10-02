/**
 * Compare - a before/after slider split by a blade of light
 *
 * The seam is a beam: a white-hot core with a chromatic fringe, a glow
 * that spills onto both sides, and pulses of light running along it. Moving
 * the seam leaves a trail behind it that stretches with the speed of the
 * gesture and settles when it stops.
 */
import {
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	type TouchEvent,
} from "react";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { cn } from "../../utils.js";
import "./compare.css";

export const COMPARE_BEAM_COLORS = ["#22d3ee", "#818cf8", "#f472b6"];

/** Three colours for the beam (left fringe, centre, right fringe), from one to many given. */
export function beamPalette(colors: string[] | undefined): [string, string, string] {
	const list = (colors ?? []).filter(Boolean);
	if (list.length === 0) return COMPARE_BEAM_COLORS as [string, string, string];
	if (list.length === 1) return [list[0]!, list[0]!, list[0]!];
	if (list.length === 2) return [list[0]!, `color-mix(in srgb, ${list[0]}, ${list[1]})`, list[1]!];
	return [list[0]!, list[Math.floor((list.length - 1) / 2)]!, list[list.length - 1]!];
}

/**
 * One frame of the beam's motion: the trail follows the seam's velocity
 * (px per frame, signed) and decays; the energy eases toward its target
 * and is kicked up by speed.
 */
export function beamStep(
	trail: number,
	energy: number,
	deltaPx: number,
	target: number
): { trail: number; energy: number } {
	const nextTrail = Math.max(-140, Math.min(140, trail * 0.86 + deltaPx * 1.6));
	const kick = Math.min(1, Math.abs(deltaPx) / 12);
	const nextEnergy = Math.min(1, energy + (Math.max(target, kick) - energy) * 0.12);
	return { trail: Math.abs(nextTrail) < 0.25 ? 0 : nextTrail, energy: nextEnergy };
}

/** Keyboard step for the slider, in %: arrows move 2, Shift+arrows 10, Home/End jump to the ends. */
export function keyStep(key: string, shift: boolean, current: number): number | null {
	const step = shift ? 10 : 2;
	switch (key) {
		case "ArrowLeft":
		case "ArrowDown":
			return Math.max(0, current - step);
		case "ArrowRight":
		case "ArrowUp":
			return Math.min(100, current + step);
		case "PageDown":
			return Math.max(0, current - 10);
		case "PageUp":
			return Math.min(100, current + 10);
		case "Home":
			return 0;
		case "End":
			return 100;
		default:
			return null;
	}
}

export interface CompareProps {
	firstImage?: string;
	secondImage?: string;
	firstImageAlt?: string;
	secondImageAlt?: string;
	className?: string;
	firstContentClass?: string;
	secondContentClass?: string;
	initialSliderPercentage?: number;
	slideMode?: "hover" | "drag";
	showHandlebar?: boolean;
	autoplay?: boolean;
	autoplayDuration?: number;
	/** Beam colours: left fringe, centre, right fringe (one or more colours) */
	beamColors?: string[];
	/** Accessible name of the slider */
	label?: string;
	/**
	 * @deprecated Use `label`. Kept so code written against the earlier port
	 * keeps its accessible name; `label` wins when both are given.
	 */
	ariaLabel?: string;
	onpercentagechange?: (percentage: number) => void;
	ondragstart?: () => void;
	ondragend?: () => void;
	onhoverenter?: () => void;
	onhoverleave?: () => void;
	firstContent?: ReactNode;
	secondContent?: ReactNode;
	handle?: ReactNode;
}

export function Compare({
	firstImage = "",
	secondImage = "",
	firstImageAlt = "First image",
	secondImageAlt = "Second image",
	className = "",
	firstContentClass = "",
	secondContentClass = "",
	initialSliderPercentage = 50,
	slideMode = "hover",
	showHandlebar = true,
	autoplay = false,
	autoplayDuration = 5000,
	beamColors,
	label,
	ariaLabel,
	onpercentagechange,
	ondragstart,
	ondragend,
	onhoverenter,
	onhoverleave,
	firstContent,
	secondContent,
	handle,
}: CompareProps) {
	const accessibleName = label ?? ariaLabel ?? "Comparison slider";
	const reducedMotion = useReducedMotion();
	const reducedMotionRef = useLiveRef(reducedMotion);

	const sliderRef = useRef<HTMLDivElement>(null);
	// Each piece of state the markup reads is mirrored in a ref: the rAF loops
	// (autoplay, glide, beam) are long-lived closures and must see live values,
	// as the reference's closures read its $state live.
	const [sliderXPercent, setSliderXPercentState] = useState(initialSliderPercentage);
	const percentRef = useRef(initialSliderPercentage);
	const [isDragging, setIsDraggingState] = useState(false);
	const isDraggingRef = useRef(false);
	const [isMouseOver, setIsMouseOverState] = useState(false);
	const isMouseOverRef = useRef(false);
	const [isInteracting, setIsInteractingState] = useState(false);
	const isInteractingRef = useRef(false);

	const autoplayRAF = useRef<number | null>(null);
	const returnRAF = useRef<number | null>(null);
	// A pointer move commits on the next frame. Keeping the handle lets a burst
	// of moves collapse into one commit and lets teardown drop a frame that no
	// longer has a component to commit into.
	const moveRAF = useRef<number | null>(null);

	// the beam's motion: trail (px, signed) and energy (0 idle … 1 lit)
	const [trail, setTrail] = useState(0);
	const [energy, setEnergy] = useState(0);
	const trailRef = useRef(0);
	const energyRef = useRef(0);
	const beamRAF = useRef<number | null>(null);
	const lastPx = useRef<number | null>(null);

	// Long-lived loops announce through the latest render's callback.
	const onPercentageChangeRef = useLiveRef(onpercentagechange);

	const palette = beamPalette(beamColors);

	function setSliderX(p: number): void {
		percentRef.current = p;
		setSliderXPercentState(p);
	}
	function setIsDragging(v: boolean): void {
		isDraggingRef.current = v;
		setIsDraggingState(v);
	}
	function setIsMouseOver(v: boolean): void {
		isMouseOverRef.current = v;
		setIsMouseOverState(v);
	}
	function setIsInteracting(v: boolean): void {
		isInteractingRef.current = v;
		setIsInteractingState(v);
	}

	function setPercent(p: number): void {
		const next = Math.max(0, Math.min(100, p));
		setSliderX(next);
		onPercentageChangeRef.current?.(next);
	}

	function startAutoplay(): void {
		if (!autoplay || isMouseOverRef.current || isDraggingRef.current) return;

		const startTime = Date.now();
		function animate(): void {
			if (isMouseOverRef.current || isDraggingRef.current) {
				if (autoplayRAF.current) cancelAnimationFrame(autoplayRAF.current);
				return;
			}

			const elapsedTime = Date.now() - startTime;
			const progress = (elapsedTime % (autoplayDuration * 2)) / autoplayDuration;
			// eased back-and-forth: slow at the ends, quick through the middle
			const linear = progress <= 1 ? progress : 2 - progress;
			const eased = linear < 0.5 ? 4 * linear ** 3 : 1 - (-2 * linear + 2) ** 3 / 2;

			setPercent(eased * 100);
			autoplayRAF.current = requestAnimationFrame(animate);
		}

		animate();
	}

	function stopAutoplay(): void {
		if (autoplayRAF.current) {
			cancelAnimationFrame(autoplayRAF.current);
			autoplayRAF.current = null;
		}
	}

	function stopReturn(): void {
		if (returnRAF.current) {
			cancelAnimationFrame(returnRAF.current);
			returnRAF.current = null;
		}
	}

	function stopMoveFrame(): void {
		if (moveRAF.current) {
			cancelAnimationFrame(moveRAF.current);
			moveRAF.current = null;
		}
	}

	/** Glide the seam back to its resting place instead of snapping. */
	function glideTo(target: number): void {
		stopReturn();
		if (reducedMotionRef.current) {
			setPercent(target);
			return;
		}
		const from = percentRef.current;
		const start = performance.now();
		const duration = 520;
		const step = (now: number) => {
			const k = Math.min(1, (now - start) / duration);
			const e = 1 - (1 - k) ** 3;
			setPercent(from + (target - from) * e);
			returnRAF.current = k < 1 ? requestAnimationFrame(step) : null;
		};
		returnRAF.current = requestAnimationFrame(step);
	}

	function mouseEnterHandler(): void {
		setIsMouseOver(true);
		stopReturn();
		onhoverenter?.();
		if (autoplay) {
			stopAutoplay();
		}
	}

	function mouseLeaveHandler(): void {
		setIsMouseOver(false);
		setIsInteracting(false);
		onhoverleave?.();

		if (slideMode === "hover") {
			glideTo(initialSliderPercentage);
		}
		if (slideMode === "drag") {
			setIsDragging(false);
		}

		if (autoplay) {
			stopReturn();
			startAutoplay();
		}
	}

	function handleStart(): void {
		if (slideMode === "drag") {
			setIsDragging(true);
			setIsInteracting(true);
			ondragstart?.();
			stopAutoplay();
		}
	}

	function handleEnd(): void {
		if (slideMode === "drag") {
			setIsDragging(false);
			setIsInteracting(false);
			ondragend?.();
			if (autoplay && !isMouseOverRef.current) {
				startAutoplay();
			}
		}
	}

	function handleMove(clientX: number): void {
		if (!sliderRef.current) return;

		if (slideMode === "hover" || (slideMode === "drag" && isDraggingRef.current)) {
			setIsInteracting(true);
			stopAutoplay();
			stopReturn();

			const rect = sliderRef.current.getBoundingClientRect();
			const x = clientX - rect.left;
			const percent = (x / rect.width) * 100;

			stopMoveFrame();
			moveRAF.current = requestAnimationFrame(() => {
				moveRAF.current = null;
				setPercent(percent);
			});
		}
	}

	function handleMouseDown(): void {
		handleStart();
	}

	function handleMouseMove(e: MouseEvent<HTMLDivElement>): void {
		handleMove(e.clientX);
	}

	function handleTouchStart(): void {
		if (!autoplay) handleStart();
	}

	function handleTouchEnd(): void {
		if (!autoplay) handleEnd();
	}

	function handleTouchMove(e: TouchEvent<HTMLDivElement>): void {
		const touch = e.touches[0];
		if (!autoplay && touch) handleMove(touch.clientX);
	}

	function handleKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
		const next = keyStep(e.key, e.shiftKey, percentRef.current);
		if (next === null) return;
		e.preventDefault();
		stopAutoplay();
		stopReturn();
		setPercent(next);
	}

	/** Run the beam's motion until it has settled. */
	function wakeBeam(): void {
		if (beamRAF.current !== null || reducedMotionRef.current) return;
		const tick = () => {
			const width = sliderRef.current?.clientWidth ?? 0;
			const px = (percentRef.current / 100) * width;
			const delta = lastPx.current === null ? 0 : px - lastPx.current;
			lastPx.current = px;
			const target =
				isInteractingRef.current || isDraggingRef.current ? 1 : isMouseOverRef.current ? 0.7 : 0;
			const next = beamStep(trailRef.current, energyRef.current, delta, target);
			trailRef.current = next.trail;
			energyRef.current = next.energy;
			setTrail(next.trail);
			setEnergy(next.energy);
			const settled = next.trail === 0 && delta === 0 && Math.abs(next.energy - target) < 0.01;
			beamRAF.current = settled ? null : requestAnimationFrame(tick);
		};
		beamRAF.current = requestAnimationFrame(tick);
	}

	// Watch for initialSliderPercentage changes. Layout, not passive, so it keeps
	// running AHEAD of the autoplay start below in the same pre-paint commit —
	// the order the two reference effects run in.
	useIsomorphicLayoutEffect(() => {
		setSliderX(initialSliderPercentage);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialSliderPercentage]);

	// any movement of the seam (pointer, keys, autoplay, glide) wakes the beam
	useEffect(() => {
		wakeBeam();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sliderXPercent, isInteracting, isMouseOver]);

	// Watch for autoplay changes. This effect also covers the reference's
	// onMount start: it runs at mount, before the browser paints, so the first
	// frame already shows the autoplay start position.
	useIsomorphicLayoutEffect(() => {
		if (autoplay && !isMouseOverRef.current && !isDraggingRef.current) {
			startAutoplay();
		} else {
			stopAutoplay();
		}
		return stopAutoplay;
		// The loop reads autoplayDuration from its closure — restart it when
		// the duration changes so the closure stays current.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoplay, autoplayDuration]);

	// Teardown: every frame still pending belongs to a component that is gone.
	useEffect(
		() => () => {
			stopAutoplay();
			stopReturn();
			stopMoveFrame();
			if (beamRAF.current !== null) cancelAnimationFrame(beamRAF.current);
			beamRAF.current = null;
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	const rootStyle = {
		position: "relative",
		cursor: slideMode === "drag" ? (isDragging ? "grabbing" : "grab") : "col-resize",
		"--cmp-c1": palette[0],
		"--cmp-c2": palette[1],
		"--cmp-c3": palette[2],
		"--cmp-energy": energy.toFixed(3),
		"--cmp-trail": trail.toFixed(1),
	} as CSSProperties;

	return (
		<div
			ref={sliderRef}
			className={cn("compare h-[400px] w-[400px] overflow-hidden", className)}
			style={rootStyle}
			data-active={isInteracting || isDragging ? "" : undefined}
			onMouseMove={handleMouseMove}
			onMouseLeave={mouseLeaveHandler}
			onMouseEnter={mouseEnterHandler}
			onMouseDown={handleMouseDown}
			onMouseUp={handleEnd}
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
			onTouchMove={handleTouchMove}
			onKeyDown={handleKeyDown}
			role="slider"
			aria-label={accessibleName}
			aria-valuenow={Math.round(sliderXPercent)}
			aria-valuetext={`${Math.round(sliderXPercent)}% ${firstImageAlt}`}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-orientation="horizontal"
			tabIndex={0}
		>
			{/* The seam: a blade of light, screened onto both sides */}
			<div
				className="compare-beam pointer-events-none absolute top-0 z-40 h-full w-px"
				style={{ left: `${sliderXPercent}%` }}
				aria-hidden="true"
			>
				<span className="compare-beam__glow"></span>
				<span className="compare-beam__trail"></span>
				<span className="compare-beam__fringe"></span>
				<span className="compare-beam__core"></span>
				<span className="compare-beam__pulse"></span>
				<span className="compare-beam__pulse compare-beam__pulse--late"></span>
			</div>

			{/* Handle, above the beam and not blended with it */}
			<div
				className="compare-seam pointer-events-none absolute top-0 z-[41] h-full w-px"
				style={{ left: `${sliderXPercent}%` }}
			>
				{handle ? (
					handle
				) : showHandlebar ? (
					<div className="compare-handle pointer-events-auto" aria-hidden="true">
						<span className="compare-handle__ring"></span>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							className="size-4"
						>
							<path strokeLinecap="round" strokeLinejoin="round" d="M9 7 4 12l5 5M15 7l5 5-5 5" />
						</svg>
					</div>
				) : null}
			</div>

			{/* First Content */}
			<div
				className="relative z-20 size-full overflow-hidden"
				style={{ pointerEvents: isInteracting ? "none" : "auto" }}
			>
				<div
					className={cn(
						"absolute inset-0 z-20 h-full w-full flex-shrink-0 overflow-hidden rounded-2xl select-none",
						firstContentClass
					)}
					style={{ clipPath: `inset(0 ${100 - sliderXPercent}% 0 0)` }}
				>
					{firstContent ? (
						firstContent
					) : firstImage ? (
						<img
							alt={firstImageAlt}
							src={firstImage}
							className={cn(
								"absolute inset-0 z-20 h-full w-full flex-shrink-0 rounded-2xl object-cover select-none",
								firstContentClass
							)}
							draggable={false}
						/>
					) : null}
				</div>
			</div>

			{/* Second Content */}
			<div
				className={cn(
					"absolute top-0 left-0 z-[19] h-full w-full overflow-hidden rounded-2xl select-none",
					secondContentClass
				)}
				style={{ pointerEvents: isInteracting ? "none" : "auto" }}
			>
				{secondContent ? (
					secondContent
				) : secondImage ? (
					<img
						alt={secondImageAlt}
						src={secondImage}
						className={cn("h-full w-full object-cover", secondContentClass)}
						draggable={false}
					/>
				) : null}
			</div>
		</div>
	);
}
