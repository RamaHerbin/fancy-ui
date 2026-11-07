import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

/** The data the playground renders, written into the usage so the copy stands on its own. */
export const DATA = `const columns = [
	{ key: "option", label: "Deployment" },
	{ key: "latency", label: "p95 latency (ms)", numeric: true },
	{ key: "cost", label: "Cost / 1M req", numeric: true },
	{ key: "selfHosted", label: "Self-hosted", align: "center" },
	{ key: "sla", label: "SLA" },
];

const rows = [
	{ option: "Managed cluster", latency: 42, cost: 18.4, selfHosted: false, sla: "99.95%" },
	{ option: "Serverless pool", latency: 88, cost: 6.2, selfHosted: false, sla: "99.9%" },
	{ option: "Self-run nodes", latency: 31, cost: 24.9, selfHosted: true, sla: null },
];`;

/**
 * The usage per framework: a table is nothing without its `columns` and `rows`,
 * which live outside the playground's controls, so the export carries the
 * data definitions and passes both required props.
 */
export function aiDataTableCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	if (values.caption) attrs.push(attribute("caption", String(values.caption), framework));
	if (values.captionVisible === false)
		attrs.push(framework === "vue" ? ':caption-visible="false"' : "captionVisible={false}");
	if (values.dense === true) attrs.push("dense");
	if (values.highlightColumn)
		attrs.push(attribute("highlightColumn", String(values.highlightColumn), framework));
	const props = attrs.map((a) => `\n\t${a}`).join("");
	if (framework === "vue") {
		return `<script setup lang="ts">
${DATA}
</script>

<AiDataTable :columns="columns" :rows="rows"${props} />`;
	}
	if (framework === "react") {
		return `${DATA}

<AiDataTable columns={columns} rows={rows}${props} />`;
	}
	return `<script lang="ts">
${DATA}
</script>

<AiDataTable {columns} {rows}${props} />`;
}
