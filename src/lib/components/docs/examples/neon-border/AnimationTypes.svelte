<script lang="ts">
	import { NeonBorder } from "$lib/fancy-ui/neon-border";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<NeonBorder animationType="none" class="max-w-[200px]">
		<div class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2">
			<span class="text-xs">none (static)</span>
		</div>
	</NeonBorder>
	<NeonBorder animationType="half" class="max-w-[200px]">
		<div class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2">
			<span class="text-xs">half</span>
		</div>
	</NeonBorder>
	<NeonBorder animationType="full" class="max-w-[200px]">
		<div class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2">
			<span class="text-xs">full</span>
		</div>
	</NeonBorder>
</div>
