<script lang="ts">
	import { GradientButton } from "$lib/fancy-ui/gradient-button";
</script>

<div class="flex flex-wrap justify-center gap-4">
	<div class="flex flex-col items-center gap-2">
		<GradientButton borderWidth={1} blur={2} class="font-medium text-white">
			Thin & Sharp
		</GradientButton>
		<span class="text-muted-foreground text-xs">1px / 2px blur</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<GradientButton borderWidth={2} blur={4} class="font-medium text-white">Default</GradientButton>
		<span class="text-muted-foreground text-xs">2px / 4px blur</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<GradientButton borderWidth={4} blur={8} class="font-medium text-white">
			Thick & Soft
		</GradientButton>
		<span class="text-muted-foreground text-xs">4px / 8px blur</span>
	</div>
</div>
