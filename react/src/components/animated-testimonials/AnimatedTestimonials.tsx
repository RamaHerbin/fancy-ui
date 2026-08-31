import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../utils.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";

/**
 * AnimatedTestimonials - Animated testimonial carousel
 *
 * Cycles through testimonials with smooth slide animations.
 * Supports manual navigation and optional autoplay.
 */
export interface Testimonial {
	/** The testimonial quote */
	quote: string;
	/** Author's full name */
	name: string;
	/** Author's title or role */
	designation: string;
	/** URL to author's avatar image */
	src: string;
}

export interface AnimatedTestimonialsProps {
	/** Array of testimonials to display */
	testimonials: Testimonial[];
	/** Auto-advance testimonials */
	autoplay?: boolean;
	/** Interval between auto-advances (ms) */
	interval?: number;
	/** Additional CSS classes */
	className?: string;
}

/** Duration must match the CSS transition duration below */
const TRANSITION_DURATION = 300;

export function AnimatedTestimonials({
	testimonials,
	autoplay = false,
	interval = 5000,
	className,
}: AnimatedTestimonialsProps) {
	const [activeIndex, setActiveIndex] = useState(0);
	const [direction, setDirection] = useState<"next" | "prev">("next");
	const [isAnimating, setIsAnimating] = useState(false);
	const [isHovered, setIsHovered] = useState(false);

	// Mirrors `isAnimating` for the guard inside timer callbacks, where the
	// state value captured by the closure may be stale.
	const isAnimatingRef = useRef(false);
	const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const testimonialCount = testimonials.length;

	// The timeout below outlives the render that scheduled it, so the count it
	// wraps around has to be read when it FIRES, not when it was captured: a
	// collection that shrank during the 300ms transition would otherwise land
	// `activeIndex` past the end of the new list. The Svelte source reads
	// `testimonials.length` through a reactive prop getter inside the same
	// callback and gets the live value for free; a React closure captures.
	const testimonialCountRef = useLiveRef(testimonialCount);

	const navigate = useCallback(
		(dir: "next" | "prev") => {
			if (isAnimatingRef.current || testimonialCount === 0) return;
			setDirection(dir);
			isAnimatingRef.current = true;
			setIsAnimating(true);
			navigateTimerRef.current = setTimeout(() => {
				const count = testimonialCountRef.current;
				setActiveIndex((current) => {
					if (count === 0) return 0;
					return dir === "next" ? (current + 1) % count : (current - 1 + count) % count;
				});
				isAnimatingRef.current = false;
				setIsAnimating(false);
				navigateTimerRef.current = null;
			}, TRANSITION_DURATION);
		},
		[testimonialCount, testimonialCountRef]
	);

	// Reactive autoplay: restarts whenever autoplay, interval, or hover state changes
	useEffect(() => {
		if (!autoplay || isHovered || testimonialCount === 0) return;

		const timer = setInterval(() => navigate("next"), interval);
		return () => clearInterval(timer);
	}, [autoplay, isHovered, interval, testimonialCount, navigate]);

	// Cleanup navigate timeout on destroy
	useEffect(() => {
		return () => {
			if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
		};
	}, []);

	const activeTestimonial = testimonials.length > 0 ? testimonials[activeIndex] : null;

	return (
		<div
			className={cn(
				"relative mx-auto max-w-sm px-4 py-20 font-sans antialiased md:max-w-4xl md:px-8 lg:px-12",
				className
			)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			role="region"
			aria-label="Testimonials"
		>
			{testimonials.length === 0 ? (
				<p className="text-muted-foreground text-center">No testimonials available.</p>
			) : (
				<div className="relative grid grid-cols-1 gap-20 md:grid-cols-2">
					{/* Image column */}
					<div className="relative h-80 w-full">
						{testimonials.map((testimonial, index) => (
							<div
								key={index}
								className={cn(
									"absolute inset-0 h-full w-full origin-bottom rounded-3xl transition-all ease-in-out",
									index === activeIndex
										? "z-20 translate-y-0 scale-100 rotate-0 opacity-100"
										: "z-10 translate-y-4 scale-95 opacity-0",
									index !== activeIndex && direction === "next"
										? "-translate-y-4"
										: index !== activeIndex
											? "translate-y-4"
											: ""
								)}
								style={{ transitionDuration: `${TRANSITION_DURATION}ms` }}
							>
								<img
									src={testimonial.src}
									alt={testimonial.name}
									className="h-full w-full rounded-3xl object-cover object-center"
									draggable={false}
								/>
							</div>
						))}
					</div>

					{/* Content column */}
					<div className="flex flex-col justify-between py-4">
						<div
							className={cn(
								"ease-in-out",
								isAnimating
									? direction === "next"
										? "translate-y-4 opacity-0"
										: "-translate-y-4 opacity-0"
									: "translate-y-0 opacity-100"
							)}
							style={{
								transition: `opacity ${TRANSITION_DURATION}ms, transform ${TRANSITION_DURATION}ms`,
							}}
						>
							<p className="text-lg text-gray-500 dark:text-neutral-300" aria-live="polite">
								{activeTestimonial?.quote}
							</p>
							<div className="mt-8">
								<p className="text-base font-bold text-gray-900 dark:text-white">
									{activeTestimonial?.name}
								</p>
								<p className="text-sm text-gray-500 dark:text-neutral-400">
									{activeTestimonial?.designation}
								</p>
							</div>
						</div>

						{/* Navigation */}
						<div className="mt-8 flex gap-4">
							<button
								onClick={() => navigate("prev")}
								className="group/button flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
								aria-label="Previous testimonial"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="text-gray-800 transition-transform group-hover/button:-translate-x-0.5 dark:text-neutral-200"
								>
									<path d="m15 18-6-6 6-6" />
								</svg>
							</button>
							<button
								onClick={() => navigate("next")}
								className="group/button flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
								aria-label="Next testimonial"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="text-gray-800 transition-transform group-hover/button:translate-x-0.5 dark:text-neutral-200"
								>
									<path d="m9 18 6-6-6-6" />
								</svg>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
