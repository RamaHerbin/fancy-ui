<script lang="ts">
	import { Compare } from "$lib/fancy-ui/compare";
</script>

<div class="flex justify-center">
	<Compare class="rounded-lg">
		{#snippet firstContent()}
			<div
				class="flex size-full items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600"
			>
				<span class="text-2xl font-bold text-white">Before</span>
			</div>
		{/snippet}
		{#snippet secondContent()}
			<div
				class="flex size-full items-center justify-center bg-gradient-to-br from-rose-600 to-orange-600"
			>
				<span class="text-2xl font-bold text-white">After</span>
			</div>
		{/snippet}
	</Compare>
</div>
