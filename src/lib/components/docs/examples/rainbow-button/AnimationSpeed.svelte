<script lang="ts">
	import { RainbowButton } from "$lib/fancy-ui/rainbow-button";
</script>

<div class="flex flex-wrap gap-4">
	<div class="flex flex-col items-center gap-2">
		<RainbowButton speed={1}>Fast (1s)</RainbowButton>
		<span class="text-muted-foreground text-xs">speed=1</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<RainbowButton speed={2}>Default (2s)</RainbowButton>
		<span class="text-muted-foreground text-xs">speed=2</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<RainbowButton speed={4}>Slow (4s)</RainbowButton>
		<span class="text-muted-foreground text-xs">speed=4</span>
	</div>
</div>
