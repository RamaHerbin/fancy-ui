<script lang="ts">
	import { PulseBeam } from "$lib/fancy-ui/pulse-beam";
	import ArrowUp from "@lucide/svelte/icons/arrow-up";
	import Bot from "@lucide/svelte/icons/bot";
	import Sparkles from "@lucide/svelte/icons/sparkles";
</script>

<!-- The child owns the surface: opaque background + the same radius as the beam. -->
<PulseBeam radius={20} class="mx-auto w-full max-w-md">
	<div class="bg-card rounded-[20px] p-4">
		<p class="text-muted-foreground text-sm">Build anything…</p>
		<div class="mt-8 flex items-center gap-2">
			<span
				class="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
			>
				<Bot class="size-3.5" />
				Agent
			</span>
			<span
				class="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
			>
				<Sparkles class="size-3.5" />
				Auto
			</span>
			<span
				class="bg-foreground text-background ml-auto inline-flex size-8 items-center justify-center rounded-full"
			>
				<ArrowUp class="size-4" />
			</span>
		</div>
	</div>
</PulseBeam>
