<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { WebSearch } from "$lib/fancy-ui/web-search";
	import type { SearchResultData } from "$lib/fancy-ui";

	const QUERY = "postgres connection pool exhausted under load";

	const RESULTS: SearchResultData[] = [
		{
			id: "h1",
			title: "Why your pool runs dry before your database does",
			url: "https://www.example.dev/posts/pool-exhaustion",
			snippet:
				"Connection limits are usually reached by leaked handles rather than by traffic. The give-away is a pool that never recovers after the spike passes.",
		},
		{
			id: "h2",
			title: "Sizing a connection pool",
			url: "https://notes.example.org/pool-sizing",
			snippet:
				"A pool larger than the server's max_connections turns a queue you can observe into an error you cannot.",
		},
		{
			id: "h3",
			title: "Tracking down a leaked transaction",
			url: "https://example.net/guides/leaked-transactions",
			snippet:
				"pg_stat_activity tells you which query is holding a connection open and for how long it has been idle in transaction.",
		},
		{
			id: "h4",
			title: "Backpressure beats a bigger pool",
			url: "https://blog.example.com/backpressure",
			snippet: "Queueing at the edge fails a request in milliseconds instead of in thirty seconds.",
		},
	];

	const { Story } = defineMeta({
		title: "AI Chat/WebSearch",
		component: WebSearch,
		tags: ["autodocs"],
		args: {
			query: QUERY,
			results: RESULTS,
			searching: false,
			maxVisible: 0,
			label: "Web search",
		},
		argTypes: {
			query: { control: "text", description: "What the agent looked up" },
			results: { control: "object", description: "Hits found so far, oldest first" },
			searching: {
				control: "boolean",
				description: "Whether the lookup is still running",
			},
			maxVisible: {
				control: "number",
				description: "Rows shown before the expander takes over; 0 shows every result",
			},
			label: { control: "text", description: "Accessible name for the whole block" },
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-xl">
		<WebSearch {...args} />
	</div>
{/snippet}

<Story name="Complete" {template} />

<!-- Still running, with the first hits already in: the bar sweeps above them. -->
<Story name="Searching" {template} args={{ results: RESULTS.slice(0, 2), searching: true }} />

<Story name="Nothing found yet" {template} args={{ results: [], searching: true }} />

<Story name="No results" {template} args={{ results: [] }} />

<!-- Supplying onSelect is what turns every row from a link into a button. -->
<Story
	name="Clickable"
	{template}
	args={{
		onSelect: (result: SearchResultData, index: number) =>
			console.log("selected", index, result.title, result.url),
	}}
/>

<Story name="Capped with an expander" {template} args={{ maxVisible: 2 }} />
