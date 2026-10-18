import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import "./marquee.css";

export interface MarqueeProps {
	/** Additional CSS classes */
	className?: string;
	/** Reverse the scroll direction */
	reverse?: boolean;
	/** Ease the conveyor to a stop while the pointer (or focus) is inside */
	pauseOnHover?: boolean;
	/** Scroll vertically instead of horizontally */
	vertical?: boolean;
	/** Number of copies of the children rendered on the track */
	repeat?: number;
	/** Dissolve items at both edges with a gradient mask */
	fade?: boolean;
	/** Speed multiplier applied on top of `--duration` (2 = twice as fast) */
	speed?: number;
	/** Content to repeat and scroll */
	children?: ReactNode;
}

/** Time constant (ms) of the exponential ease on playbackRate. The rate
 * covers ~97% of the distance to its target in 3.5τ ≈ 500 ms, which reads
 * as a conveyor braking and pulling away rather than a hard freeze. */
const EASE_TAU = 140;
const SETTLE_EPSILON = 0.002;
const DEFAULT_DURATION_MS = 40_000;

function parseDuration(raw: string): number {
	const match = /^\s*([\d.]+)\s*(ms|s)\s*$/i.exec(raw);
	if (!match) return DEFAULT_DURATION_MS;
	const value = Number.parseFloat(match[1] ?? "");
	if (!Number.isFinite(value) || value <= 0) return DEFAULT_DURATION_MS;
	return (match[2] ?? "s").toLowerCase() === "ms" ? value : value * 1000;
}

/**
 * The per-instance conveyor state. Hover state and the eased factor live
 * outside React's render cycle: they change every frame and nothing in the
 * markup depends on them.
 */
interface Conveyor {
	speed: number;
	pauseOnHover: boolean;
	engaged: boolean;
	factor: number;
	animations: Animation[];
	rafId: number;
	lastTs: number;
	/** Where the previous set of animations stood when it was torn down, as a
	 * position along the loop (0–1, independent of direction and duration), so
	 * a rebuild (reverse / vertical / repeat / class toggled) neither snaps to
	 * zero nor mirrors when the direction flips. */
	resumeAt: number | null;
	applyRate(): void;
	wake(): void;
	setEngaged(next: boolean): void;
}

function createConveyor(): Conveyor {
	const c: Conveyor = {
		speed: 1,
		pauseOnHover: false,
		engaged: false,
		factor: 1,
		animations: [],
		rafId: 0,
		lastTs: 0,
		resumeAt: null,
		applyRate() {
			const rate = c.speed * c.factor;
			for (const animation of c.animations) animation.playbackRate = rate;
		},
		wake() {
			if (!c.animations.length || c.rafId) return;
			c.lastTs = 0;
			c.rafId = requestAnimationFrame(tick);
		},
		setEngaged(next: boolean) {
			c.engaged = next && c.pauseOnHover;
			c.wake();
		},
	};

	function tick(ts: number) {
		const dt = c.lastTs ? Math.min(ts - c.lastTs, 64) : 16;
		c.lastTs = ts;
		const target = c.engaged ? 0 : 1;
		c.factor += (target - c.factor) * (1 - Math.exp(-dt / EASE_TAU));
		if (Math.abs(target - c.factor) < SETTLE_EPSILON) c.factor = target;
		c.applyRate();
		if (c.factor === target) {
			// Settled: the loop sleeps until the next enter/leave.
			c.rafId = 0;
			c.lastTs = 0;
			return;
		}
		c.rafId = requestAnimationFrame(tick);
	}

	return c;
}

export function Marquee({
	className,
	reverse = false,
	pauseOnHover = false,
	vertical = false,
	repeat = 4,
	fade = true,
	speed = 1,
	children,
}: MarqueeProps) {
	const reduced = useReducedMotion();
	const rootRef = useRef<HTMLDivElement>(null);
	/** True once the tracks are driven by script-owned animations; the CSS
	 * keyframe is switched off at that point so the two never stack. */
	const [upgraded, setUpgraded] = useState(false);

	const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;

	const conveyorRef = useRef<Conveyor | null>(null);
	if (!conveyorRef.current) conveyorRef.current = createConveyor();
	const conveyor = conveyorRef.current;

	// A live `speed` change only needs the rate re-applied, not a rebuild.
	// Declared before the upgrade effect so a fresh build reads the current speed.
	useEffect(() => {
		conveyor.speed = safeSpeed;
		conveyor.applyRate();
	}, [conveyor, safeSpeed]);

	// Turning pauseOnHover off while hovered releases the brake.
	useEffect(() => {
		conveyor.pauseOnHover = pauseOnHover;
		if (!pauseOnHover && conveyor.engaged) conveyor.setEngaged(false);
	}, [conveyor, pauseOnHover]);

	// Upgrade the CSS conveyor to Web Animations so the speed can be eased.
	// Re-runs when direction, axis, copy count, class (a class swap may carry a
	// new --duration / --gap) or reduced-motion change.
	useEffect(() => {
		const el = rootRef.current;
		if (!el || reduced) return;
		if (typeof Element === "undefined" || typeof Element.prototype.animate !== "function") return;

		const styles = getComputedStyle(el);
		const duration = parseDuration(styles.getPropertyValue("--duration"));
		const gapPx = Number.parseFloat(vertical ? styles.rowGap : styles.columnGap) || 0;
		const axis = vertical ? "translateY" : "translateX";
		const keyframes: Keyframe[] = [
			{ transform: `${axis}(0)` },
			{ transform: `${axis}(calc(-100% - ${gapPx}px))` },
		];

		const tracks = Array.from(el.querySelectorAll<HTMLElement>(":scope > [data-marquee-track]"));
		// Pick up where the motion already is, so the hand-off is seamless: the
		// previous script animation if this is a rebuild, otherwise the CSS
		// keyframe (whose clock runs `speed` times faster than ours).
		let startTime = 0;
		if (conveyor.resumeAt !== null) {
			startTime = (reverse ? 1 - conveyor.resumeAt : conveyor.resumeAt) * duration;
		} else {
			const running = tracks[0]?.getAnimations?.()[0];
			if (running && typeof running.currentTime === "number") {
				startTime = running.currentTime * conveyor.speed;
			}
		}

		conveyor.animations = tracks
			.map((track) =>
				track.animate(keyframes, {
					duration,
					iterations: Infinity,
					easing: "linear",
					direction: reverse ? "reverse" : "normal",
				})
			)
			.filter(Boolean);
		for (const animation of conveyor.animations) animation.currentTime = startTime % duration;
		conveyor.applyRate();
		setUpgraded(true);
		if (conveyor.factor !== (conveyor.engaged ? 0 : 1)) conveyor.wake();

		return () => {
			if (conveyor.rafId) cancelAnimationFrame(conveyor.rafId);
			conveyor.rafId = 0;
			const t = conveyor.animations[0]?.currentTime;
			if (typeof t === "number") {
				const progress = (t % duration) / duration;
				conveyor.resumeAt = reverse ? 1 - progress : progress;
			} else {
				conveyor.resumeAt = null;
			}
			for (const animation of conveyor.animations) animation.cancel?.();
			conveyor.animations = [];
			setUpgraded(false);
		};
	}, [conveyor, vertical, reverse, repeat, className, reduced]);

	function onFocusOut(event: FocusEvent<HTMLDivElement>) {
		if (!rootRef.current?.contains(event.relatedTarget as Node | null)) conveyor.setEngaged(false);
	}

	return (
		<div
			ref={rootRef}
			className={cn(
				"marquee group flex [gap:var(--gap)] overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
				vertical ? "marquee-vertical flex-col" : "flex-row",
				fade && "marquee-fade",
				upgraded && "marquee-upgraded",
				className
			)}
			style={{ "--marquee-speed": safeSpeed } as CSSProperties}
			data-paused-on-hover={pauseOnHover ? "" : undefined}
			onPointerEnter={() => conveyor.setEngaged(true)}
			onPointerLeave={() => conveyor.setEngaged(false)}
			onFocus={() => conveyor.setEngaged(true)}
			onBlur={onFocusOut}
		>
			{Array.from({ length: repeat }, (_, index) => (
				<div
					key={index}
					data-marquee-track=""
					aria-hidden={index > 0 ? "true" : undefined}
					className={cn(
						"flex shrink-0 justify-around [gap:var(--gap)]",
						vertical ? "animate-marquee-vertical flex-col" : "animate-marquee flex-row",
						pauseOnHover ? "group-hover:[animation-play-state:paused]" : ""
					)}
					style={{ animationDirection: reverse ? "reverse" : "normal" } as CSSProperties}
				>
					{children}
				</div>
			))}
		</div>
	);
}
