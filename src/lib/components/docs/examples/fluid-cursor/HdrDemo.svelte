<script lang="ts">
	import { FluidCursor } from "$lib/fancy-ui/fluid-cursor";
</script>

<div class="relative h-64 w-full overflow-hidden rounded-lg border bg-black">
	<FluidCursor
		hdr
		hdrBoost={2}
		fluidColors={["#a142ff", "#42cfff", "#ff2fd6"]}
		colorIntensity={0.5}
		splatOnMount
		allowMultiple
	/>
	<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
		<p class="text-sm text-white/60 select-none">
			HDR glow — brightest on an HDR display in a WebGPU browser
		</p>
	</div>
</div>
