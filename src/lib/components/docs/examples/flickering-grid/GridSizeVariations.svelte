<script lang="ts">
	import { FlickeringGrid } from "$lib/fancy-ui/flickering-grid";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<div class="bg-background h-48 w-56 overflow-hidden rounded-xl border">
		<FlickeringGrid squareSize={2} gridGap={2} maxOpacity={0.4} />
	</div>
	<div class="bg-background h-48 w-56 overflow-hidden rounded-xl border">
		<FlickeringGrid squareSize={8} gridGap={4} maxOpacity={0.3} />
	</div>
</div>
