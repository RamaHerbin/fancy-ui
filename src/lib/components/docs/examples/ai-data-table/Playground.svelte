<script lang="ts">
	import { AiDataTable } from "$lib/fancy-ui/ai-data-table";
	import type { AiDataTableColumn, AiDataTableRow } from "$lib/fancy-ui/ai-data-table";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	const columns: AiDataTableColumn[] = [
		{ key: "option", label: "Deployment" },
		{ key: "latency", label: "p95 latency (ms)", numeric: true },
		{ key: "cost", label: "Cost / 1M req", numeric: true },
		{ key: "selfHosted", label: "Self-hosted", align: "center" },
		{ key: "sla", label: "SLA" },
	];

	const rows: AiDataTableRow[] = [
		{ option: "Managed cluster", latency: 42, cost: 18.4, selfHosted: false, sla: "99.95%" },
		{ option: "Serverless pool", latency: 88, cost: 6.2, selfHosted: false, sla: "99.9%" },
		{ option: "Self-run nodes", latency: 31, cost: 24.9, selfHosted: true, sla: null },
	];
</script>

<PropsPlayground
	component="AiDataTable"
	slug="ai-data-table"
	required={["columns", "rows"]}
	controls={[
		{ key: "caption", type: "text", label: "Caption", maxLength: 80 },
		{ key: "captionVisible", type: "boolean", label: "Caption visible" },
		{ key: "dense", type: "boolean", label: "Dense" },
		{
			key: "highlightColumn",
			type: "select",
			label: "Highlight column",
			options: [
				{ value: "", label: "none" },
				...columns.map((c) => ({ value: c.key, label: c.key })),
			],
		},
	]}
	initialValues={{
		caption: "Inference deployments compared on cost and latency",
		captionVisible: true,
		dense: false,
		highlightColumn: "cost",
	}}
>
	{#snippet preview(values)}
		<div class="w-[36rem] max-w-[85vw]">
			<AiDataTable
				{columns}
				{rows}
				caption={values.caption as string}
				captionVisible={values.captionVisible as boolean}
				dense={values.dense as boolean}
				highlightColumn={(values.highlightColumn as string) || undefined}
			/>
		</div>
	{/snippet}
</PropsPlayground>
