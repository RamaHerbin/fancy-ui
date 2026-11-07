<script lang="ts">
	import { EditorialEngine } from "$lib/fancy-ui/editorial-engine";
</script>

<div class="w-full max-w-3xl px-4">
	<div class="h-[420px] w-full overflow-hidden rounded-lg border">
		<EditorialEngine />
	</div>
	<p class="text-muted-foreground mt-3 text-xs">
		Drag an orb — text reflows around it every frame. Click an orb to pause its drift.
	</p>
</div>
