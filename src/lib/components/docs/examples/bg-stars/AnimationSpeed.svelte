<script lang="ts">
	import { StarsBackground } from "$lib/fancy-ui/bg-stars";
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
	<div class="overflow-hidden rounded-lg border">
		<StarsBackground class="h-[200px]" speed={20}>
			<div class="relative z-10 flex h-full items-center justify-center">
				<p class="text-sm text-white/80">speed=20 (fast)</p>
			</div>
		</StarsBackground>
	</div>
	<div class="overflow-hidden rounded-lg border">
		<StarsBackground class="h-[200px]" speed={100}>
			<div class="relative z-10 flex h-full items-center justify-center">
				<p class="text-sm text-white/80">speed=100 (slow)</p>
			</div>
		</StarsBackground>
	</div>
</div>
