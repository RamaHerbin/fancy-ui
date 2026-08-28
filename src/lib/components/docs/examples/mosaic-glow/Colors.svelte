<script lang="ts">
	import { MosaicGlow } from "$lib/fancy-ui/mosaic-glow";
</script>

<div class="grid w-full gap-4 sm:grid-cols-3">
	<MosaicGlow class="h-48 rounded-xl" seed={2} />
	<MosaicGlow class="h-48 rounded-xl" color="#22d3ee" background="#04101a" seed={3} />
	<MosaicGlow class="h-48 rounded-xl" color="#f472b6" background="#120812" seed={4} />
</div>
