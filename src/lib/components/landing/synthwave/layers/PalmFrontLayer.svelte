<!--
	Two GIANT foreground palms cropped by the frame edges — trunks entering from
	the bottom corners, crowns canopying the top corners. They frame the picture
	in front of everything except the atmosphere. Both slots come from
	PALM_SLOTS; the negative anchors are intended (they crop the trunk bases
	below the frame and the crowns outside it). Sizing is height-driven with the
	img aspect-ratio supplying the width, like PalmBackLayer.

	v2: the fronds are graded to a NEAR-BLACK silhouette (PALM_SILHOUETTES) — a
	static filter on the <img>, never on the sway wrapper, which GSAP owns.
-->
<script lang="ts">
	import { gsap } from "gsap";
	import {
		assetFallback,
		assetSources,
		ASSET_SIZES,
		getSceneContext,
		PALM_SILHOUETTES,
		PALM_SLOTS,
	} from "../scene-config.js";

	const scene = getSceneContext();
	const slots = PALM_SLOTS.filter((slot) => slot.asset === "palm-front");
	const sources = assetSources("palm-front");
	const fallback = assetFallback("palm-front");

	// Static silhouette grade (allowed — only ANIMATING a filter is not). It
	// crushes the giant fronds to the reference's near-black frame corners.
	const silhouette = PALM_SILHOUETTES["palm-front"];
	const silhouetteFilter = `brightness(${silhouette.brightness}) saturate(${silhouette.saturate})`;

	const els: HTMLDivElement[] = [];

	$effect(() => {
		const tl = scene.timeline();
		if (!tl) return; // reduced motion: palms hold their static pose

		// Standalone tweens added to the master, never `tl.to`, whose return
		// value is the timeline and not the tween. One sway per slot; the two
		// periods share no factor, so the palms never move in lockstep.
		const tweens = slots.map((slot, index) =>
			gsap.fromTo(
				els[index],
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
		for (const tween of tweens) tl.add(tween, 0);

		return () => {
			for (const tween of tweens) tween.kill();
			gsap.set(els, { clearProps: "transform" });
		};
	});
</script>

<div class="absolute inset-0">
	{#each slots as slot, index (slot.slot)}
		<div
			bind:this={els[index]}
			class="palm"
			style:height={`${slot.heightPct}%`}
			style:bottom={`${slot.bottomPct}%`}
			style:left={slot.leftPct !== undefined ? `${slot.leftPct}%` : undefined}
			style:right={slot.rightPct !== undefined ? `${slot.rightPct}%` : undefined}
		>
			<picture>
				{#each sources as source (source.type)}
					<source type={source.type} srcset={source.srcset} sizes={ASSET_SIZES} />
				{/each}
				<!--
					The mirror lives on the <img>, never on the sway wrapper: GSAP owns
					the wrapper's transform and would clobber a scaleX(-1) there. The
					source leans right, so the mirrored right-edge palm leans INTO the
					frame like its unmirrored left twin.
				-->
				<img
					class:mirrored={slot.mirrored}
					style:filter={silhouetteFilter}
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
	.palm {
		position: absolute;
		transform-origin: bottom center;
		will-change: transform;
	}

	.palm img {
		display: block;
		height: 100%;
		width: auto;
		aspect-ratio: 1024 / 1536;
	}

	.palm img.mirrored {
		transform: scaleX(-1);
	}

	@media (prefers-reduced-motion: reduce) {
		.palm {
			will-change: auto;
		}
	}
</style>
