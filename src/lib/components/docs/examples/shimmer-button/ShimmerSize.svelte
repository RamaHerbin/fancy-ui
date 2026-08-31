<script lang="ts">
	import { ShimmerButton } from "$lib/fancy-ui/shimmer-button";
</script>

<div class="flex flex-wrap justify-center gap-4">
	<div class="flex flex-col items-center gap-2">
		<ShimmerButton sound shimmerSize="0.03em">Thin</ShimmerButton>
		<span class="text-muted-foreground text-xs">0.03em</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<ShimmerButton sound shimmerSize="0.05em">Default</ShimmerButton>
		<span class="text-muted-foreground text-xs">0.05em</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<ShimmerButton sound shimmerSize="0.1em">Thick</ShimmerButton>
		<span class="text-muted-foreground text-xs">0.1em</span>
	</div>
</div>
