<script lang="ts">
	import { BorderBeam } from "$lib/fancy-ui/border-beam";
</script>

<div class="bg-background relative mx-auto h-40 w-full max-w-md overflow-hidden rounded-xl border p-6">
	<p class="text-muted-foreground text-center">Dual beam effect</p>
	<BorderBeam colorFrom="#ffaa40" colorTo="#9c40ff" />
	<BorderBeam colorFrom="#00ffff" colorTo="#0066ff" delay={7.5} />
</div>
