<script lang="ts">
	import type { BooleanPropSchema } from "../../types/registry.js";

	interface Props {
		value: boolean;
		schema: BooleanPropSchema;
		onchange: (value: boolean) => void;
	}

	let { value, schema, onchange }: Props = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={value}
	aria-label={schema.label}
	class="focus:ring-ring focus:ring-offset-background relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none {value
		? 'bg-primary'
		: 'bg-muted'}"
	onclick={() => onchange(!value)}
>
	<span
		class="bg-background pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform {value
			? 'translate-x-5'
			: 'translate-x-0'}"
	></span>
</button>
