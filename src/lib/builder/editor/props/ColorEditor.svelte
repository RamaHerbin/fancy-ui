<script lang="ts">
	import type { ColorPropSchema } from "../../types/registry.js";

	interface Props {
		value: string;
		schema: ColorPropSchema;
		onchange: (value: string) => void;
	}

	let { value, schema: _schema, onchange }: Props = $props();
</script>

<div class="flex items-center gap-2">
	<input
		type="color"
		class="border-border bg-input h-9 w-9 shrink-0 cursor-pointer rounded-md border p-0.5"
		{value}
		oninput={(e) => onchange(e.currentTarget.value)}
	/>
	<input
		type="text"
		class="border-border bg-input text-foreground focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:ring-2 focus:outline-none"
		{value}
		oninput={(e) => onchange(e.currentTarget.value)}
	/>
</div>
