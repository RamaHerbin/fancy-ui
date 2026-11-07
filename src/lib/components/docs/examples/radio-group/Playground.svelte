<script lang="ts">
	import {
		RadioGroup,
		RadioGroupItem,
		type RadioGroupOrientation,
	} from "$lib/fancy-ui/radio-group";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	let plan = $state("a");
</script>

<PropsPlayground
	component="RadioGroup"
	slug="radio-group"
	importNames={{ svelte: ["RadioGroup", "RadioGroupItem"] }}
	controls={[
		{
			key: "orientation",
			type: "select",
			label: "Orientation",
			options: [
				{ value: "vertical", label: "vertical" },
				{ value: "horizontal", label: "horizontal" },
			],
		},
		{ key: "label", type: "text", label: "Label", maxLength: 30 },
		{ key: "disabled", type: "boolean", label: "Disabled" },
		{ key: "required", type: "boolean", label: "Required" },
		{ key: "invalid", type: "boolean", label: "Invalid" },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		orientation: "vertical",
		label: "Plan",
		disabled: false,
		required: false,
		invalid: false,
		sound: false,
	}}
>
	{#snippet preview(values)}
		<RadioGroup
			bind:value={plan}
			orientation={values.orientation as RadioGroupOrientation}
			label={values.label as string}
			disabled={values.disabled as boolean}
			required={values.required as boolean}
			invalid={values.invalid as boolean}
			sound={values.sound as boolean}
		>
			<RadioGroupItem value="a" label="Option A" />
			<RadioGroupItem value="b" label="Option B" />
			<RadioGroupItem value="c" label="Option C" />
		</RadioGroup>
	{/snippet}
</PropsPlayground>
