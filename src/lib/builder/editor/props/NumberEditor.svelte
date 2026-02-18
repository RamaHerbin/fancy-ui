<script lang="ts">
	import type { NumberPropSchema } from '../../types/registry.js';

	interface Props {
		value: number;
		schema: NumberPropSchema;
		onchange: (value: number) => void;
	}

	let { value, schema, onchange }: Props = $props();
</script>

<input
	type="number"
	class="h-9 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
	{value}
	min={schema.min}
	max={schema.max}
	step={schema.step}
	oninput={(e) => {
		const num = parseFloat(e.currentTarget.value);
		if (!Number.isNaN(num)) onchange(num);
	}}
/>
