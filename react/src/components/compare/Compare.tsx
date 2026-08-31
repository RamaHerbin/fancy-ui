import {
	useEffect,
	useRef,
	useState,
	type MouseEvent,
	type ReactNode,
	type TouchEvent,
} from "react";
import { cn } from "../../utils.js";
import { StarField } from "./StarField.js";

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
	onpercentagechange,
	ondragstart,
	ondragend,
	onhoverenter,
	onhoverleave,
	firstContent,
	secondContent,
	handle,
}: CompareProps) {
	const sliderRef = useRef<HTMLDivElement>(null);
	const [sliderXPercent, setSliderXPercent] = useState(initialSliderPercentage);
	const [isInteracting, setIsInteracting] = useState(false);
	// Neither flag appears in the markup — the Svelte side keeps them in
	// $state only so its closures read live values; refs give the rAF loop
	// the same live reads without a re-render per flip.
	const isDraggingRef = useRef(false);
	const isMouseOverRef = useRef(false);
	const autoplayRAF = useRef<number | null>(null);
	// The autoplay loop is long-lived; a ref keeps its percentage callback
	// current across re-renders, matching the Svelte closure's live prop read.
	const onPercentageChangeRef = useRef(onpercentagechange);
	onPercentageChangeRef.current = onpercentagechange;

	function stopAutoplay(): void {
		if (autoplayRAF.current) {
			cancelAnimationFrame(autoplayRAF.current);
			autoplayRAF.current = null;
		}
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
			const percentage = progress <= 1 ? progress * 100 : (2 - progress) * 100;

			setSliderXPercent(percentage);
			onPercentageChangeRef.current?.(percentage);
			autoplayRAF.current = requestAnimationFrame(animate);
		}

		animate();
	}

	function mouseEnterHandler(): void {
		isMouseOverRef.current = true;
		onhoverenter?.();
		if (autoplay) {
			stopAutoplay();
		}
	}

	function mouseLeaveHandler(): void {
		isMouseOverRef.current = false;
		setIsInteracting(false);
		onhoverleave?.();

		if (slideMode === "hover") {
			setSliderXPercent(initialSliderPercentage);
			onpercentagechange?.(initialSliderPercentage);
		}
		if (slideMode === "drag") {
			isDraggingRef.current = false;
		}

		if (autoplay) {
			startAutoplay();
		}
	}

	function handleStart(): void {
		if (slideMode === "drag") {
			isDraggingRef.current = true;
			setIsInteracting(true);
			ondragstart?.();
			stopAutoplay();
		}
	}

	function handleEnd(): void {
		if (slideMode === "drag") {
			isDraggingRef.current = false;
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

			const rect = sliderRef.current.getBoundingClientRect();
			const x = clientX - rect.left;
			const percent = (x / rect.width) * 100;

			requestAnimationFrame(() => {
				const newPercent = Math.max(0, Math.min(100, percent));
				setSliderXPercent(newPercent);
				onpercentagechange?.(newPercent);
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

	// Watch for initialSliderPercentage changes
	useEffect(() => {
		setSliderXPercent(initialSliderPercentage);
	}, [initialSliderPercentage]);

	// Watch for autoplay changes. This effect also covers the Svelte side's
	// onMount start / onDestroy stop pair: it runs at mount and its cleanup
	// cancels the loop on unmount.
	useEffect(() => {
		if (autoplay && !isMouseOverRef.current && !isDraggingRef.current) {
			startAutoplay();
		} else {
			stopAutoplay();
		}
		return () => {
			stopAutoplay();
		};
		// The loop reads autoplayDuration from its closure — restart it when
		// the duration changes so the closure stays current.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoplay, autoplayDuration]);

	return (
		<div
			ref={sliderRef}
			className={cn("h-[400px] w-[400px] overflow-hidden", className)}
			style={{
				position: "relative",
				cursor: slideMode === "drag" ? "grab" : "col-resize",
			}}
			onMouseMove={handleMouseMove}
			onMouseLeave={mouseLeaveHandler}
			onMouseEnter={mouseEnterHandler}
			onMouseDown={handleMouseDown}
			onMouseUp={handleEnd}
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
			onTouchMove={handleTouchMove}
			role="slider"
			aria-valuenow={sliderXPercent}
			aria-valuemin={0}
			aria-valuemax={100}
			tabIndex={0}
		>
			{/* Slider Line */}
			<div
				className="pointer-events-none absolute top-0 z-40 m-auto h-full w-px bg-gradient-to-b from-transparent from-5% via-indigo-500 to-transparent to-95%"
				style={{ left: `${sliderXPercent}%` }}
			>
				{/* Decorative Effects */}
				<div className="absolute top-1/2 left-0 z-20 h-full w-36 -translate-y-1/2 bg-gradient-to-r from-indigo-400 via-transparent to-transparent [mask-image:radial-gradient(100px_at_left,white,transparent)] opacity-50"></div>
				<div className="absolute top-1/2 left-0 z-10 h-1/2 w-10 -translate-y-1/2 bg-gradient-to-r from-cyan-400 via-transparent to-transparent [mask-image:radial-gradient(50px_at_left,white,transparent)] opacity-100"></div>
				<div className="absolute top-1/2 -right-10 h-3/4 w-10 -translate-y-1/2 [mask-image:radial-gradient(100px_at_left,white,transparent)]">
					<StarField starsCount={120} className="size-full" />
				</div>

				{/* Custom Handle Slot */}
				{handle ? (
					handle
				) : showHandlebar ? (
					<div className="pointer-events-auto absolute top-1/2 -right-2.5 z-30 flex size-5 -translate-y-1/2 cursor-grab items-center justify-center rounded-md bg-white shadow-[0px_-1px_0px_0px_#FFFFFF40]">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="1.5"
							stroke="currentColor"
							className="size-4 text-black"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
							/>
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
