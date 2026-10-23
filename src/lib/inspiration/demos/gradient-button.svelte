<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { GradientButton } from "$lib/fancy-ui/gradient-button";
	import HdrBadge from "$lib/components/inspiration/HdrBadge.svelte";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="relative flex h-full w-full items-center justify-center p-6">
	<GradientButton
		hdr={values.hdr !== false}
		duration={values.duration as number}
		blur={values.blur as number}
		class="text-sm font-medium"
	>
		Generate
	</GradientButton>
	<HdrBadge />
</div>
