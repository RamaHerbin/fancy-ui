<script lang="ts">
	import {
		PixelScene,
		PIXEL_SCENES,
		type PixelSceneHdrLook,
		type PixelSceneName,
	} from "$lib/fancy-ui/pixel-scene";

	// The scene owns its surface and its ink for both themes, so the wave carries
	// the whole card from day to night: background, dots and halo. The copy follows
	// once the front has passed it.
	let scene = $state<PixelSceneName>("sea");
	let night = $state(true);
	// Two HDR looks to compare on an HDR display: calibrated levels, or the
	// prototype's hotter, wider-gamut rendering. Same picture on SDR screens.
	let hdrLook = $state<PixelSceneHdrLook>("vivid");
	const LOOKS: PixelSceneHdrLook[] = ["calibrated", "vivid"];

	const SURFACES = ["#f7f7f5", "#0b0b0c"] as const;
	const INKS = ["#141414", "#e9e9e6"] as const;
	const MUTED = ["#6b6b6b", "#9a9a9a"] as const;
</script>

<div class="flex w-full flex-col gap-3">
	<div class="flex flex-wrap items-center gap-2" role="group" aria-label="Scene">
		{#each PIXEL_SCENES as name (name)}
			<button
				type="button"
				aria-pressed={scene === name}
				class="focus-visible:ring-ring rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none {scene ===
				name
					? 'bg-foreground text-background border-foreground'
					: 'border-foreground/20 text-foreground hover:bg-foreground/5'}"
				onclick={() => (scene = name)}
			>
				{name}
			</button>
		{/each}
		<button
			type="button"
			aria-pressed={night}
			class="border-foreground/20 text-foreground hover:bg-foreground/5 focus-visible:ring-ring rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
			onclick={() => (night = !night)}
		>
			night / day
		</button>
		<span class="text-muted-foreground ml-auto text-xs">HDR</span>
		<div
			class="border-foreground/15 inline-flex rounded-full border p-0.5"
			role="group"
			aria-label="HDR look"
		>
			{#each LOOKS as look (look)}
				<button
					type="button"
					aria-pressed={hdrLook === look}
					class="focus-visible:ring-ring rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none {hdrLook ===
					look
						? 'bg-foreground text-background'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (hdrLook = look)}
				>
					{look}
				</button>
			{/each}
		</div>
	</div>
	<PixelScene
		{scene}
		{night}
		{hdrLook}
		surfaces={SURFACES}
		inks={INKS}
		onclick={() => (night = !night)}
		class="h-[340px] w-full cursor-crosshair rounded-[14px]"
	>
		<div
			class="hours-copy pointer-events-none absolute top-9 left-9 max-w-[460px] pr-9"
			style:--copy={INKS[night ? 1 : 0]}
			style:--muted={MUTED[night ? 1 : 0]}
		>
			<p class="text-[11px] tracking-[0.28em] uppercase" style:color="var(--muted)">
				Issue 14 · Late autumn
			</p>
			<h3 class="mt-1.5 mb-2 text-[40px] leading-none font-semibold tracking-[-0.03em]">
				Hours of low light
			</h3>
			<p class="hidden text-sm sm:block" style:color="var(--muted)">
				Move the pointer over the picture to see it in colour. Click to switch night and day.
			</p>
		</div>
	</PixelScene>
</div>

<style>
	/* The copy sits far from the sun: it turns once the front has reached it. */
	.hours-copy,
	.hours-copy p {
		color: var(--copy);
		transition: color 0.3s ease 0.6s;
	}
</style>
