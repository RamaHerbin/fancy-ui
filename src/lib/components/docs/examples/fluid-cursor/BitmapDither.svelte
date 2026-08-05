<script lang="ts">
	import { FluidCursor } from "$lib/fancy-ui/fluid-cursor";
</script>

<div class="relative h-64 w-full overflow-hidden rounded-lg border bg-black">
	<FluidCursor
		dither
		ditherPixelSize={3}
		ditherLevels={4}
		fluidColors={["#a142ff", "#42cfff", "#2fe6a8", "#ffb02f"]}
		colorIntensity={0.5}
		autoSplat
		splatOnMount
		allowMultiple
	/>
	<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
		<p class="text-sm text-white/60 select-none">Bitmap dithering — move your cursor here</p>
	</div>
</div>
