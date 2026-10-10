<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { BorderBeam } from "$lib/fancy-ui/border-beam";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<div
		class="relative w-full max-w-[280px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b0b0c] p-5"
		style="--border-beam-radius: 12px"
	>
		<p class="font-mono text-[10px] tracking-widest text-neutral-500 uppercase">Deploy</p>
		<p class="mt-2 text-sm font-medium text-neutral-100">Building production…</p>
		<div class="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
			<div class="h-full w-2/3 rounded-full bg-white/30"></div>
		</div>
		<BorderBeam
			colorFrom={values.colorFrom as string}
			colorTo={values.colorTo as string}
			tail={values.tail as number}
		/>
	</div>
</div>
