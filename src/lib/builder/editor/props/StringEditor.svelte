<script lang="ts">
	import type { StringPropSchema, ImagePropSchema } from "../../types/registry.js";

	interface Props {
		value: string;
		schema: StringPropSchema | ImagePropSchema;
		onchange: (value: string) => void;
	}

	let { value, schema, onchange }: Props = $props();

	let multiline = $derived(schema.type === "string" && schema.multiline);
	let placeholder = $derived(schema.type === "string" ? (schema.placeholder ?? "") : "");
</script>

{#if multiline}
	<textarea
		class="border-border bg-input text-foreground placeholder:text-muted-foreground focus:ring-ring h-20 w-full resize-y rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
		{value}
		{placeholder}
		oninput={(e) => onchange(e.currentTarget.value)}
	></textarea>
{:else}
	<input
		type="text"
		class="border-border bg-input text-foreground placeholder:text-muted-foreground focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:ring-2 focus:outline-none"
		{value}
		{placeholder}
		oninput={(e) => onchange(e.currentTarget.value)}
	/>
{/if}
