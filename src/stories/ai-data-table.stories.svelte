<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { AiDataTable } from "$lib/fancy-ui/ai-data-table";
	import type { AiDataTableColumn, AiDataTableRow } from "$lib/fancy-ui/ai-data-table";

	const COLUMNS: AiDataTableColumn[] = [
		{ key: "option", label: "Deployment" },
		{ key: "latency", label: "p95 latency (ms)", numeric: true },
		{ key: "cost", label: "Cost / 1M req", numeric: true },
		{ key: "selfHosted", label: "Self-hosted", align: "center" },
		{ key: "sla", label: "SLA" },
		{ key: "effort", label: "Ops effort" },
	];

	const ROWS: AiDataTableRow[] = [
		{
			option: "Managed cluster",
			latency: 42,
			cost: 18.4,
			selfHosted: false,
			sla: "99.95%",
			effort: "Low",
		},
		{
			option: "Serverless pool",
			latency: 88,
			cost: 6.2,
			selfHosted: false,
			sla: "99.9%",
			effort: "None",
		},
		{
			option: "Self-run nodes",
			latency: 31,
			cost: 24.9,
			selfHosted: true,
			sla: null,
			effort: "High",
		},
	];

	const { Story } = defineMeta({
		title: "AI Agents/AiDataTable",
		component: AiDataTable,
		tags: ["autodocs"],
		args: {
			columns: COLUMNS,
			rows: ROWS,
		},
		argTypes: {
			columns: {
				control: "object",
				description: "The columns to render, in order",
			},
			rows: {
				control: "object",
				description: "The rows to render, in the order the model produced them",
			},
			caption: {
				control: "text",
				description: "Describes the table for assistive tech; hidden unless captionVisible",
			},
			captionVisible: {
				control: "boolean",
				description: "Shows the caption as a muted line above the table",
			},
			dense: {
				control: "boolean",
				description: "Tighter rows, for a table read at a glance",
			},
			highlightColumn: {
				control: "text",
				description: "Key of the column to tint",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<div class="w-full max-w-2xl p-6">
		<AiDataTable {...args} />
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Dense" {template} args={{ dense: true }} />

<Story name="Highlighted" {template} args={{ highlightColumn: "cost" }} />

<Story
	name="With Caption"
	{template}
	args={{
		caption: "Inference deployments compared on cost, latency and operational load",
		captionVisible: true,
		highlightColumn: "cost",
	}}
/>

<Story
	name="Many Columns"
	{template}
	args={{
		columns: [
			...COLUMNS,
			{ key: "region", label: "Primary region" },
			{ key: "gpu", label: "GPU pinned", align: "center" },
			{ key: "quota", label: "Req/s quota", numeric: true },
		],
		rows: ROWS.map((row, i) => ({
			...row,
			region: ["eu-west-1", "us-east-1", "on-prem"][i],
			gpu: [false, false, true][i],
			quota: [1200, 400, 2500][i],
		})),
		highlightColumn: "cost",
	}}
/>
