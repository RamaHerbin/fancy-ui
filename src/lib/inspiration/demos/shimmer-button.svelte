<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { ShimmerButton } from "$lib/fancy-ui/shimmer-button";
	import HdrBadge from "$lib/components/inspiration/HdrBadge.svelte";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="relative flex h-full w-full items-center justify-center p-6">
	<ShimmerButton
		shimmerColor={values.shimmerColor as string}
		shimmerDuration={values.shimmerDuration as string}
		hdr={values.hdr !== false}
		class="text-sm font-medium"
	>
		Get early access
	</ShimmerButton>
	<HdrBadge />
</div>
