<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";

	interface Props {
		class?: string;
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
		children?: import("svelte").Snippet;
	}

	let {
		class: className,
		reverse = false,
		pauseOnHover = false,
		vertical = false,
		repeat = 4,
		fade = true,
		speed = 1,
		children,
	}: Props = $props();

	/** Time constant (ms) of the exponential ease on playbackRate. The rate
	 * covers ~97% of the distance to its target in 3.5τ ≈ 500 ms, which reads
	 * as a conveyor braking and pulling away rather than a hard freeze. */
	const EASE_TAU = 140;
	const SETTLE_EPSILON = 0.002;
	const DEFAULT_DURATION_MS = 40_000;

	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	let root: HTMLDivElement | undefined = $state();
	/** True once the tracks are driven by script-owned animations; the CSS
	 * keyframe is switched off at that point so the two never stack. */
	let upgraded = $state(false);

	const safeSpeed = $derived(Number.isFinite(speed) && speed > 0 ? speed : 1);

	// Hover state and the eased factor live outside the reactive graph: they
	// change every frame and nothing in the markup depends on them.
	let engaged = false;
	let factor = 1;
	let animations: Animation[] = [];
	let rafId = 0;
	let lastTs = 0;
	/** Where the previous set of animations stood when it was torn down, as a
	 * position along the loop (0–1, independent of direction and duration), so
	 * a rebuild (reverse / vertical / repeat / class toggled) neither snaps to
	 * zero nor mirrors when the direction flips. */
	let resumeAt: number | null = null;

	function parseDuration(raw: string): number {
		const match = /^\s*([\d.]+)\s*(ms|s)\s*$/i.exec(raw);
		if (!match) return DEFAULT_DURATION_MS;
		const value = Number.parseFloat(match[1]);
		if (!Number.isFinite(value) || value <= 0) return DEFAULT_DURATION_MS;
		return match[2].toLowerCase() === "ms" ? value : value * 1000;
	}

	function applyRate() {
		const rate = safeSpeed * factor;
		for (const animation of animations) animation.playbackRate = rate;
	}

	function tick(ts: number) {
		const dt = lastTs ? Math.min(ts - lastTs, 64) : 16;
		lastTs = ts;
		const target = engaged ? 0 : 1;
		factor += (target - factor) * (1 - Math.exp(-dt / EASE_TAU));
		if (Math.abs(target - factor) < SETTLE_EPSILON) factor = target;
		applyRate();
		if (factor === target) {
			// Settled: the loop sleeps until the next enter/leave.
			rafId = 0;
			lastTs = 0;
			return;
		}
		rafId = requestAnimationFrame(tick);
	}

	function wake() {
		if (!animations.length || rafId) return;
		lastTs = 0;
		rafId = requestAnimationFrame(tick);
	}

	function setEngaged(next: boolean) {
		engaged = next && pauseOnHover;
		wake();
	}

	function onFocusOut(event: FocusEvent) {
		if (!root?.contains(event.relatedTarget as Node | null)) setEngaged(false);
	}

	// Upgrade the CSS conveyor to Web Animations so the speed can be eased.
	// Re-runs when direction, axis, copy count or reduced-motion change.
	$effect(() => {
		const el = root;
		const isVertical = vertical;
		const isReverse = reverse;
		void repeat;
		void className; // a class swap may carry a new --duration / --gap
		if (!el || reduced.current) return;
		if (typeof Element === "undefined" || typeof Element.prototype.animate !== "function") return;

		const styles = getComputedStyle(el);
		const duration = parseDuration(styles.getPropertyValue("--duration"));
		const gapPx = Number.parseFloat(isVertical ? styles.rowGap : styles.columnGap) || 0;
		const axis = isVertical ? "translateY" : "translateX";
		const keyframes: Keyframe[] = [
			{ transform: `${axis}(0)` },
			{ transform: `${axis}(calc(-100% - ${gapPx}px))` },
		];

		const tracks = Array.from(el.querySelectorAll<HTMLElement>(":scope > [data-marquee-track]"));
		// Pick up where the motion already is, so the hand-off is seamless: the
		// previous script animation if this is a rebuild, otherwise the CSS
		// keyframe (whose clock runs `speed` times faster than ours).
		let startTime = 0;
		if (resumeAt !== null) {
			startTime = (isReverse ? 1 - resumeAt : resumeAt) * duration;
		} else {
			const running = tracks[0]?.getAnimations?.()[0];
			if (running && typeof running.currentTime === "number") {
				startTime = running.currentTime * untrack(() => safeSpeed);
			}
		}

		animations = tracks
			.map((track) =>
				track.animate(keyframes, {
					duration,
					iterations: Infinity,
					easing: "linear",
					direction: isReverse ? "reverse" : "normal",
				})
			)
			.filter(Boolean);
		for (const animation of animations) animation.currentTime = startTime % duration;
		untrack(applyRate);
		upgraded = true;
		if (factor !== (engaged ? 0 : 1)) wake();

		return () => {
			if (rafId) cancelAnimationFrame(rafId);
			rafId = 0;
			const t = animations[0]?.currentTime;
			if (typeof t === "number") {
				const progress = (t % duration) / duration;
				resumeAt = isReverse ? 1 - progress : progress;
			} else {
				resumeAt = null;
			}
			for (const animation of animations) animation.cancel?.();
			animations = [];
			upgraded = false;
		};
	});

	// A live `speed` change only needs the rate re-applied, not a rebuild.
	$effect(() => {
		void safeSpeed;
		applyRate();
	});

	// Turning pauseOnHover off while hovered releases the brake.
	$effect(() => {
		if (!pauseOnHover && engaged) setEngaged(false);
	});
</script>

<div
	bind:this={root}
	class={cn(
		"marquee group flex [gap:var(--gap)] overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
		vertical ? "marquee-vertical flex-col" : "flex-row",
		fade && "marquee-fade",
		upgraded && "marquee-upgraded",
		className
	)}
	style="--marquee-speed: {safeSpeed};"
	data-paused-on-hover={pauseOnHover ? "" : undefined}
	onpointerenter={() => setEngaged(true)}
	onpointerleave={() => setEngaged(false)}
	onfocusin={() => setEngaged(true)}
	onfocusout={onFocusOut}
>
	{#each Array(repeat) as _, index (index)}
		<div
			data-marquee-track
			aria-hidden={index > 0 ? "true" : undefined}
			class={cn(
				"flex shrink-0 justify-around [gap:var(--gap)]",
				vertical ? "animate-marquee-vertical flex-col" : "animate-marquee flex-row",
				pauseOnHover ? "group-hover:[animation-play-state:paused]" : ""
			)}
			style="animation-direction: {reverse ? 'reverse' : 'normal'};"
		>
			{@render children?.()}
		</div>
	{/each}
</div>

<style>
	.animate-marquee {
		animation: marquee calc(var(--duration) / var(--marquee-speed, 1)) linear infinite;
		will-change: transform;
	}

	.animate-marquee-vertical {
		animation: marquee-vertical calc(var(--duration) / var(--marquee-speed, 1)) linear infinite;
		will-change: transform;
	}

	/* Script-owned animations have taken over: silence the CSS keyframe so the
	   track is not moved twice. */
	.marquee-upgraded > .animate-marquee,
	.marquee-upgraded > .animate-marquee-vertical {
		animation: none;
	}

	/* Edge fades: an eased (not linear) alpha ramp, so items dissolve into the
	   edge instead of hitting a visible line. Width via --marquee-fade. */
	.marquee-fade {
		--_fade: var(--marquee-fade, 12%);
		--_mask: linear-gradient(
			to right,
			transparent,
			rgb(0 0 0 / 0.1) calc(var(--_fade) * 0.25),
			rgb(0 0 0 / 0.4) calc(var(--_fade) * 0.5),
			rgb(0 0 0 / 0.8) calc(var(--_fade) * 0.75),
			#000 var(--_fade),
			#000 calc(100% - var(--_fade)),
			rgb(0 0 0 / 0.8) calc(100% - var(--_fade) * 0.75),
			rgb(0 0 0 / 0.4) calc(100% - var(--_fade) * 0.5),
			rgb(0 0 0 / 0.1) calc(100% - var(--_fade) * 0.25),
			transparent
		);
		-webkit-mask-image: var(--_mask);
		mask-image: var(--_mask);
	}

	.marquee-fade.marquee-vertical {
		--_mask: linear-gradient(
			to bottom,
			transparent,
			rgb(0 0 0 / 0.1) calc(var(--_fade) * 0.25),
			rgb(0 0 0 / 0.4) calc(var(--_fade) * 0.5),
			rgb(0 0 0 / 0.8) calc(var(--_fade) * 0.75),
			#000 var(--_fade),
			#000 calc(100% - var(--_fade)),
			rgb(0 0 0 / 0.8) calc(100% - var(--_fade) * 0.75),
			rgb(0 0 0 / 0.4) calc(100% - var(--_fade) * 0.5),
			rgb(0 0 0 / 0.1) calc(100% - var(--_fade) * 0.25),
			transparent
		);
	}

	@keyframes marquee {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(calc(-100% - var(--gap)));
		}
	}

	@keyframes marquee-vertical {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(calc(-100% - var(--gap)));
		}
	}

	/* Reduced motion: a still row with the same composition — edge fades stay. */
	@media (prefers-reduced-motion: reduce) {
		.animate-marquee,
		.animate-marquee-vertical {
			animation: none;
			will-change: auto;
		}
	}
</style>
