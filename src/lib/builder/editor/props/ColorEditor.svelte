<script lang="ts">
	import type { ColorPropSchema } from '../../types/registry.js';

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
		class="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-border bg-input p-0.5"
		{value}
		oninput={(e) => onchange(e.currentTarget.value)}
	/>
	<input
		type="text"
		class="h-9 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
		{value}
		oninput={(e) => onchange(e.currentTarget.value)}
	/>
</div>
