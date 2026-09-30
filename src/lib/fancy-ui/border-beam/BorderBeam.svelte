<script lang="ts" module>
	/**
	 * BorderBeam - a single comet of light riding a container's border
	 *
	 * A white-hot head leads a long, feathered tail that fades from `colorFrom`
	 * to `colorTo` to nothing. The hairline under it stays dim except within
	 * the comet's reach, a soft bloom sits on the edge, and a faint spill of
	 * light falls just inside the container.
	 *
	 * Place it as the last child of a container with `position: relative`
	 * (and usually `overflow: hidden`). It inherits the container's
	 * `border-radius`; set `--border-beam-radius` if the path needs a radius
	 * the browser cannot read from the box itself.
	 */
	export interface BorderBeamProps {
		/** Additional CSS classes */
		class?: string;
		/** Diameter of the pool of light around the comet's head, in pixels */
		size?: number;
		/** Time for one full lap of the border, in seconds */
		duration?: number;
		/** Border width in pixels */
		borderWidth?: number;
		/**
		 * Where along the border the comet starts, as a percentage of the
		 * perimeter (0-100, clockwise from the top-left corner). With reduced
		 * motion, this is where it rests.
		 */
		anchor?: number;
		/** Colour of the comet's head and the start of its tail */
		colorFrom?: string;
		/** Colour the tail fades into */
		colorTo?: string;
		/**
		 * Delay in seconds. The comet runs from the first frame, already
		 * `delay` seconds behind where it would otherwise be, so stacked beams
		 * spread out along the border.
		 */
		delay?: number;
		/** Length of the tail as a share of the perimeter (0-1) */
		tail?: number;
		/** Strength of the bloom and the inner spill of light (0-1) */
		glow?: number;
		/** Travel counter-clockwise instead of clockwise */
		reverse?: boolean;
	}

	/** Number of overlapping pieces the sharp tail is drawn with. More pieces
	 * bend around the corners more smoothly. */
	export const TAIL_SEGMENTS = 18;
	/** The blurred bloom is forgiving: fewer, longer pieces are enough. */
	export const BLOOM_SEGMENTS = 8;

	export interface TailSegment {
		/** Position along the tail, 0 = right behind the head, 1 = tail end */
		t: number;
		/** Opacity of this piece */
		alpha: number;
		/** Thickness factor (1 at the head, tapering towards the end) */
		thickness: number;
	}

	/** Evenly spaced pieces with an eased fade and a tapering thickness. */
	export function tailSegments(count: number): TailSegment[] {
		return Array.from({ length: count }, (_, i) => {
			const t = (i + 0.5) / count;
			return {
				t: Number(t.toFixed(4)),
				alpha: Number(Math.pow(1 - t, 1.6).toFixed(4)),
				thickness: Number((1 - 0.7 * t).toFixed(4)),
			};
		});
	}

	function clamp01(n: number): number {
		return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
	}

	/**
	 * Turn `delay` into a phase: how far into its lap the comet is at first
	 * paint (a negative `animation-delay`), and where it rests when motion is
	 * reduced (a percentage of the perimeter).
	 */
	export function beamPhase(
		duration: number,
		delay: number,
		anchor: number,
		reverse: boolean
	): { offset: number; park: number } {
		const d = duration > 0 ? duration : 1;
		const lag = ((delay % d) + d) % d;
		const offset = lag === 0 ? 0 : -(d - lag);
		const dir = reverse ? -1 : 1;
		const park = anchor - (dir * lag * 100) / d;
		return { offset: Number(offset.toFixed(4)), park: Number(park.toFixed(4)) };
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		size = 200,
		duration = 9,
		borderWidth = 1.5,
		anchor = 90,
		colorFrom = "#8ec5ff",
		colorTo = "#c084fc",
		delay = 0,
		tail = 0.25,
		glow = 0.6,
		reverse = false,
	}: BorderBeamProps = $props();

	const tailPieces = tailSegments(TAIL_SEGMENTS);
	const bloomPieces = tailSegments(BLOOM_SEGMENTS);

	const phase = $derived(beamPhase(duration, delay, anchor, reverse));

	const style = $derived(
		[
			`--border-beam-size: ${size}`,
			`--border-beam-duration: ${duration}s`,
			`--border-beam-anchor: ${anchor}`,
			`--border-beam-border-width: ${borderWidth}`,
			`--border-beam-color-from: ${colorFrom}`,
			`--border-beam-color-to: ${colorTo}`,
			`--border-beam-delay: ${delay}s`,
			`--border-beam-tail: ${clamp01(tail)}`,
			`--border-beam-glow: ${clamp01(glow)}`,
			`--border-beam-offset: ${phase.offset}s`,
			`--border-beam-park: ${phase.park}%`,
			`--border-beam-dir: ${reverse ? -1 : 1}`,
		].join(";")
	);

	function piece(p: TailSegment, count: number): string {
		return `--bb-t: ${p.t}; --bb-alpha: ${p.alpha}; --bb-thick: ${p.thickness}; --bb-count: ${count}`;
	}
</script>

<div
	class={cn("border-beam", "pointer-events-none absolute inset-0 rounded-[inherit]", className)}
	data-direction={reverse ? "reverse" : "forward"}
	aria-hidden="true"
	{style}
>
	<!-- faint light falling just inside the edge, clipped to the container -->
	<div class="bb-spill-clip">
		<span class="bb-ride bb-spill"></span>
	</div>

	<!-- the bloom: a blurred copy of the comet straddling the edge -->
	<div class="bb-bloom">
		{#each bloomPieces as p (p.t)}
			<span class="bb-ride bb-piece bb-bloom-piece" style={piece(p, BLOOM_SEGMENTS)}></span>
		{/each}
		<span class="bb-ride bb-bloom-head"></span>
	</div>

	<!-- the halo: a tight glow hugging the lit hairline -->
	<div class="bb-halo">
		{#each bloomPieces as p (p.t)}
			<span class="bb-ride bb-piece bb-halo-piece" style={piece(p, BLOOM_SEGMENTS)}></span>
		{/each}
	</div>

	<!-- the hairline: dim, lit only within the comet's reach -->
	<div class="bb-ring">
		<span class="bb-rail"></span>
		<span class="bb-ride bb-reach"></span>
		{#each tailPieces as p (p.t)}
			<span class="bb-ride bb-piece bb-tail-piece" style={piece(p, TAIL_SEGMENTS)}></span>
		{/each}
		<span class="bb-ride bb-head"></span>
	</div>

	<!-- the white-hot point of the head, sitting on the edge -->
	<span class="bb-ride bb-spark"></span>
</div>

<style>
	.border-beam {
		/* private plumbing: every value reads a public var with a fallback */
		--_from: var(--border-beam-color-from, #8ec5ff);
		--_to: var(--border-beam-color-to, #c084fc);
		--_bw: calc(var(--border-beam-border-width, 1.5) * 1px);
		--_size: calc(var(--border-beam-size, 200) * 1px);
		--_dur: var(--border-beam-duration, 9s);
		--_tail: var(--border-beam-tail, 0.25);
		--_glow: var(--border-beam-glow, 0.6);
		--_offset: var(--border-beam-offset, 0s);
		--_start: calc(var(--border-beam-anchor, 90) * 1%);
		--_park: var(--border-beam-park, 90%);
		--_dir: var(--border-beam-dir, 1);
		--_radius: var(--border-beam-radius, 12px);
		/* perimeter of the box, read through container units */
		--_perimeter: calc(2 * (100cqw + 100cqh));

		/* light theme: inks a touch deeper, head warm rather than white, quieter bloom */
		--_ink-from: color-mix(in oklab, var(--_from) 76%, #0b0b0c);
		--_ink-to: color-mix(in oklab, var(--_to) 76%, #0b0b0c);
		--_hot: color-mix(in oklab, var(--_from) 80%, white);
		--_core: color-mix(in oklab, var(--_ink-from) 70%, white);
		--_rail: color-mix(in oklab, var(--_ink-from) 6%, transparent);
		--_bloom-max: 0.7;
		--_halo-max: 0.7;
		--_spill-max: 0.16;

		container-type: size;
		isolation: isolate;
	}

	:global(.dark) .border-beam {
		--_ink-from: var(--_from);
		--_ink-to: var(--_to);
		--_hot: color-mix(in oklab, var(--_from) 40%, white);
		--_core: white;
		--_rail: color-mix(in oklab, var(--_from) 7%, transparent);
		--_bloom-max: 1;
		--_halo-max: 0.85;
		--_spill-max: 0.24;
	}

	.border-beam > *,
	.bb-ring > *,
	.bb-bloom > *,
	.bb-halo > *,
	.bb-spill-clip > * {
		position: absolute;
		pointer-events: none;
	}

	.bb-spill-clip,
	.bb-bloom,
	.bb-halo,
	.bb-ring,
	.bb-rail {
		inset: 0;
		border-radius: inherit;
	}

	/* ---------- riders: everything that travels the border ---------- */

	.bb-ride {
		top: 0;
		left: 0;
		/* fallback path first, then the box itself with its real radius */
		offset-path: rect(0 auto auto 0 round var(--_radius));
		offset-path: border-box;
		offset-rotate: auto;
		offset-anchor: 50% 50%;
		/* rest pose (reduced motion): parked at the anchor, tail laid out behind */
		offset-distance: calc(var(--_park) - var(--_dir) * var(--_lag, 0) * 100%);
		--_lag: 0;
	}

	.border-beam[data-direction="reverse"] .bb-ride {
		offset-rotate: reverse;
	}

	.bb-piece {
		--_lag: calc(var(--_tail) * var(--bb-t));
		/* pieces overlap twice over so the tail reads as one stroke */
		width: calc(var(--_perimeter) * var(--_tail) / var(--bb-count) * 2.2);
	}

	/* ---------- the sharp comet on the hairline ---------- */

	.bb-ring {
		padding: var(--_bw);
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
	}

	.bb-rail {
		position: absolute;
		background: var(--_rail);
	}

	.bb-reach {
		width: var(--_size);
		height: var(--_size);
		border-radius: 50%;
		background: radial-gradient(
			closest-side,
			color-mix(in oklab, var(--_hot) 70%, transparent),
			color-mix(in oklab, var(--_ink-from) 40%, transparent) 45%,
			transparent
		);
		opacity: 0.7;
	}

	.bb-tail-piece {
		height: calc(var(--_bw) * 2 + 4px);
		opacity: var(--bb-alpha);
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in oklab, var(--_ink-from) calc((1 - var(--bb-t)) * 100%), var(--_ink-to)) 30%,
			color-mix(in oklab, var(--_ink-from) calc((1 - var(--bb-t)) * 100%), var(--_ink-to)) 70%,
			transparent
		);
	}

	.bb-head {
		width: 44px;
		height: calc(var(--_bw) * 2 + 4px);
		offset-anchor: 100% 50%;
		background: linear-gradient(
			90deg,
			transparent,
			var(--_ink-from) 45%,
			var(--_hot) 85%,
			var(--_core)
		);
	}

	/* ---------- bloom: the comet again, thicker and blurred ---------- */

	.bb-bloom {
		filter: blur(11px);
		opacity: calc(var(--_glow) * var(--_bloom-max));
	}

	.bb-bloom-piece {
		height: calc(var(--_bw) + 16px * var(--bb-thick));
		opacity: var(--bb-alpha);
		border-radius: 999px;
		background: color-mix(
			in oklab,
			var(--_ink-from) calc((1 - var(--bb-t)) * 100%),
			var(--_ink-to)
		);
	}

	.bb-bloom-head {
		width: 56px;
		height: 22px;
		offset-anchor: 85% 50%;
		border-radius: 50%;
		background: radial-gradient(closest-side, var(--_hot), var(--_ink-from) 60%, transparent);
	}

	/* ---------- halo: a thin, lightly blurred glow right on the line ---------- */

	.bb-halo {
		filter: blur(2.5px);
		opacity: calc(var(--_glow) * var(--_halo-max));
	}

	.bb-halo-piece {
		height: calc(var(--_bw) + 5px * var(--bb-thick));
		opacity: var(--bb-alpha);
		border-radius: 999px;
		background: color-mix(
			in oklab,
			var(--_ink-from) calc((1 - var(--bb-t)) * 100%),
			var(--_ink-to)
		);
	}

	/* ---------- inner spill: a wide, faint pool clipped to the inside ---------- */

	.bb-spill-clip {
		overflow: hidden;
	}

	.bb-spill {
		width: calc(var(--_size) * 1.3);
		height: calc(var(--_size) * 1.3);
		border-radius: 50%;
		background: radial-gradient(
			closest-side,
			color-mix(in oklab, var(--_ink-from) 70%, transparent),
			color-mix(in oklab, var(--_ink-to) 25%, transparent) 50%,
			transparent
		);
		opacity: calc(var(--_glow) * var(--_spill-max));
	}

	/* ---------- the spark: a tiny white-hot point on the edge ---------- */

	.bb-spark {
		width: calc(var(--_bw) * 2 + 8px);
		height: calc(var(--_bw) * 2 + 8px);
		border-radius: 50%;
		background: radial-gradient(
			closest-side,
			var(--_core),
			var(--_hot) 30%,
			color-mix(in oklab, var(--_hot) 35%, transparent) 62%,
			transparent
		);
	}

	/* ---------- motion ---------- */

	@media (prefers-reduced-motion: no-preference) {
		.border-beam {
			/* arrival: the comet fades in over the entrance duration, up to the root's own
			   opacity (no `to` keyframe, no forwards fill), so an opacity class still applies */
			animation: bb-ignite var(--ft-duration-entrance, 600ms)
				var(--ft-ease-out, cubic-bezier(0.16, 1, 0.3, 1)) backwards;
		}

		.bb-ride {
			animation: bb-travel var(--_dur) linear infinite;
			/* a piece `lag` turns behind the head is started one lap early, minus its lag,
			   so it is already running on the first frame */
			animation-delay: calc(var(--_offset) - (1 - var(--_lag)) * var(--_dur));
		}

		.border-beam[data-direction="reverse"] .bb-ride {
			animation-direction: reverse;
		}
	}

	@keyframes bb-travel {
		from {
			offset-distance: var(--_start);
		}
		to {
			offset-distance: calc(var(--_start) + 100%);
		}
	}

	@keyframes bb-ignite {
		from {
			opacity: 0;
		}
	}
</style>
