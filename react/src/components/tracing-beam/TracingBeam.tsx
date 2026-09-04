import { useRef, useState, type ReactNode } from "react";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useFancyId } from "../../internals/use-id.js";
import { cn } from "../../utils.js";

export interface TracingBeamProps {
	/** Additional CSS classes */
	className?: string;
	/** Content the beam traces alongside */
	children?: ReactNode;
}

function mapRange(
	value: number,
	inMin: number,
	inMax: number,
	outMin: number,
	outMax: number
): number {
	return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * TracingBeam - Vertical SVG beam that highlights scroll progress alongside content.
 */
export function TracingBeam({ className = "", children }: TracingBeamProps) {
	const tracingBeamRef = useRef<HTMLDivElement | null>(null);
	const contentRef = useRef<HTMLDivElement | null>(null);
	const gradientRef = useRef<SVGLinearGradientElement | null>(null);

	// One gradient per instance: the stroke references it by functional IRI, so a
	// shared literal id would make every beam after the first paint the first
	// beam's spring.
	const gradientId = useFancyId("tracing-beam-gradient");

	// State that re-renders markup (circle classes/shadow, svg path, viewBox) —
	// mirrors the Svelte component's $state driving template expressions.
	const [svgHeight, setSvgHeight] = useState(0);
	// The raw scroll progress is a fresh float on every scroll event and feeds
	// nothing but the three circle expressions below, so only the threshold it
	// crosses reaches React; the value itself stays in the ref.
	const [beamStarted, setBeamStarted] = useState(false);

	// Mutable animation state — per-frame spring values never round-trip through
	// React state; the rAF loop writes the gradient's y1/y2 attributes directly.
	const stateRef = useRef({
		svgHeight: 0,
		scrollYProgress: 0,
		scrollPercentage: 0,
		springY1: 0,
		springY2: 0,
		springVelY1: 0,
		springVelY2: 0,
		rafId: 0,
	});

	useIsomorphicLayoutEffect(() => {
		const s = stateRef.current;

		function targetY1(): number {
			return (
				mapRange(s.scrollYProgress, 0, 0.8, s.scrollYProgress, s.svgHeight) *
				(1.4 - s.scrollPercentage)
			);
		}

		function targetY2(): number {
			return (
				mapRange(s.scrollYProgress, 0, 1, s.scrollYProgress, s.svgHeight - 500) *
				(1.4 - s.scrollPercentage)
			);
		}

		function applySpring() {
			const gradient = gradientRef.current;
			if (gradient) {
				gradient.setAttribute("y1", String(s.springY1));
				gradient.setAttribute("y2", String(s.springY2));
			}
		}

		function updateSpring() {
			const tension = 80;
			const friction = 26;
			const precision = 0.01;

			const tY1 = targetY1();
			const tY2 = targetY2();

			const forceY1 = tension * (tY1 - s.springY1);
			s.springVelY1 = (s.springVelY1 + forceY1 * 0.001) * (1 - friction * 0.001);
			s.springY1 += s.springVelY1;

			const forceY2 = tension * (tY2 - s.springY2);
			s.springVelY2 = (s.springVelY2 + forceY2 * 0.001) * (1 - friction * 0.001);
			s.springY2 += s.springVelY2;

			applySpring();

			const settled =
				Math.abs(s.springVelY1) < precision &&
				Math.abs(tY1 - s.springY1) < precision &&
				Math.abs(s.springVelY2) < precision &&
				Math.abs(tY2 - s.springY2) < precision;

			if (!settled) {
				s.rafId = requestAnimationFrame(updateSpring);
			}
		}

		function updateScrollProgress() {
			const el = tracingBeamRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const windowHeight = window.innerHeight;
			const elementHeight = rect.height;

			s.scrollPercentage = (windowHeight - rect.top) / (windowHeight + elementHeight);
			s.scrollYProgress = (rect.y / windowHeight) * -1;
			setBeamStarted(s.scrollYProgress > 0);

			cancelAnimationFrame(s.rafId);
			s.rafId = requestAnimationFrame(updateSpring);
		}

		function updateSVGHeight() {
			const el = contentRef.current;
			if (!el) return;
			s.svgHeight = el.offsetHeight;
			setSvgHeight(s.svgHeight);
		}

		window.addEventListener("scroll", updateScrollProgress, { passive: true });
		window.addEventListener("resize", updateScrollProgress, { passive: true });
		updateScrollProgress();

		const resizeObserver = new ResizeObserver(updateSVGHeight);
		if (contentRef.current) {
			resizeObserver.observe(contentRef.current);
		}
		updateSVGHeight();

		return () => {
			cancelAnimationFrame(s.rafId);
			window.removeEventListener("scroll", updateScrollProgress);
			window.removeEventListener("resize", updateScrollProgress);
			resizeObserver.disconnect();
		};
	}, []);

	const circleHasShadow = !beamStarted;
	const circleBg = beamStarted ? "bg-white" : "bg-emerald-500";
	const circleBorder = beamStarted ? "border-neutral-300" : "border-emerald-600";
	const svgPath = `M 1 0V -36 l 18 24 V ${svgHeight * 0.8} l -18 24V ${svgHeight}`;

	return (
		<div
			ref={tracingBeamRef}
			className={cn("relative mx-auto h-full w-full max-w-4xl", className)}
		>
			<div className="absolute top-3 -left-4 md:-left-12">
				<div
					className="ml-[27px] flex size-4 items-center justify-center rounded-full border border-neutral-200 shadow-sm"
					style={{
						boxShadow: circleHasShadow ? "rgba(0, 0, 0, 0.24) 0px 3px 8px" : "none",
					}}
				>
					<div className={cn("size-2 rounded-full border", circleBg, circleBorder)}></div>
				</div>
				<svg
					viewBox={`0 0 20 ${svgHeight}`}
					width="20"
					height={svgHeight}
					className="ml-4 block"
					aria-hidden="true"
				>
					<path d={svgPath} fill="none" stroke="#9091A0" strokeOpacity="0.16"></path>
					<path
						d={svgPath}
						fill="none"
						stroke={`url(#${gradientId})`}
						strokeWidth="1.25"
						className="motion-reduce:hidden"
					></path>
					<defs>
						<linearGradient
							ref={gradientRef}
							id={gradientId}
							gradientUnits="userSpaceOnUse"
							x1="0"
							x2="0"
							y1={0}
							y2={0}
						>
							<stop stopColor="#18CCFC" stopOpacity="0"></stop>
							<stop stopColor="#18CCFC"></stop>
							<stop offset="0.325" stopColor="#6344F5"></stop>
							<stop offset="1" stopColor="#AE48FF" stopOpacity="0"></stop>
						</linearGradient>
					</defs>
				</svg>
			</div>
			<div ref={contentRef}>{children}</div>
		</div>
	);
}
