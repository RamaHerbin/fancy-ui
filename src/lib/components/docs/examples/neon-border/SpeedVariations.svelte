<script lang="ts">
	import { NeonBorder } from "$lib/fancy-ui/neon-border";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<NeonBorder duration={2} class="max-w-[200px]">
		<div class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2">
			<span class="text-xs">Fast (2s)</span>
		</div>
	</NeonBorder>
	<NeonBorder duration={6} class="max-w-[200px]">
		<div class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2">
			<span class="text-xs">Default (6s)</span>
		</div>
	</NeonBorder>
	<NeonBorder duration={15} class="max-w-[200px]">
		<div class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2">
			<span class="text-xs">Slow (15s)</span>
		</div>
	</NeonBorder>
</div>
