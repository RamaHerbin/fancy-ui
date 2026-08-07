<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ThreadList } from "$lib/fancy-ui/thread-list";
	import type { ThreadData } from "$lib/fancy-ui";

	const MINUTE = 60_000;
	const HOUR = 60 * MINUTE;
	const DAY = 24 * HOUR;

	// One reading of the clock, so the fixture keeps its order however long the
	// story stays open.
	const now = Date.now();

	const THREADS: ThreadData[] = [
		{
			id: "t1",
			title: "Retry policy for billing webhooks",
			preview: "So a 429 should back off exponentially, capped at five minutes.",
			updatedAt: now - 4 * MINUTE,
			unread: true,
		},
		{
			id: "t2",
			title: "Migration plan for the events table",
			preview: "Split it before the backfill, not after.",
			updatedAt: now - 3 * HOUR,
		},
		{
			id: "t3",
			title: "Naming the new endpoint",
			preview: "/v2/runs reads better than /v2/executions.",
			updatedAt: now - 26 * HOUR,
		},
		{
			id: "t4",
			title: "Why the dashboard is slow on Mondays",
			preview: "Every cron lands at 00:00 UTC and they all query the same index.",
			updatedAt: now - 3 * DAY,
		},
	];

	const { Story } = defineMeta({
		title: "AI Chat/ThreadList",
		component: ThreadList,
		tags: ["autodocs"],
		args: {
			threads: THREADS,
			activeId: "t2",
			label: "Conversations",
		},
		argTypes: {
			threads: { control: "object", description: "The conversations to list" },
			activeId: { control: "text", description: "Id of the selected conversation (bindable)" },
			label: { control: "text", description: "Accessible name for the list" },
			onSelect: { action: "select", description: "Called with the conversation picked" },
			onDelete: {
				action: "delete",
				description: "Supplying it puts a delete button on every row",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-xs p-6">
		<ThreadList {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="With Delete" {template} args={{ onDelete: () => {} }} />

<Story name="Empty" {template} args={{ threads: [], activeId: undefined }} />
