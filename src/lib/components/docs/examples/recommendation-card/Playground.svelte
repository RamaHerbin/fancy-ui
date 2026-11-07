<script lang="ts">
	import { RecommendationCard } from "$lib/fancy-ui/recommendation-card";
	import type { RecommendationState } from "$lib/fancy-ui/recommendation-card";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	component="RecommendationCard"
	slug="recommendation-card"
	required={["title"]}
	controls={[
		{ key: "badge", type: "text", label: "Badge", maxLength: 24 },
		{ key: "title", type: "text", label: "Title", maxLength: 60 },
		{ key: "description", type: "text", label: "Description", maxLength: 120 },
		{ key: "confidence", type: "range", label: "Confidence", min: 0, max: 1, step: 0.01 },
		{
			key: "state",
			type: "select",
			label: "State",
			options: ["open", "accepted", "dismissed"].map((v) => ({ value: v, label: v })),
		},
		{ key: "acceptLabel", type: "text", label: "Accept label", maxLength: 24 },
		{ key: "dismissLabel", type: "text", label: "Dismiss label", maxLength: 24 },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		badge: "Suggestion",
		title: "Add an index on orders.customer_id",
		description: "The three slowest queries this week all scanned the whole table.",
		confidence: 0.87,
		state: "open",
		acceptLabel: "Apply",
		dismissLabel: "Dismiss",
		sound: false,
	}}
>
	{#snippet preview(values)}
		<div class="w-[28rem] max-w-[85vw]">
			<RecommendationCard
				badge={values.badge as string}
				title={values.title as string}
				description={values.description as string}
				confidence={values.confidence as number}
				state={values.state as RecommendationState}
				acceptLabel={values.acceptLabel as string}
				dismissLabel={values.dismissLabel as string}
				sound={values.sound as boolean}
			>
				<code
					class="block rounded-md bg-black/5 px-2.5 py-1.5 font-mono text-xs text-neutral-600 dark:bg-white/5 dark:text-neutral-400"
				>
					CREATE INDEX orders_customer_id_idx ON orders (customer_id);
				</code>
			</RecommendationCard>
		</div>
	{/snippet}
</PropsPlayground>
