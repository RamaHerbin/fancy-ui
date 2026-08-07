<script lang="ts">
	import { AiDataTable } from "$lib/fancy-ui/ai-data-table";
	import type { AiDataTableColumn, AiDataTableRow } from "$lib/fancy-ui/ai-data-table";

	// Exactly the shape a model hands back when asked to compare things: five
	// criteria, four kinds of value, and one cell it could not fill.
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

<div class="flex w-full max-w-2xl flex-col gap-2 p-6">
	<AiDataTable
		{columns}
		{rows}
		caption="Inference deployments compared on cost, latency and operational load"
		captionVisible
		highlightColumn="cost"
	/>

	<p class="text-muted-foreground mt-2 text-xs">
		The tinted column is the one the answer turned on. Nothing here sorts or filters — the order is
		the order the model chose, and changing it would be editing the answer.
	</p>
</div>
