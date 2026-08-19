<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { ToolCall } from "$lib/fancy-ui/tool-call";
	import type { ToolCallData } from "$lib/fancy-ui";

	const DONE: ToolCallData = {
		id: "call_1",
		name: "search_docs",
		status: "done",
		input: { query: "retry policy", limit: 3 },
		output: { hits: 3, top: "billing/retries.md", tookMs: 812 },
		durationMs: 1400,
	};

	const { Story } = defineMeta({
		title: "AI Agents/ToolCall",
		component: ToolCall,
		tags: ["autodocs"],
		args: {
			call: DONE,
		},
		argTypes: {
			call: {
				control: "object",
				description: "The invocation to render: name, status, and whatever payloads exist so far",
			},
			open: {
				control: "boolean",
				description:
					"Expanded state; left undefined the card stays collapsed until a failure or a click",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-xl p-6">
		<ToolCall {...args} />
	</div>
{/snippet}

<Story name="Done" {template} />

<Story name="Done Open" {template} args={{ open: true }} />

<Story
	name="Running"
	{template}
	args={{
		call: {
			id: "call_2",
			name: "fetch_changelog",
			status: "running",
			input: { repo: "acme/billing", since: "2026-07-01" },
			durationMs: 4200,
		},
	}}
/>

<Story
	name="Pending"
	{template}
	args={{
		call: { id: "call_3", name: "run_migrations", status: "pending" },
	}}
/>

<Story
	name="Error"
	{template}
	args={{
		call: {
			id: "call_4",
			name: "post_summary",
			status: "error",
			input: { channel: "#releases", blocks: 4 },
			error: "429 Too Many Requests — that channel is rate limited for another 38s.",
			durationMs: 240,
		},
	}}
/>

<Story
	name="Cancelled"
	{template}
	args={{
		call: {
			id: "call_5",
			name: "deploy_preview",
			status: "cancelled",
			input: { branch: "feat/retries" },
			durationMs: 900,
		},
	}}
/>

<Story
	name="Long Payload"
	{template}
	args={{
		open: true,
		call: {
			id: "call_6",
			name: "list_invoices",
			status: "done",
			input: { customer: "cus_9K2", status: "open", limit: 20 },
			output: {
				invoices: Array.from({ length: 12 }, (_, i) => ({
					id: `in_${1000 + i}`,
					amountDue: 1200 + i * 37,
					currency: "eur",
					dueAt: `2026-08-${String(i + 1).padStart(2, "0")}`,
				})),
			},
			durationMs: 2600,
		},
	}}
/>
