<script lang="ts">
	import { BorderBeam } from "$lib/fancy-ui/border-beam";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
		<p class="text-muted-foreground text-center text-xs">Orange → Purple</p>
		<BorderBeam colorFrom="#ffaa40" colorTo="#9c40ff" />
	</div>
	<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
		<p class="text-muted-foreground text-center text-xs">Cyan → Blue</p>
		<BorderBeam colorFrom="#00ffff" colorTo="#0066ff" />
	</div>
	<div class="bg-background relative h-32 w-48 overflow-hidden rounded-xl border p-4">
		<p class="text-muted-foreground text-center text-xs">Pink → Yellow</p>
		<BorderBeam colorFrom="#ff00ff" colorTo="#ffff00" />
	</div>
</div>
