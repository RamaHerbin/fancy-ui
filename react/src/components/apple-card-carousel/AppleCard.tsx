import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { cn } from "../../utils.js";

export interface AppleCardData {
	/** Category label shown above the title */
	category: string;
	/** Main card title */
	title: string;
	/** URL of the card background image */
	src: string;
	/** Short description shown in the expanded view */
	description?: string;
	/** Rich content shown in the expanded view (takes precedence over description) */
	content?: ReactNode;
}

/** Shared transition duration — must stay in sync with the inline transition below */
export const TRANSITION_MS = 400;

export interface AppleCardProps {
	card: AppleCardData;
	index: number;
	expandedIndex: number;
	reducedMotion: boolean;
	onExpand: (index: number) => void;
	onCollapse: () => void;
	className?: string;
	/**
	 * Plays the matching open/close cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

interface Rect {
	top: number;
	left: number;
	width: number;
	height: number;
}

export function AppleCard({
	card,
	index,
	expandedIndex,
	reducedMotion,
	onExpand,
	onCollapse,
	className = "",
	sound = false,
}: AppleCardProps) {
	const cardEl = useRef<HTMLDivElement | null>(null);
	const dialogEl = useRef<HTMLDivElement | null>(null);
	const closeBtn = useRef<HTMLButtonElement | null>(null);
	const previousFocus = useRef<HTMLElement | null>(null);

	const [rect, setRect] = useState<Rect | null>(null);
	const [overlayVisible, setOverlayVisible] = useState(false);
	const [fullyExpanded, setFullyExpanded] = useState(false);

	// Collapse-in-progress latch. Not state: nothing renders off it — it only
	// dedupes handleCollapse calls (Escape + backdrop click) during the exit
	// window, and gates the close cue on the overlay actually being open
	// rather than on the entrance animation having finished.
	const closing = useRef(false);

	// Read at expand time so the animation branch is decided once per expand,
	// exactly like the source's imperative handler.
	const reducedMotionRef = useRef(reducedMotion);
	reducedMotionRef.current = reducedMotion;

	const playCue = useSoundCue(sound);

	function handleExpand() {
		if (expandedIndex !== -1) return;
		playCue("open");
		previousFocus.current = document.activeElement as HTMLElement;
		const r = cardEl.current!.getBoundingClientRect();
		setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
		setOverlayVisible(true);
		onExpand(index);
	}

	// Once the overlay is in the DOM, focus lands in the layout phase — before
	// the user's first painted frame, where the source's `await tick()` puts
	// it. The reduced-motion branch has no entrance leg, so its still frame is
	// committed here too.
	useIsomorphicLayoutEffect(() => {
		if (!overlayVisible) return;
		closeBtn.current?.focus();
		if (reducedMotionRef.current) {
			setFullyExpanded(true);
		}
	}, [overlayVisible]);

	// Flip to the fully expanded geometry (double rAF so the initial card-rect
	// frame paints) — a painted first frame is the point, so this one stays
	// passive.
	useEffect(() => {
		if (!overlayVisible || reducedMotionRef.current) return;
		let raf2 = 0;
		const raf1 = requestAnimationFrame(() => {
			raf2 = requestAnimationFrame(() => {
				setFullyExpanded(true);
			});
		});
		return () => {
			cancelAnimationFrame(raf1);
			cancelAnimationFrame(raf2);
		};
	}, [overlayVisible]);

	function handleCollapse() {
		if (!overlayVisible || closing.current) return;
		closing.current = true;
		// Gated on the overlay being open, not on `fullyExpanded` — a dismissal
		// during the two entrance frames (Escape right after Enter) must still
		// pair the `open` cue with a `close`.
		playCue("close");
		setFullyExpanded(false);
		const delay = reducedMotion ? 0 : TRANSITION_MS;
		setTimeout(() => {
			setOverlayVisible(false);
			closing.current = false;
			onCollapse();
			setRect(null);
			previousFocus.current?.focus();
			previousFocus.current = null;
		}, delay);
	}

	function handleCardKeydown(e: KeyboardEvent<HTMLDivElement>) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleExpand();
		}
	}

	function handleOverlayKeydown(e: KeyboardEvent<HTMLDivElement>) {
		if (e.key === "Escape") {
			handleCollapse();
			return;
		}
		// Simple focus trap: cycle focus within the dialog on Tab
		if (e.key === "Tab" && dialogEl.current) {
			const focusable = Array.from(
				dialogEl.current.querySelectorAll<HTMLElement>(
					'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
				)
			);
			if (focusable.length === 0) return;
			const first = focusable[0]!;
			const last = focusable[focusable.length - 1]!;
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	return (
		<>
			{/* Collapsed card in the carousel */}
			<div
				ref={cardEl}
				className={cn(
					"relative h-80 w-56 shrink-0 cursor-pointer snap-start overflow-hidden rounded-3xl md:h-96 md:w-72",
					className
				)}
				role="button"
				tabIndex={0}
				aria-label={`Open ${card.title}`}
				onClick={handleExpand}
				onKeyDown={handleCardKeydown}
			>
				<img
					src={card.src}
					alt={card.title}
					className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105"
					draggable={false}
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
				<div className="absolute bottom-0 left-0 p-5">
					<p className="mb-1 text-xs font-semibold tracking-widest text-white/70 uppercase">
						{card.category}
					</p>
					<h3 className="text-base font-semibold text-white md:text-lg">{card.title}</h3>
				</div>
			</div>

			{/* Expanded overlay */}
			{overlayVisible && rect !== null && (
				<>
					<div
						className="fixed inset-0 z-40 bg-black/80"
						aria-hidden="true"
						style={{
							opacity: fullyExpanded ? 1 : 0,
							transition: `opacity ${reducedMotion ? 0 : TRANSITION_MS}ms ease`,
						}}
						onClick={handleCollapse}
					></div>

					<div
						ref={dialogEl}
						role="dialog"
						aria-modal="true"
						aria-label={card.title}
						tabIndex={-1}
						className="fixed z-50 overflow-y-auto bg-white dark:bg-neutral-900"
						style={{
							top: fullyExpanded ? "0px" : `${rect.top}px`,
							left: fullyExpanded ? "0px" : `${rect.left}px`,
							width: fullyExpanded ? "100vw" : `${rect.width}px`,
							height: fullyExpanded ? "100vh" : `${rect.height}px`,
							borderRadius: fullyExpanded ? "0px" : "1.5rem",
							transition: reducedMotion
								? "none"
								: `top ${TRANSITION_MS}ms cubic-bezier(0.32,0.72,0,1), left ${TRANSITION_MS}ms cubic-bezier(0.32,0.72,0,1), width ${TRANSITION_MS}ms cubic-bezier(0.32,0.72,0,1), height ${TRANSITION_MS}ms cubic-bezier(0.32,0.72,0,1), border-radius ${TRANSITION_MS}ms cubic-bezier(0.32,0.72,0,1)`,
						}}
						onKeyDown={handleOverlayKeydown}
					>
						{/* Close button */}
						<button
							ref={closeBtn}
							className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-colors hover:bg-black/30"
							aria-label="Close"
							onClick={handleCollapse}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="white"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M18 6 6 18" />
								<path d="m6 6 12 12" />
							</svg>
						</button>

						{/* Hero image */}
						<div className="relative h-72 w-full shrink-0 md:h-96">
							<img
								src={card.src}
								alt={card.title}
								className="h-full w-full object-cover"
								draggable={false}
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
							<div className="absolute bottom-0 left-0 p-6 md:p-8">
								<p className="mb-2 text-xs font-semibold tracking-widest text-white/70 uppercase">
									{card.category}
								</p>
								<h2 className="text-2xl font-bold text-white md:text-3xl">{card.title}</h2>
							</div>
						</div>

						{/* Content area */}
						<div className="p-6 md:p-8">
							{card.content ? (
								card.content
							) : card.description ? (
								<p className="leading-relaxed text-gray-600 dark:text-neutral-400">
									{card.description}
								</p>
							) : null}
						</div>
					</div>
				</>
			)}
		</>
	);
}
