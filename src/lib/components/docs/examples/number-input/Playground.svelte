<script lang="ts">
	import { NumberInput } from "$lib/fancy-ui/number-input";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	let quantity = $state<number | null>(12);
</script>

<PropsPlayground
	component="NumberInput"
	slug="number-input"
	controls={[
		{ key: "min", type: "number", label: "Min", step: 1 },
		{ key: "max", type: "number", label: "Max", step: 1 },
		{ key: "step", type: "range", label: "Step", min: 0.1, max: 10, step: 0.1 },
		{ key: "label", type: "text", label: "Label", maxLength: 30 },
		{ key: "disabled", type: "boolean", label: "Disabled" },
		{ key: "readonly", type: "boolean", label: "Read only" },
		{ key: "required", type: "boolean", label: "Required" },
		{ key: "invalid", type: "boolean", label: "Invalid" },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		min: 0,
		max: 100,
		step: 1,
		label: "Quantity",
		disabled: false,
		readonly: false,
		required: false,
		invalid: false,
		sound: false,
	}}
>
	{#snippet preview(values)}
		<div class="w-48">
			<NumberInput
				bind:value={quantity}
				min={values.min as number}
				max={values.max as number}
				step={values.step as number}
				label={values.label as string}
				disabled={values.disabled as boolean}
				readonly={values.readonly as boolean}
				required={values.required as boolean}
				invalid={values.invalid as boolean}
				sound={values.sound as boolean}
			/>
		</div>
	{/snippet}
</PropsPlayground>
