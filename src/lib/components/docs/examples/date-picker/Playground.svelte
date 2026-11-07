<script lang="ts">
	import { DatePicker } from "$lib/fancy-ui/date-picker";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import { datePickerCode } from "./code.js";

	let selected = $state<Date | null>(null);
</script>

<PropsPlayground
	component="DatePicker"
	slug="date-picker"
	codeFor={datePickerCode}
	controls={[
		{ key: "label", type: "text", label: "Label", maxLength: 30 },
		{ key: "placeholder", type: "text", label: "Placeholder", maxLength: 30 },
		{
			key: "weekStartsOn",
			type: "select",
			label: "Week starts on",
			options: [
				{ value: "1", label: "Monday" },
				{ value: "0", label: "Sunday" },
			],
		},
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
		label: "Date",
		placeholder: "Pick a date",
		weekStartsOn: "1",
		locale: "",
		disabled: false,
		required: false,
		invalid: false,
		sound: false,
	}}
>
	{#snippet preview(values)}
		<div class="w-64">
			{#key values.locale}
				<DatePicker
					bind:value={selected}
					label={values.label as string}
					placeholder={values.placeholder as string}
					weekStartsOn={Number(values.weekStartsOn) as 0 | 1}
					locale={(values.locale as string) || undefined}
					disabled={values.disabled as boolean}
					required={values.required as boolean}
					invalid={values.invalid as boolean}
					sound={values.sound as boolean}
				/>
			{/key}
		</div>
	{/snippet}
</PropsPlayground>
