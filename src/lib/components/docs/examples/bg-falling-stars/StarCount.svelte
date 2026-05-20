<script lang="ts">
	import { FallingStarsBg } from "$lib/fancy-ui/bg-falling-stars";
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
	<div class="relative h-[250px] overflow-hidden rounded-lg border bg-black">
		<FallingStarsBg count={50} />
		<div class="relative z-10 flex h-full items-center justify-center">
			<p class="text-sm text-white/80">count=50 (sparse)</p>
		</div>
	</div>
	<div class="relative h-[250px] overflow-hidden rounded-lg border bg-black">
		<FallingStarsBg count={500} />
		<div class="relative z-10 flex h-full items-center justify-center">
			<p class="text-sm text-white/80">count=500 (dense)</p>
		</div>
	</div>
</div>
