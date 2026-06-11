<script lang="ts">
	import { GradientButton } from "$lib/fancy-ui/gradient-button";
</script>

<div class="flex flex-wrap justify-center gap-4">
	<div class="flex flex-col items-center gap-2">
		<GradientButton colors={["#3b82f6", "#8b5cf6", "#3b82f6"]} class="font-medium text-white">
			Blue &rarr; Purple
		</GradientButton>
		<span class="text-muted-foreground text-xs">Blue / Purple</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<GradientButton colors={["#f43f5e", "#fb923c", "#f43f5e"]} class="font-medium text-white">
			Rose &rarr; Orange
		</GradientButton>
		<span class="text-muted-foreground text-xs">Rose / Orange</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<GradientButton colors={["#10b981", "#06b6d4", "#10b981"]} class="font-medium text-white">
			Emerald &rarr; Cyan
		</GradientButton>
		<span class="text-muted-foreground text-xs">Emerald / Cyan</span>
	</div>
</div>
