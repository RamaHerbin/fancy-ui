<script lang="ts">
	import { ShimmerButton } from "$lib/fancy-ui/shimmer-button";
</script>

<div class="flex flex-wrap justify-center gap-4">
	<div class="flex flex-col items-center gap-2">
		<ShimmerButton sound shimmerColor="#ffffff">White</ShimmerButton>
		<span class="text-muted-foreground text-xs">#ffffff</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<ShimmerButton sound shimmerColor="#60a5fa">Blue</ShimmerButton>
		<span class="text-muted-foreground text-xs">#60a5fa</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<ShimmerButton sound shimmerColor="#f472b6">Pink</ShimmerButton>
		<span class="text-muted-foreground text-xs">#f472b6</span>
	</div>
	<div class="flex flex-col items-center gap-2">
		<ShimmerButton sound shimmerColor="#4ade80">Green</ShimmerButton>
		<span class="text-muted-foreground text-xs">#4ade80</span>
	</div>
</div>
