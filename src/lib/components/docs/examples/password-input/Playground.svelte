<script lang="ts">
	import { PasswordInput } from "$lib/fancy-ui/password-input";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	let password = $state("correct horse 7!");
</script>

<PropsPlayground
	component="PasswordInput"
	slug="password-input"
	controls={[
		{ key: "label", type: "text", label: "Label", maxLength: 30 },
		{ key: "placeholder", type: "text", label: "Placeholder", maxLength: 40 },
		{
			key: "autocomplete",
			type: "select",
			label: "Autocomplete",
			options: ["current-password", "new-password", "off"].map((v) => ({ value: v, label: v })),
		},
		{ key: "showToggle", type: "boolean", label: "Show toggle" },
		{ key: "showStrength", type: "boolean", label: "Show strength" },
		{ key: "disabled", type: "boolean", label: "Disabled" },
		{ key: "readonly", type: "boolean", label: "Read only" },
		{ key: "required", type: "boolean", label: "Required" },
		{ key: "invalid", type: "boolean", label: "Invalid" },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		label: "Password",
		placeholder: "Enter your password",
		autocomplete: "current-password",
		showToggle: true,
		showStrength: true,
		disabled: false,
		readonly: false,
		required: false,
		invalid: false,
		sound: false,
	}}
>
	{#snippet preview(values)}
		<div class="w-72 max-w-[85vw]">
			<PasswordInput
				bind:value={password}
				label={values.label as string}
				placeholder={values.placeholder as string}
				autocomplete={values.autocomplete as "current-password" | "new-password" | "off"}
				showToggle={values.showToggle as boolean}
				showStrength={values.showStrength as boolean}
				disabled={values.disabled as boolean}
				readonly={values.readonly as boolean}
				required={values.required as boolean}
				invalid={values.invalid as boolean}
				sound={values.sound as boolean}
			/>
		</div>
	{/snippet}
</PropsPlayground>
