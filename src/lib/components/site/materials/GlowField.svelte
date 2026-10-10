<!--
	GlowField — the luminous body that sits BEHIND the hero glass. Blur over flat
	black is invisible, so the glass only reads as glass when something bright
	crosses its edge: here a blurred conic "lens" plus a hotter core, centred
	beyond the panel's top-right corner (raw colour outside, frosted colour
	inside), and a crisp ring that crosses the panel diagonally (a sharp line
	outside, a soft band inside).

	Place it as the first child of the panel's positioned wrapper: it is
	anchored to the panel and overflows it on purpose, so the page clips it
	(the hero's `overflow: clip`). Everything moves on the compositor: the lens
	is a lightly blurred disc (crisp enough for the glass to frost) rotated by `transform`, squashed into an ellipse by
	its parent; the ring drifts on two nested translate loops a quarter period
	apart (an ellipse, ±12 px). Reduced motion freezes the lens at 210°.
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { inView } from "$lib/fancy-ui/_internals/motion/in-view.js";

	interface Props {
		/** Freeze both loops on their current frame. */
		paused?: boolean;
	}

	let { paused = false }: Props = $props();

	const uid = $props.id();

	// Idle = off-screen or hidden tab: the loops pause. Watched only while they
	// could run — no observer or listener under reduced motion or `paused`.
	let box: HTMLDivElement | undefined = $state();
	let reducedMotion = $state(false);
	let onScreen = $state(true);
	let tabHidden = $state(false);
	const idle = $derived(!onScreen || tabHidden);

	onMount(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		reducedMotion = mq.matches;
		const onMotion = (e: MediaQueryListEvent) => (reducedMotion = e.matches);
		mq.addEventListener("change", onMotion);
		return () => mq.removeEventListener("change", onMotion);
	});

	$effect(() => {
		const node = box;
		if (!node || paused || reducedMotion) return;
		const onVisibility = () => (tabHidden = document.visibilityState === "hidden");
		onVisibility();
		document.addEventListener("visibilitychange", onVisibility);
		const observer = inView(node, { once: false, threshold: 0, onChange: (v) => (onScreen = v) });
		return () => {
			document.removeEventListener("visibilitychange", onVisibility);
			observer?.destroy?.();
		};
	});
</script>

<div
	class="gf"
	aria-hidden="true"
	data-decorative
	data-paused={paused || undefined}
	data-idle={idle || undefined}
>
	<!-- Observed for visibility: the panel-sized box, not the 400 px overreach. -->
	<div class="gf-box" bind:this={box}>
		<div class="gf-lens">
			<div class="gf-disc"></div>
		</div>
		<div class="gf-core"></div>
		<div class="gf-ring-x">
			<div class="gf-ring-y">
				<svg class="gf-ring" viewBox="0 0 563 563" width="563" height="563">
					<defs>
						<linearGradient id="gf-ring-{uid}" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0" style="stop-color: var(--g-cyan)" />
							<stop offset="0.5" style="stop-color: var(--g-violet)" />
							<stop offset="1" style="stop-color: var(--g-magenta)" />
						</linearGradient>
					</defs>
					<circle
						cx="281.5"
						cy="281.5"
						r="280"
						fill="none"
						stroke="url(#gf-ring-{uid})"
						stroke-width="2.25"
					/>
				</svg>
			</div>
		</div>
	</div>
</div>

<style>
	/* The outer box overreaches the panel by 400 px on every side so its mask
	   can cover the overflow. Vertically the field lives only around the
	   panel: it fades in from 50 px above the panel's top (opaque 10 px below
	   it) and out from 60 px above its bottom to nothing 10 px above it, so
	   whatever clips the hero (header above, band edge below) never cuts it. */
	.gf {
		position: absolute;
		inset: -400px;
		pointer-events: none;
		z-index: 0;
		--gf-fade: linear-gradient(
			to bottom,
			transparent 350px,
			#000 410px,
			#000 calc(100% - 460px),
			transparent calc(100% - 410px)
		);
		-webkit-mask-image: var(--gf-fade);
		mask-image: var(--gf-fade);
	}

	.gf-box {
		position: absolute;
		inset: 400px;
	}

	/* 520×300 ellipse centred just inside the panel's top-right corner (−30, −30): about half of it lies under the glass (frosted), the rest beyond the edge (crisp). The art direction's (+90, −40) put most of it past the viewport edge at 1440. */
	.gf-lens {
		position: absolute;
		left: calc(100% - 30px - 260px);
		top: calc(-30px - 260px);
		width: 520px;
		height: 520px;
		transform: scaleY(0.577);
		opacity: 0.8;
	}

	.gf-disc {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background: conic-gradient(
			var(--g-cyan),
			var(--g-green) 9%,
			var(--g-blue) 22%,
			var(--g-violet) 42%,
			var(--g-magenta) 62%,
			var(--g-amber) 76%,
			var(--g-magenta) 86%,
			var(--g-violet) 94%,
			var(--g-cyan)
		);
		filter: blur(14px);
		transform: rotate(210deg);
		will-change: transform;
		animation: gf-spin 24s linear infinite;
	}

	/* The hot core: smaller and brighter, same centre, static — the colour
	   that crosses the glass edge has to be unmistakable. */
	.gf-core {
		position: absolute;
		left: calc(100% - 110px - 110px);
		top: calc(40px - 70px);
		width: 220px;
		height: 140px;
		border-radius: 50%;
		background: linear-gradient(120deg, var(--g-cyan), var(--g-blue) 45%, var(--g-magenta));
		filter: blur(8px);
		opacity: 0.9;
	}

	/* Ø 560 ring, centred 120 px left of the panel's centre. */
	.gf-ring-x {
		position: absolute;
		left: calc(50% - 120px - 281.5px);
		top: calc(50% - 281.5px);
		width: 563px;
		height: 563px;
		animation: gf-drift-x 9s ease-in-out infinite alternate;
	}

	.gf-ring-y {
		width: 100%;
		height: 100%;
		animation: gf-drift-y 9s ease-in-out -4.5s infinite alternate;
	}

	.gf-ring {
		display: block;
		opacity: 0.9;
	}

	.gf[data-paused] *,
	.gf[data-idle] * {
		animation-play-state: paused !important;
	}

	@keyframes gf-spin {
		from {
			transform: rotate(210deg);
		}
		to {
			transform: rotate(570deg);
		}
	}
	@keyframes gf-drift-x {
		from {
			transform: translateX(-12px);
		}
		to {
			transform: translateX(12px);
		}
	}
	@keyframes gf-drift-y {
		from {
			transform: translateY(-12px);
		}
		to {
			transform: translateY(12px);
		}
	}

	/* Phone (stacked): a smaller lens and core centred INSIDE the panel (−70, +30) so the brightest part never sits behind the CTAs above it, and no ring — at this width the ring
	   would cut through the copy above the panel. */
	@media (max-width: 700px) {
		.gf-lens {
			left: calc(100% - 70px - 150px);
			top: calc(30px - 150px);
			width: 300px;
			height: 300px;
			transform: scaleY(0.6);
		}
		.gf-disc {
			filter: blur(12px);
		}
		.gf-core {
			left: calc(100% - 70px - 70px);
			top: calc(30px - 45px);
			width: 140px;
			height: 90px;
			filter: blur(8px);
		}
		.gf-ring-x {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.gf * {
			animation: none !important;
		}
	}
</style>
