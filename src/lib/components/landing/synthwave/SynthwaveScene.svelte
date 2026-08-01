<script lang="ts">
	import { assetFallback, assetSources } from "./backdrop-config.js";

	const desktopSources = assetSources("neon-horizon-drive");
	const mobileSources = assetSources("neon-horizon-drive-mobile");
</script>

<!--
	Static backdrop for the CTA + footer section: one art-directed panorama, no
	scripting. The section's `z-10` children stack above it by DOM order — the
	scene itself carries no z-index.

	Two boxes, both absolute, both outside the flow:

	1. The riser (this element) — a pure gradient, so it has no edge to give
	   away. It starts above the section, i.e. behind the ValuesStrip card, and
	   dies out around the card's mid-height; the card paints over it. Its job
	   is the melt: the panorama's glow bleeds upward past the card instead of
	   the artwork starting on a ruled line.
	2. The panorama itself, offset 20px below the section top.

	Why the artwork can't simply start higher: the sun's top arc is 44px from
	the source's own top edge (6% of 724px), so at every rendered size the disc
	begins only ~25-50px below the band. Pull the band up behind the card and
	the card guillotines the sun. Instead the band starts just under the card,
	where its top rows (max luma 13/255) are indistinguishable from the
	section's #08080d, and a short 24px ramp finishes the dissolve before the
	sun's first pixels — measured clearance 46-73px from 390px to 2560px.
-->
<div
	data-backdrop-glow="neon-horizon-drive"
	aria-hidden="true"
	class="pointer-events-none absolute inset-x-0 -top-[72px] h-[190px] bg-[radial-gradient(150%_130%_at_50%_100%,rgba(96,22,104,0.5)_0%,rgba(46,10,60,0.28)_40%,rgba(12,4,20,0)_74%)]"
></div>

<!--
	`w-full` matters: with an auto width, the min-height clamp transfers back
	through the aspect-ratio (500px x 3 = 1500px wide) and the scene overflows
	narrow viewports horizontally; a definite width pins the box to the
	viewport and lets object-cover crop. The min-height keeps the band deep
	enough for its bottom vignette to still be glowing behind the footer's link
	headers on shorter viewports, and `object-top` sends the crop to the bottom
	edge — under the vignette — so a wide monitor never trims the sun.

	The max-height is what keeps the band inside its own section: past ~1980px
	the 3:1 aspect would make it taller than the CTA + footer it belongs to,
	and since nothing clips it, the artwork would run past the copyright line
	and add scrollable page. Clamping to the section's height minus the 20px
	offset pins the vignette's end to the section's end at every width.
-->
<div
	data-backdrop="neon-horizon-drive"
	aria-hidden="true"
	class="pointer-events-none absolute inset-x-0 top-5 h-[420px] w-full overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0,black_24px,black_calc(100%-160px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_24px,black_calc(100%-160px),transparent_100%)] sm:aspect-[2172/724] sm:h-auto sm:max-h-[calc(100%-1.25rem)] sm:min-h-[430px] lg:min-h-[500px]"
>
	<picture>
		{#each mobileSources as source (source.type)}
			<source media="(max-width: 639px)" type={source.type} srcset={source.srcset} />
		{/each}
		{#each desktopSources as source (source.type)}
			<source type={source.type} srcset={source.srcset} />
		{/each}
		<img
			src={assetFallback("neon-horizon-drive")}
			alt=""
			width="2172"
			height="724"
			loading="lazy"
			decoding="async"
			class="h-full w-full object-cover object-[15%_50%] [filter:saturate(1.15)_contrast(1.05)] sm:object-[50%_0%]"
		/>
	</picture>
</div>
