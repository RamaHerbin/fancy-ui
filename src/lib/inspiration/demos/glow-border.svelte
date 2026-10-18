<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { GlowBorder, type GlowBorderPreset } from "$lib/fancy-ui/glow-border";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<div class="bg-card relative w-full max-w-[260px] rounded-[14px] p-5">
		<p class="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">Pro plan</p>
		<p class="mt-2 text-2xl font-semibold tracking-tight">$24</p>
		<p class="text-muted-foreground mt-1 text-xs">Every component, every port.</p>
		<GlowBorder
			borderRadius={14}
			preset={values.preset as GlowBorderPreset}
			strength={values.strength as number}
		/>
	</div>
</div>
