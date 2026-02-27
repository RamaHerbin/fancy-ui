<script lang="ts">
	import type { NumberPropSchema } from "../../types/registry.js";

	interface Props {
		value: number;
		schema: NumberPropSchema;
		onchange: (value: number) => void;
	}

	let { value, schema, onchange }: Props = $props();
</script>

<input
	type="number"
	class="border-border bg-input text-foreground focus:ring-ring h-9 w-full rounded-md border px-3 text-sm focus:ring-2 focus:outline-none"
	{value}
	min={schema.min}
	max={schema.max}
	step={schema.step}
	oninput={(e) => {
		const num = parseFloat(e.currentTarget.value);
		if (!Number.isNaN(num)) onchange(num);
	}}
/>
