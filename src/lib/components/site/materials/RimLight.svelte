<!--
	RimLight — the site's glow primitive: a seeded multi-hue arc of light on a
	surface's rim, bleeding inward.

	Why a site primitive and not a library component: the library's glows each
	answer a different brief. PulseBeam paints breathing blobs around the whole
	box; GlowBorder is a full liquid-metal ring that never rests; BorderBeam is a
	two-colour comet riding the border. The site needs one material with six
	tiers that differ only in numbers: a lit ARC (110–160° of the rim, the rest
	stays hairline), hues in a fixed order (cyan → blue → violet → magenta, one
	green or amber accent), a seeded start/length/accent/direction so that no two
	neighbours match, and light that falls mostly INSIDE the shape (inner
	diffusion), with an outer halo reserved for the hero. That contract is the
	page's art direction, not a reusable component API, so it lives here.

	Layers, all inheriting the host's radius:
	  1. edge   — a 1px ring cut with a padding-box/border-box mask (exclude);
	  2. inner  — the same conic, masked to fade out at depth D. Plain alpha,
	     no blend mode: a `plus-lighter`/`screen` layer forces Chromium to
	     isolate the stacking context it sits in, and an isolated group cuts a
	     sibling backdrop-filter (the hero glass) off from what lies behind it —
	     measured: the ring behind the glass stayed sharp until the blend went.
	     On a near-black surface at ≤ 0.24 opacity the visual difference is nil;
	  3. halo   — the same conic behind the host, blurred (hero, focused search).

	The host must be `position: relative` with a border-radius and draw its own
	hairline as `box-shadow: inset 0 0 0 1px`, so the edge sits on top of it.
	The halo uses `z-index: -1`; keep the host free of `overflow: hidden` when a
	halo is wanted.

	Motion is CSS only: registered `--rl-*` properties (document-global, hence
	the prefix) spin the arc. Laps are 16–20 s; the search field adds a second,
	paused-at-rest spin when focused so its lap shortens to ~9 s without the arc
	jumping. Reduced motion and `paused` freeze every layer on its seeded frame.
-->
<script lang="ts">
	import { rimSeed, unwrapAngle, type RimTier } from "./rim.js";

	interface Props {
		/** Which numbers to apply (opacity, depth, arc, lap). */
		tier: RimTier;
		/** Index or slug hash: picks start angle, arc length, accent and direction. */
		seed?: number;
		/** Search focus / card hover state. Ignored by hero, selected and cta. */
		active?: boolean;
		/** Pointer-following arc centre in degrees (0 = top, clockwise). Cards only. */
		angle?: number;
		/** Outer halo layer. Only the hero may pass true (one halo per viewport). */
		halo?: boolean;
		/** Freeze every layer on its current frame. */
		paused?: boolean;
	}

	let { tier, seed = 0, active = false, angle, halo = false, paused = false }: Props = $props();

	const s = $derived(rimSeed(seed));

	// The search arc starts bottom-weighted (150°) whatever the seed; every
	// other tier is centred on its seeded arc.
	let lastAngle = 0;
	const centre = $derived.by(() => {
		const seeded = tier === "search" ? 200 : s.start + s.arc / 2;
		if (angle === undefined) return seeded;
		// The pointer pulls the arc only halfway from its seeded centre, so
		// neighbours hovered from the same side still sit at different angles.
		const target = seeded + 0.5 * (unwrapAngle(seeded, angle) - seeded);
		lastAngle = unwrapAngle(lastAngle, target);
		return lastAngle;
	});

	const showHalo = $derived(halo || tier === "search");
</script>

<span
	class="rl"
	aria-hidden="true"
	data-decorative
	data-tier={tier}
	data-accent={s.accent}
	data-dir={s.direction}
	data-active={active || undefined}
	data-paused={paused || undefined}
	data-follow={angle !== undefined || undefined}
	style:--rl-start="{s.start}deg"
	style:--rl-seed-arc="{s.arc}deg"
	style:--rl-c="{centre}deg"
>
	{#if showHalo}<span class="rl-halo"><span class="rl-halo-glow"></span></span>{/if}
	<span class="rl-inner"></span>
	<span class="rl-edge"></span>
</span>

<style>
	@property --rl-spin {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0deg;
	}
	@property --rl-boost {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0deg;
	}
	@property --rl-arc {
		syntax: "<angle>";
		inherits: true;
		initial-value: 140deg;
	}
	@property --rl-c {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0deg;
	}
	@property --rl-d {
		syntax: "<length>";
		inherits: true;
		initial-value: 16px;
	}

	.rl {
		--rl-ease: var(--fx-ease, cubic-bezier(0.2, 0.7, 0.2, 1));
		--rl-arc: var(--rl-seed-arc);
		--rl-from: calc(var(--rl-c) - var(--rl-arc) / 2 + var(--rl-spin) + var(--rl-boost));
		--rl-rest: 0;
		--rl-halo-s: 24px;
		--rl-halo-b: 48px;
		/* One arc, hues in fixed order, both ends feathered over 12 %. */
		--rl-grad: conic-gradient(
			from var(--rl-from),
			transparent 0deg,
			var(--g-cyan) calc(var(--rl-arc) * 0.12),
			var(--g-green) calc(var(--rl-arc) * 0.18),
			var(--g-green) calc(var(--rl-arc) * 0.22),
			var(--g-blue) calc(var(--rl-arc) * 0.32),
			var(--g-violet) calc(var(--rl-arc) * 0.6),
			var(--g-magenta) calc(var(--rl-arc) * 0.88),
			transparent var(--rl-arc)
		);

		position: absolute;
		inset: 0;
		display: block;
		border-radius: inherit;
		pointer-events: none;
		animation: rl-spin 16s linear infinite;
		transition:
			--rl-arc 280ms var(--rl-ease),
			--rl-d 280ms var(--rl-ease);
	}

	.rl[data-accent="amber"] {
		--rl-grad: conic-gradient(
			from var(--rl-from),
			transparent 0deg,
			var(--g-cyan) calc(var(--rl-arc) * 0.12),
			var(--g-blue) calc(var(--rl-arc) * 0.3),
			var(--g-violet) calc(var(--rl-arc) * 0.6),
			var(--g-amber) calc(var(--rl-arc) * 0.7),
			var(--g-amber) calc(var(--rl-arc) * 0.74),
			var(--g-magenta) calc(var(--rl-arc) * 0.88),
			transparent var(--rl-arc)
		);
	}

	.rl[data-dir="ccw"] {
		animation-direction: reverse;
	}

	.rl > span {
		position: absolute;
		inset: 0;
		display: block;
		border-radius: inherit;
		opacity: 0;
		transition: opacity 280ms var(--rl-ease);
	}

	.rl-edge {
		box-sizing: border-box;
		padding: 1px;
		background: var(--rl-grad), linear-gradient(rgb(255 255 255 / var(--rl-rest)) 0 0);
		-webkit-mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		-webkit-mask-composite: xor;
		mask:
			linear-gradient(#000 0 0) content-box,
			linear-gradient(#000 0 0);
		mask-composite: exclude;
	}

	/* Light that falls inside: full at the rim, ease-out to nothing at depth D. */
	.rl-inner {
		background: var(--rl-grad);
		-webkit-mask-image:
			linear-gradient(
				to bottom,
				#000 0,
				rgb(0 0 0 / 0.8) calc(var(--rl-d) * 0.2),
				rgb(0 0 0 / 0.5) calc(var(--rl-d) * 0.5),
				rgb(0 0 0 / 0.15) calc(var(--rl-d) * 0.8),
				transparent var(--rl-d),
				transparent calc(100% - var(--rl-d)),
				rgb(0 0 0 / 0.15) calc(100% - var(--rl-d) * 0.8),
				rgb(0 0 0 / 0.5) calc(100% - var(--rl-d) * 0.5),
				rgb(0 0 0 / 0.8) calc(100% - var(--rl-d) * 0.2),
				#000 100%
			),
			linear-gradient(
				to right,
				#000 0,
				rgb(0 0 0 / 0.8) calc(var(--rl-d) * 0.2),
				rgb(0 0 0 / 0.5) calc(var(--rl-d) * 0.5),
				rgb(0 0 0 / 0.15) calc(var(--rl-d) * 0.8),
				transparent var(--rl-d),
				transparent calc(100% - var(--rl-d)),
				rgb(0 0 0 / 0.15) calc(100% - var(--rl-d) * 0.8),
				rgb(0 0 0 / 0.5) calc(100% - var(--rl-d) * 0.5),
				rgb(0 0 0 / 0.8) calc(100% - var(--rl-d) * 0.2),
				#000 100%
			);
		mask-image:
			linear-gradient(
				to bottom,
				#000 0,
				rgb(0 0 0 / 0.8) calc(var(--rl-d) * 0.2),
				rgb(0 0 0 / 0.5) calc(var(--rl-d) * 0.5),
				rgb(0 0 0 / 0.15) calc(var(--rl-d) * 0.8),
				transparent var(--rl-d),
				transparent calc(100% - var(--rl-d)),
				rgb(0 0 0 / 0.15) calc(100% - var(--rl-d) * 0.8),
				rgb(0 0 0 / 0.5) calc(100% - var(--rl-d) * 0.5),
				rgb(0 0 0 / 0.8) calc(100% - var(--rl-d) * 0.2),
				#000 100%
			),
			linear-gradient(
				to right,
				#000 0,
				rgb(0 0 0 / 0.8) calc(var(--rl-d) * 0.2),
				rgb(0 0 0 / 0.5) calc(var(--rl-d) * 0.5),
				rgb(0 0 0 / 0.15) calc(var(--rl-d) * 0.8),
				transparent var(--rl-d),
				transparent calc(100% - var(--rl-d)),
				rgb(0 0 0 / 0.15) calc(100% - var(--rl-d) * 0.8),
				rgb(0 0 0 / 0.5) calc(100% - var(--rl-d) * 0.5),
				rgb(0 0 0 / 0.8) calc(100% - var(--rl-d) * 0.2),
				#000 100%
			);
	}

	/* The halo is two boxes: the outer one overreaches the glow's blur on every
	   side (so a mask on it never cuts the blur on a straight line), the inner
	   one is the blurred arc itself, S px outside the host. */
	.rl > .rl-halo {
		inset: calc(var(--rl-halo-s) * -1 - var(--rl-halo-b) * 1.5);
		z-index: -1;
	}

	.rl-halo-glow {
		position: absolute;
		inset: calc(var(--rl-halo-b) * 1.5);
		border-radius: inherit;
		background: var(--rl-grad);
		filter: blur(var(--rl-halo-b));
	}

	/* The hero halo never falls below the panel: whatever holds the hero (a
	   clipped band) may end a few px under it, and a blurred halo cut on that
	   line reads as a hard edge. It fades to nothing at the panel's bottom
	   edge, over the 64 px above it. */
	.rl[data-tier="hero"] > .rl-halo {
		--rl-halo-cut: calc(var(--rl-halo-s) + var(--rl-halo-b) * 1.5);
		-webkit-mask-image: linear-gradient(
			to bottom,
			#000 calc(100% - var(--rl-halo-cut) - 64px),
			transparent calc(100% - var(--rl-halo-cut))
		);
		mask-image: linear-gradient(
			to bottom,
			#000 calc(100% - var(--rl-halo-cut) - 64px),
			transparent calc(100% - var(--rl-halo-cut))
		);
	}

	/* ---- tiers --------------------------------------------------------------- */

	/* Hero glass: the full stack, the only halo at rest. */
	.rl[data-tier="hero"] {
		--rl-d: 40px;
		--rl-rest: 0.15;
	}
	.rl[data-tier="hero"] .rl-edge {
		opacity: 0.75;
	}
	.rl[data-tier="hero"] .rl-inner {
		opacity: 0.38;
	}
	.rl[data-tier="hero"] .rl-halo {
		opacity: 0.28;
		animation: rl-breathe 7s ease-in-out infinite alternate;
	}

	/* Search: a short bottom-weighted arc at rest that widens and speeds up on
	   focus. The second spin runs only while active and holds its angle when
	   paused, so the lap changes speed without the arc jumping. */
	.rl[data-tier="search"] {
		--rl-arc: 100deg;
		--rl-d: 28px;
		--rl-halo-s: 8px;
		--rl-halo-b: 18px;
		animation:
			rl-spin 20s linear infinite,
			rl-boost 16.36s linear infinite paused;
	}
	.rl[data-tier="search"][data-active] {
		--rl-arc: 220deg;
		--rl-d: 32px;
		animation-play-state: running, running;
	}
	.rl[data-tier="search"] .rl-edge {
		opacity: 0.55;
	}
	.rl[data-tier="search"] .rl-inner {
		opacity: 0.2;
	}
	.rl[data-tier="search"][data-active] .rl-edge {
		opacity: 1;
	}
	.rl[data-tier="search"][data-active] .rl-inner {
		opacity: 0.22;
	}
	.rl[data-tier="search"][data-active] .rl-halo {
		opacity: 0.3;
	}

	/* Card: nothing at rest; on hover/focus a still arc that follows the pointer.
	   In fast (200 ms), out slow (400 ms). */
	.rl[data-tier="card"] {
		--rl-d: 16px;
		animation: none;
	}
	.rl[data-tier="card"][data-follow] {
		transition:
			--rl-arc 280ms var(--rl-ease),
			--rl-d 280ms var(--rl-ease),
			--rl-c 160ms linear;
	}
	.rl[data-tier="card"] > span {
		transition-duration: 400ms;
	}
	.rl[data-tier="card"][data-active] > span {
		transition-duration: 200ms;
	}
	.rl[data-tier="card"][data-active] .rl-edge {
		opacity: 0.7;
	}
	.rl[data-tier="card"][data-active] .rl-inner {
		opacity: 0.16;
	}

	/* Selected / saved: the full rim, static, so it never reads as hover. */
	.rl[data-tier="selected"] {
		--rl-d: 20px;
		--rl-grad: conic-gradient(
			from var(--rl-c),
			var(--g-cyan),
			var(--g-green) 8%,
			var(--g-blue) 25%,
			var(--g-violet) 50%,
			var(--g-magenta) 75%,
			var(--g-cyan)
		);
		animation: none;
	}
	.rl[data-tier="selected"][data-accent="amber"] {
		--rl-grad: conic-gradient(
			from var(--rl-c),
			var(--g-cyan),
			var(--g-blue) 25%,
			var(--g-violet) 50%,
			var(--g-amber) 62%,
			var(--g-magenta) 75%,
			var(--g-cyan)
		);
	}
	.rl[data-tier="selected"] .rl-edge {
		opacity: 0.85;
	}
	.rl[data-tier="selected"] .rl-inner {
		opacity: 0.14;
	}

	/* Primary CTA: every 7 s one short segment laps the rim once (1.6 s), then
	   rests unlit. */
	.rl[data-tier="cta"] {
		--rl-arc: 70deg;
		animation: rl-cta-lap 7s linear infinite;
	}
	.rl[data-tier="cta"] .rl-edge {
		animation: rl-cta-fade 7s linear infinite;
	}

	.rl[data-paused],
	.rl[data-paused] > span {
		animation-play-state: paused !important;
	}

	@keyframes rl-spin {
		to {
			--rl-spin: 360deg;
		}
	}
	@keyframes rl-boost {
		to {
			--rl-boost: 360deg;
		}
	}
	@keyframes rl-breathe {
		from {
			opacity: 0.22;
		}
		to {
			opacity: 0.32;
		}
	}
	@keyframes rl-cta-lap {
		0% {
			--rl-spin: 0deg;
			animation-timing-function: cubic-bezier(0.45, 0, 0.25, 1);
		}
		23%,
		100% {
			--rl-spin: 360deg;
		}
	}
	@keyframes rl-cta-fade {
		0%,
		23%,
		100% {
			opacity: 0;
		}
		3%,
		19% {
			opacity: 0.9;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.rl,
		.rl > span {
			animation: none !important;
		}
	}
</style>
