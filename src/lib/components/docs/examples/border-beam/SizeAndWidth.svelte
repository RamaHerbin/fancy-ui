<script lang="ts">
	import { BorderBeam } from "$lib/fancy-ui/border-beam";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
		<p class="text-muted-foreground text-center text-xs">Small beam</p>
		<BorderBeam size={100} />
	</div>
	<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
		<p class="text-muted-foreground text-center text-xs">Large beam</p>
		<BorderBeam size={300} />
	</div>
	<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
		<p class="text-muted-foreground text-center text-xs">Thick border</p>
		<BorderBeam borderWidth={3} />
	</div>
</div>
