<script lang="ts">
	import { GradientButton } from "$lib/fancy-ui/gradient-button";
</script>

<div class="flex flex-wrap justify-center gap-4">
	<div class="flex flex-col items-center gap-2">
		<GradientButton borderRadius={0} class="font-medium text-white">Square</GradientButton>
		<span class="text-muted-foreground text-xs">0px</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<GradientButton borderRadius={8} class="font-medium text-white">Rounded</GradientButton>
		<span class="text-muted-foreground text-xs">8px (default)</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<GradientButton borderRadius={100} class="font-medium text-white">Pill</GradientButton>
		<span class="text-muted-foreground text-xs">100px</span>
	</div>
</div>
