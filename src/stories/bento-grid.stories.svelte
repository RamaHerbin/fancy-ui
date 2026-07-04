<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { BentoGrid, BentoGridItem } from "$lib/fancy-ui/bento-grid";

	const { Story } = defineMeta({
		title: "Cards/BentoGrid",
		component: BentoGrid,
		tags: ["autodocs"],
	});
</script>

{#snippet template()}
	<BentoGrid>
		<BentoGridItem class="md:col-span-2">
			{#snippet header()}
				<div
					class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500"
				></div>
			{/snippet}
			{#snippet title()}Feature One{/snippet}
			{#snippet description()}A powerful feature that helps you build faster.{/snippet}
		</BentoGridItem>

		<BentoGridItem>
			{#snippet header()}
				<div
					class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500"
				></div>
			{/snippet}
			{#snippet title()}Feature Two{/snippet}
			{#snippet description()}Streamline your workflow.{/snippet}
		</BentoGridItem>

		<BentoGridItem>
			{#snippet header()}
				<div
					class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500"
				></div>
			{/snippet}
			{#snippet title()}Feature Three{/snippet}
			{#snippet description()}Beautiful by default.{/snippet}
		</BentoGridItem>

		<BentoGridItem class="md:col-span-2">
			{#snippet header()}
				<div
					class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500"
				></div>
			{/snippet}
			{#snippet title()}Feature Four{/snippet}
			{#snippet description()}Ship with confidence using robust tooling.{/snippet}
		</BentoGridItem>
	</BentoGrid>
{/snippet}

<Story name="Default" {template} />

{#snippet withIcon()}
	<BentoGrid>
		<BentoGridItem>
			{#snippet header()}
				<div
					class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500"
				></div>
			{/snippet}
			{#snippet icon()}
				<div class="text-2xl">⚡</div>
			{/snippet}
			{#snippet title()}Fast{/snippet}
			{#snippet description()}Blazing performance out of the box.{/snippet}
		</BentoGridItem>

		<BentoGridItem>
			{#snippet header()}
				<div
					class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500"
				></div>
			{/snippet}
			{#snippet icon()}
				<div class="text-2xl">🎨</div>
			{/snippet}
			{#snippet title()}Beautiful{/snippet}
			{#snippet description()}Polished visuals with sensible defaults.{/snippet}
		</BentoGridItem>

		<BentoGridItem>
			{#snippet header()}
				<div
					class="flex h-full min-h-[6rem] w-full flex-1 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500"
				></div>
			{/snippet}
			{#snippet icon()}
				<div class="text-2xl">🔒</div>
			{/snippet}
			{#snippet title()}Reliable{/snippet}
			{#snippet description()}Robust tooling you can trust.{/snippet}
		</BentoGridItem>
	</BentoGrid>
{/snippet}

<Story name="With Icons" template={withIcon} />
