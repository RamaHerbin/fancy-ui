<script lang="ts">
	import { FluidCursor } from "$lib/fancy-ui/fluid-cursor";
</script>

<div class="relative h-80 w-full overflow-hidden rounded-lg border">
	<FluidCursor fluidColor="#00ffcc" colorIntensity={0.4} allowMultiple />
	<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
		<p class="text-muted-foreground text-sm select-none">Teal fluid color</p>
	</div>
</div>
