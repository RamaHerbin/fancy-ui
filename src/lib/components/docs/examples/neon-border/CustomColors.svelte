<script lang="ts">
	import { NeonBorder } from "$lib/fancy-ui/neon-border";
</script>

<div class="flex flex-wrap justify-center gap-6">
	<NeonBorder color1="#22c55e" color2="#3b82f6" class="max-w-[200px]">
		<div class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2">
			<span class="text-xs">Green → Blue</span>
		</div>
	</NeonBorder>
	<NeonBorder color1="#f59e0b" color2="#ef4444" class="max-w-[200px]">
		<div class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2">
			<span class="text-xs">Amber → Red</span>
		</div>
	</NeonBorder>
	<NeonBorder color1="#a855f7" color2="#ec4899" class="max-w-[200px]">
		<div class="bg-background flex h-full w-full items-center justify-center rounded-lg px-4 py-2">
			<span class="text-xs">Purple → Pink</span>
		</div>
	</NeonBorder>
</div>
