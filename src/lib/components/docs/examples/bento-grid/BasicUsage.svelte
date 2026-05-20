<script lang="ts">
	import { BentoGrid, BentoGridItem } from "$lib/fancy-ui/bento-grid";
</script>

<BentoGrid>
	<BentoGridItem class="md:col-span-2">
		{#snippet header()}
			<div class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500"></div>
		{/snippet}
		{#snippet title()}Feature One{/snippet}
		{#snippet description()}A powerful feature that helps you build faster.{/snippet}
	</BentoGridItem>

	<BentoGridItem>
		{#snippet header()}
			<div class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500"></div>
		{/snippet}
		{#snippet title()}Feature Two{/snippet}
		{#snippet description()}Streamline your workflow.{/snippet}
	</BentoGridItem>

	<BentoGridItem>
		{#snippet header()}
			<div class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500"></div>
		{/snippet}
		{#snippet title()}Feature Three{/snippet}
		{#snippet description()}Beautiful by default.{/snippet}
	</BentoGridItem>

	<BentoGridItem class="md:col-span-2">
		{#snippet header()}
			<div class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500"></div>
		{/snippet}
		{#snippet title()}Feature Four{/snippet}
		{#snippet description()}Ship with confidence using robust tooling.{/snippet}
	</BentoGridItem>
</BentoGrid>
