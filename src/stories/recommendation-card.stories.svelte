<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { RecommendationCard } from "$lib/fancy-ui/recommendation-card";

	const { Story } = defineMeta({
		title: "AI Agents/RecommendationCard",
		component: RecommendationCard,
		tags: ["autodocs"],
		args: {
			badge: "Suggestion",
			title: "Add an index on orders.customer_id",
			description: "The three slowest queries this week all scanned the whole table.",
		},
		argTypes: {
			confidence: {
				control: { type: "range", min: 0, max: 1, step: 0.01 },
				description: "How sure the agent is, 0–1; omitted, the confidence block disappears",
			},
			state: {
				control: "select",
				options: ["open", "accepted", "dismissed"],
				description: "Where the recommendation stands (bindable)",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-xl p-6">
		<RecommendationCard {...args} />
	</div>
{/snippet}

<Story name="Open" {template} />

<Story name="High Confidence" {template} args={{ confidence: 0.87 }} />

<Story
	name="Low Confidence"
	{template}
	args={{
		badge: "Speculative",
		title: "Cache the pricing lookup for 60 seconds",
		description: "Prices changed twice last quarter, but the traffic here is modest.",
		confidence: 0.42,
		acceptLabel: "Apply patch",
		dismissLabel: "Not now",
	}}
/>

<Story name="Accepted" {template} args={{ confidence: 0.87, state: "accepted" }} />
