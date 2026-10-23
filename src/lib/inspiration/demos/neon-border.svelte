<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { NeonBorder } from "$lib/fancy-ui/neon-border";
	import HdrBadge from "$lib/components/inspiration/HdrBadge.svelte";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="relative flex h-full w-full items-center justify-center p-6">
	<NeonBorder
		hdr={values.hdr !== false}
		color1={values.color1 as string}
		color2={values.color2 as string}
		animationType={values.animationType as "none" | "half" | "full"}
		class="max-w-[200px]"
	>
		<div class="bg-background flex h-full w-full items-center justify-center rounded-lg px-6 py-2">
			<span class="text-sm font-medium">Neon Border</span>
		</div>
	</NeonBorder>
	<HdrBadge />
</div>
