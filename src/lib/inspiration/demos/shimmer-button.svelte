<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { ShimmerButton } from "$lib/fancy-ui/shimmer-button";

	let { values }: { values: PlaygroundValues } = $props();
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<ShimmerButton
		shimmerColor={values.shimmerColor as string}
		shimmerDuration={values.shimmerDuration as string}
		class="text-sm font-medium"
	>
		Get early access
	</ShimmerButton>
</div>
