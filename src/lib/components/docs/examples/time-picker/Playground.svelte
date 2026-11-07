<script lang="ts">
	import { TimePicker } from "$lib/fancy-ui/time-picker";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	let time = $state<string | null>(null);
</script>

<PropsPlayground
	component="TimePicker"
	slug="time-picker"
	controls={[
		{ key: "label", type: "text", label: "Label", maxLength: 30 },
		{ key: "placeholder", type: "text", label: "Placeholder", maxLength: 30 },
		{ key: "step", type: "range", label: "Step (min)", min: 5, max: 120, step: 5 },
		{ key: "min", type: "text", label: "Min (HH:mm)", maxLength: 5 },
		{ key: "max", type: "text", label: "Max (HH:mm)", maxLength: 5 },
		{ key: "hour12", type: "boolean", label: "12-hour clock" },
		{
			key: "locale",
			type: "select",
			label: "Locale",
			options: [
				{ value: "", label: "runtime" },
				{ value: "en-US", label: "en-US" },
				{ value: "fr-FR", label: "fr-FR" },
				{ value: "de-DE", label: "de-DE" },
				{ value: "ja-JP", label: "ja-JP" },
			],
		},
		{ key: "disabled", type: "boolean", label: "Disabled" },
		{ key: "required", type: "boolean", label: "Required" },
		{ key: "invalid", type: "boolean", label: "Invalid" },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		label: "Time",
		placeholder: "Select a time",
		step: 30,
		min: "",
		max: "",
		hour12: false,
		locale: "",
		disabled: false,
		required: false,
		invalid: false,
		sound: false,
	}}
>
	{#snippet preview(values)}
		<div class="w-64">
			<TimePicker
				bind:value={time}
				label={values.label as string}
				placeholder={values.placeholder as string}
				step={values.step as number}
				min={(values.min as string) || undefined}
				max={(values.max as string) || undefined}
				hour12={values.hour12 as boolean}
				locale={(values.locale as string) || undefined}
				disabled={values.disabled as boolean}
				required={values.required as boolean}
				invalid={values.invalid as boolean}
				sound={values.sound as boolean}
			/>
		</div>
	{/snippet}
</PropsPlayground>
