<script lang="ts">
	import { GradientButton } from "$lib/fancy-ui/gradient-button";
</script>

<div class="flex flex-wrap justify-center gap-4">
	<div class="flex flex-col items-center gap-2">
		<GradientButton sound duration={1000} class="font-medium text-white">Fast</GradientButton>
		<span class="text-muted-foreground text-xs">1000ms</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<GradientButton sound duration={2500} class="font-medium text-white">Default</GradientButton>
		<span class="text-muted-foreground text-xs">2500ms</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<GradientButton sound duration={5000} class="font-medium text-white">Slow</GradientButton>
		<span class="text-muted-foreground text-xs">5000ms</span>
	</div>
</div>
