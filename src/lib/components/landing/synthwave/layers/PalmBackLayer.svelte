<!--
	Two SMALL mid-depth palms standing on the floor just below the horizon — one
	per side, behind the car. Both `back-*` slots of `PALM_SLOTS` render inside
	this one component, each sized by height (the source is a 1024x1536 portrait
	render) with `aspect-ratio` on the img so width follows automatically. The
	right slot mirrors via `scaleX(-1)` on the <img> only — GSAP owns the sway
	wrapper's transform and would clobber a mirror living there. Each slot sways
	on the scene timeline with its own period, so the two never sync up.
-->
<script lang="ts">
	import { gsap } from "gsap";
	import {
		assetFallback,
		assetSources,
		ASSET_SIZES,
		getSceneContext,
		PALM_SLOTS,
	} from "../scene-config.js";

	const scene = getSceneContext();
	const slots = PALM_SLOTS.filter((slot) => slot.asset === "palm-back");
	const sources = assetSources("palm-back");
	const fallback = assetFallback("palm-back");

	const els: HTMLDivElement[] = [];

	$effect(() => {
		const tl = scene.timeline();
		if (!tl) return; // reduced motion: palms hold their static pose

		// One standalone `gsap.fromTo` per slot added to the master, rather than
		// `tl.set` plus `tl.to`: a timeline's own `.to()` returns the timeline, so
		// killing its result on cleanup would take the whole scene down, and the
		// `set` would outlive the sway it was seeding.
		const tweens = slots.map((slot, i) =>
			gsap.fromTo(
				els[i],
				{ rotate: -slot.swayDegrees },
				{
					rotate: slot.swayDegrees,
					yoyo: true,
					repeat: -1,
					duration: slot.swaySeconds,
					ease: "sine.inOut",
				}
			)
		);
		for (const tween of tweens) {
			tl.add(tween, 0);
		}

		return () => {
			for (const tween of tweens) {
				tween.kill();
			}
			gsap.set(els, { clearProps: "transform" });
		};
	});
</script>

<div class="absolute inset-0">
	{#each slots as slot, i (slot.slot)}
		<div
			bind:this={els[i]}
			class="palm-slot"
			style:height={`${slot.heightPct}%`}
			style:bottom={`${slot.bottomPct}%`}
			style:left={slot.leftPct !== undefined ? `${slot.leftPct}%` : undefined}
			style:right={slot.rightPct !== undefined ? `${slot.rightPct}%` : undefined}
		>
			<picture>
				{#each sources as source (source.type)}
					<source type={source.type} srcset={source.srcset} sizes={ASSET_SIZES} />
				{/each}
				<img
					class:mirrored={slot.mirrored}
					src={fallback}
					alt=""
					loading="lazy"
					decoding="async"
					draggable="false"
				/>
			</picture>
		</div>
	{/each}
</div>

<style>
	.palm-slot {
		position: absolute;
		transform-origin: bottom center;
		will-change: transform;
	}

	.palm-slot img {
		display: block;
		height: 100%;
		width: auto;
		aspect-ratio: 1024 / 1536;
	}

	.palm-slot img.mirrored {
		transform: scaleX(-1);
	}

	@media (prefers-reduced-motion: reduce) {
		.palm-slot {
			will-change: auto;
		}
	}
</style>
