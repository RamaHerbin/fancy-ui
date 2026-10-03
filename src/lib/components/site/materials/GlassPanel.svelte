<!--
	GlassPanel — the hero's glass: the one surface allowed the full stack
	(glass + rim light + outer halo).

	It only reads as glass because of what sits behind it: GlowField puts a
	bright body partly OUTSIDE the panel, so the visitor sees raw colour beyond
	the edge and frosted colour through it. Stacking, back to front:
	  GlowField → glass surface (backdrop blur, smoked tint, frost grain, top
	  highlight) → content → RimLight (hero tier: seeded arc, inner diffusion,
	  and the outer halo that breathes 0.22 ↔ 0.32 over 7 s).

	Why no PulseBeam for the breathing halo: measured on the slice (headless
	Chromium, 1440×900, rAF over 3 s), the page ran at 52 fps with an
	`outside` PulseBeam behind the glass and 101 fps without it, everything
	else unchanged. Its rAF loop rewrites 17 custom properties per frame on
	three large blurred layers, and because they sit behind a backdrop-filter
	the glass is re-blurred every frame too. RimLight's own halo already
	carries the §2.2 breathing in CSS (an opacity animation on one layer).

	Size it from the outside (`class`); the panel fills that box.
-->
<script lang="ts">
	import type { Snippet } from "svelte";
	import GlowField from "./GlowField.svelte";
	import RimLight from "./RimLight.svelte";

	interface Props {
		/** Seeds the rim arc (start, length, accent, direction). */
		seed?: number;
		/** Freeze every decorative loop on its current frame. */
		paused?: boolean;
		class?: string;
		children?: Snippet;
	}

	let { seed = 0, paused = false, class: className = "", children }: Props = $props();
</script>

<div class="gp {className}">
	<GlowField {paused} />
	<div class="gp-surface">
		<span class="gp-grain" aria-hidden="true"></span>
		<div class="gp-content">
			{@render children?.()}
		</div>
	</div>
	<RimLight tier="hero" halo {seed} {paused} />
</div>

<style>
	/* A stacking context (z-index, not isolation) so the rim's halo can sit
	   behind the glass without falling behind the page canvas. */
	.gp {
		position: relative;
		z-index: 0;
		border-radius: 24px;
	}

	.gp-surface {
		position: relative;
		height: 100%;
		border-radius: 24px;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.06), transparent 38%),
			var(--fx-panel-smoke, rgba(20, 20, 26, 0.56));
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.14),
			inset 0 0 0 1px var(--fx-hairline, rgba(242, 241, 236, 0.1));
		-webkit-backdrop-filter: blur(10px) saturate(150%);
		backdrop-filter: blur(10px) saturate(150%);
	}

	@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
		.gp-surface {
			background:
				radial-gradient(60% 70% at 92% 4%, rgb(139 92 246 / 0.35), transparent 70%),
				linear-gradient(180deg, rgb(255 255 255 / 0.06), transparent 38%), rgba(20, 20, 26, 0.86);
		}
	}

	/* Static frost: 1-octave turbulence at 3.5 %, overlay. */
	.gp-grain {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		opacity: 0.035;
		mix-blend-mode: overlay;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
	}

	.gp-content {
		position: relative;
		height: 100%;
	}
</style>
