<script lang="ts">
	import type { PlaygroundValues } from "$lib/finds/types.js";
	import { PulseBeam } from "$lib/fancy-ui/pulse-beam";
	import type { PulseBeamPalette, PulseBeamVariant } from "$lib/fancy-ui/pulse-beam";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="flex h-full w-full items-center justify-center overflow-hidden p-6">
	<PulseBeam
		radius={16}
		palette={values.palette as PulseBeamPalette}
		variant={values.variant as PulseBeamVariant}
		speed={values.speed as number}
		class="w-full max-w-[260px]"
	>
		<div class="bg-card rounded-[16px] p-3">
			<p class="text-muted-foreground text-xs">Ask anything…</p>
			<div class="mt-4 flex items-center justify-end">
				<span
					class="bg-foreground text-background inline-flex size-6 items-center justify-center rounded-full text-xs"
				>
					↑
				</span>
			</div>
		</div>
	</PulseBeam>
</div>
