<script lang="ts">
	import { BorderBeam } from "$lib/fancy-ui/border-beam";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
		<p class="text-muted-foreground text-center text-xs">Fast (5s)</p>
		<BorderBeam duration={5} />
	</div>
	<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
		<p class="text-muted-foreground text-center text-xs">Default (15s)</p>
		<BorderBeam />
	</div>
	<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
		<p class="text-muted-foreground text-center text-xs">Slow (30s)</p>
		<BorderBeam duration={30} />
	</div>
</div>
