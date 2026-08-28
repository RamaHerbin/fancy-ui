<script lang="ts">
	import { MosaicGlow } from "$lib/fancy-ui/mosaic-glow";
</script>

<div class="grid w-full gap-4 sm:grid-cols-2">
	<MosaicGlow class="h-64 rounded-xl" trail={0.15} smoothing={0} idle="none">
		<p class="p-4 text-xs text-white/50">trail 0.15 · idle none</p>
	</MosaicGlow>
	<MosaicGlow class="h-64 rounded-xl" trail={0.95} smoothing={0.4} seed={7}>
		<p class="p-4 text-xs text-white/50">trail 0.95 · smoothing 0.4 · drifts when idle</p>
	</MosaicGlow>
</div>
