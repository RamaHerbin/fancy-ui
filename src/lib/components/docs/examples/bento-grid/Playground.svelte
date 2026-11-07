<script lang="ts">
	import { BentoGrid, BentoGridItem } from "$lib/fancy-ui/bento-grid";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import Activity from "@lucide/svelte/icons/activity";
	import Rocket from "@lucide/svelte/icons/rocket";
	import Gauge from "@lucide/svelte/icons/gauge";

	const tiles = [
		{
			title: "Latency, at a glance",
			text: "Every request, folded into one quiet line.",
			wide: true,
		},
		{ title: "Deploy queue", text: "Ship in order, roll back in one move.", wide: false },
		{ title: "Uptime", text: "One amber day in twenty.", wide: false },
	];
</script>

<PropsPlayground
	component="BentoGrid"
	slug="bento-grid"
	controls={[
		{ key: "reveal", type: "boolean", label: "Reveal on scroll" },
		{ key: "accent", type: "color", label: "Accent" },
	]}
	initialValues={{ reveal: true, accent: "#f2b880" }}
>
	{#snippet preview(values)}
		<div
			class="relative w-[34rem] max-w-[85vw] overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] p-3 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
		>
			<BentoGrid reveal={values.reveal as boolean} accent={values.accent as string}>
				{#each tiles as tile, i (tile.title)}
					<BentoGridItem class={tile.wide ? "md:col-span-2" : ""}>
						{#snippet header()}
							<div
								class="min-h-[3.5rem] flex-1 rounded-lg border border-black/[0.06] bg-white/70 dark:border-white/[0.06] dark:bg-white/[0.02]"
							></div>
						{/snippet}
						{#snippet icon()}
							{#if i === 0}<Activity />{:else if i === 1}<Rocket />{:else}<Gauge />{/if}
						{/snippet}
						{#snippet title()}{tile.title}{/snippet}
						{#snippet description()}{tile.text}{/snippet}
					</BentoGridItem>
				{/each}
			</BentoGrid>
		</div>
	{/snippet}
</PropsPlayground>
