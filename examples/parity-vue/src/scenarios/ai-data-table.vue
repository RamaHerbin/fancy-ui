<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/ai-data-table/BasicUsage.svelte.
import { AiDataTable } from "fancy-ui-vue";
import type { AiDataTableColumn, AiDataTableRow } from "fancy-ui-vue";

const columns: AiDataTableColumn[] = [
	{ key: "option", label: "Deployment" },
	{ key: "latency", label: "p95 latency (ms)", numeric: true },
	{ key: "cost", label: "Cost / 1M req", numeric: true },
	{ key: "selfHosted", label: "Self-hosted", align: "center" },
	{ key: "sla", label: "SLA" },
	{ key: "effort", label: "Ops effort" },
];

const rows: AiDataTableRow[] = [
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
</script>

<template>
	<div class="flex w-full max-w-2xl flex-col gap-2 p-6">
		<AiDataTable
			:columns="columns"
			:rows="rows"
			caption="Inference deployments compared on cost, latency and operational load"
			caption-visible
			highlight-column="cost"
		/>

		<p class="text-muted-foreground mt-2 text-xs">
			The tinted column is the one the answer turned on. Nothing here sorts or filters — the order
			is the order the model chose, and changing it would be editing the answer.
		</p>
	</div>
</template>
