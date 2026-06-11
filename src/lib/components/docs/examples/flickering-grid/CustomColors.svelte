<script lang="ts">
	import { FlickeringGrid } from "$lib/fancy-ui/flickering-grid";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<div class="bg-background h-48 w-56 overflow-hidden rounded-xl border">
		<FlickeringGrid color="#6366f1" maxOpacity={0.5} />
	</div>
	<div class="bg-background h-48 w-56 overflow-hidden rounded-xl border">
		<FlickeringGrid color="#ef4444" maxOpacity={0.4} />
	</div>
	<div class="bg-background h-48 w-56 overflow-hidden rounded-xl border">
		<FlickeringGrid color="#22c55e" maxOpacity={0.4} />
	</div>
</div>
