<script lang="ts">
	import type { SelectPropSchema } from '../../types/registry.js';

	interface Props {
		value: string;
		schema: SelectPropSchema;
		onchange: (value: string) => void;
	}

	let { value, schema, onchange }: Props = $props();
</script>

<select
	class="h-9 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
	{value}
	onchange={(e) => onchange(e.currentTarget.value)}
>
	{#each schema.options as opt}
		<option value={opt.value} selected={opt.value === value}>{opt.label}</option>
	{/each}
</select>
