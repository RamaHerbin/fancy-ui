import { useEffect, useRef } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";

import { cn } from "../../utils.js";
import "./glare-card.css";

export interface GlareCardProps {
	/** Additional CSS classes for the card content wrapper. */
	className?: string;
	/** Card content. */
	children?: ReactNode;
}

interface Point {
	x: number;
	y: number;
}

/**
 * The full inline custom-property string, rebuilt wholesale on every pointer
 * move and on pointer leave — mirroring the Svelte source, where the style
 * attribute is a single derived string re-rendered whenever glare/rotate/
 * background state changes (which also clobbers the enter-timeout's
 * `--duration: 0s` override on the next move, exactly as the source does).
 */
function cssVars(glare: Point, rotate: Point, background: Point): string {
	return `--m-x:${glare.x}%;--m-y:${glare.y}%;--r-x:${rotate.x}deg;--r-y:${rotate.y}deg;--bg-x:${background.x}%;--bg-y:${background.y}%;--duration:300ms;--foil-size:100%;--opacity:0;--radius:48px;--easing:ease;--transition:var(--duration) var(--easing);`;
}

const initialStyle = {
	"--m-x": "50%",
	"--m-y": "50%",
	"--r-x": "0deg",
	"--r-y": "0deg",
	"--bg-x": "50%",
	"--bg-y": "50%",
	"--duration": "300ms",
	"--foil-size": "100%",
	"--opacity": "0",
	"--radius": "48px",
	"--easing": "ease",
	"--transition": "var(--duration) var(--easing)",
} as CSSProperties;

export function GlareCard({ className = "", children }: GlareCardProps) {
	const refElement = useRef<HTMLDivElement | null>(null);
	const isPointerInside = useRef(false);
	const timeoutId = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	// Per-frame values that only drive the style attribute — never state.
	const glare = useRef<Point>({ x: 50, y: 50 });
	const background = useRef<Point>({ x: 50, y: 50 });
	const rotate = useRef<Point>({ x: 0, y: 0 });

	useEffect(() => {
		return () => {
			if (timeoutId.current) clearTimeout(timeoutId.current);
		};
	}, []);

	function writeVars() {
		refElement.current?.setAttribute(
			"style",
			cssVars(glare.current, rotate.current, background.current)
		);
	}

	function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
		const rotateFactor = 0.4;
		const rect = refElement.current?.getBoundingClientRect();
		if (rect) {
			const position = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
			};
			const percentage = {
				x: (100 / rect.width) * position.x,
				y: (100 / rect.height) * position.y,
			};
			const delta = {
				x: percentage.x - 50,
				y: percentage.y - 50,
			};
			background.current.x = 50 + percentage.x / 4 - 12.5;
			background.current.y = 50 + percentage.y / 3 - 16.67;
			rotate.current.x = -(delta.x / 3.5) * rotateFactor;
			rotate.current.y = (delta.y / 2) * rotateFactor;
			glare.current.x = percentage.x;
			glare.current.y = percentage.y;
			writeVars();
		}
	}

	function handlePointerEnter() {
		isPointerInside.current = true;
		if (timeoutId.current) clearTimeout(timeoutId.current);
		timeoutId.current = setTimeout(() => {
			if (isPointerInside.current && refElement.current) {
				refElement.current.style.setProperty("--duration", "0s");
			}
		}, 300);
	}

	function handlePointerLeave() {
		isPointerInside.current = false;
		if (timeoutId.current) clearTimeout(timeoutId.current);
		if (refElement.current) {
			refElement.current.style.removeProperty("--duration");
			rotate.current = { x: 0, y: 0 };
			writeVars();
		}
	}

	return (
		<div
			ref={refElement}
			className="glare-container relative isolate [aspect-ratio:17/21] w-[320px] transition-transform delay-[var(--delay)] duration-[var(--duration)] ease-[var(--easing)] will-change-transform [contain:layout_style] [perspective:600px]"
			style={initialStyle}
			onPointerMove={handlePointerMove}
			onPointerEnter={handlePointerEnter}
			onPointerLeave={handlePointerLeave}
		>
			<div className="grid h-full origin-center [transform:rotateY(var(--r-x))_rotateX(var(--r-y))] overflow-hidden rounded-lg border border-slate-800 transition-transform delay-[var(--delay)] duration-[var(--duration)] ease-[var(--easing)] will-change-transform hover:filter-none hover:[--duration:200ms] hover:[--easing:linear] hover:[--opacity:0.6]">
				<div className="grid size-full mix-blend-soft-light [clip-path:inset(0_0_0_0_round_var(--radius))] [grid-area:1/1]">
					<div className={cn("size-full bg-slate-950", className)}>{children}</div>
				</div>
				<div className="will-change-background grid size-full opacity-[var(--opacity)] mix-blend-soft-light transition-opacity delay-[var(--delay)] duration-[var(--duration)] ease-[var(--easing)] [background:radial-gradient(farthest-corner_circle_at_var(--m-x)_var(--m-y),_rgba(255,255,255,0.8)_10%,_rgba(255,255,255,0.65)_20%,_rgba(255,255,255,0)_90%)] [clip-path:inset(0_0_1px_0_round_var(--radius))] [grid-area:1/1]"></div>
				<div className="glare-foil relative grid size-full opacity-[var(--opacity)] [background-blend-mode:hue_hue_hue_overlay] mix-blend-color-dodge transition-opacity will-change-[background] [background:var(--pattern),_var(--rainbow),_var(--diagonal),_var(--shade)] [clip-path:inset(0_0_1px_0_round_var(--radius))] [grid-area:1/1] after:bg-[inherit] after:[background-size:var(--foil-size),_200%_400%,_800%,_200%] after:[background-position:center,_0%_var(--bg-y),_calc(var(--bg-x)*_-1)_calc(var(--bg-y)*_-1),_var(--bg-x)_var(--bg-y)] after:[background-blend-mode:soft-light,_hue,_hard-light] after:mix-blend-exclusion after:content-[''] after:[grid-area:1/1]"></div>
			</div>
		</div>
	);
}
