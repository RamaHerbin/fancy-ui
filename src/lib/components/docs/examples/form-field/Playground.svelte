<script lang="ts">
	import { FormField } from "$lib/fancy-ui/form-field";
	import { Input } from "$lib/fancy-ui/input";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
	import { formFieldCode } from "./code.js";
</script>

<PropsPlayground
	component="FormField"
	slug="form-field"
	importNames={{
		svelte: ["FormField", "Input"],
		react: ["FormField", "Input"],
		vue: ["FormField", "Input"],
	}}
	codeFor={formFieldCode}
	controls={[
		{ key: "label", type: "text", label: "Label", maxLength: 30 },
		{ key: "description", type: "text", label: "Description", maxLength: 80 },
		{ key: "error", type: "text", label: "Error", maxLength: 60 },
		{ key: "valid", type: "boolean", label: "Valid" },
		{ key: "required", type: "boolean", label: "Required" },
		{ key: "disabled", type: "boolean", label: "Disabled" },
	]}
	initialValues={{
		label: "Email",
		description: "We only use this to send your receipt.",
		error: "",
		valid: false,
		required: false,
		disabled: false,
	}}
>
	{#snippet preview(values)}
		<div class="w-full max-w-sm">
			<FormField
				label={values.label as string}
				description={(values.description as string) || undefined}
				error={(values.error as string) || undefined}
				valid={values.valid as boolean}
				required={values.required as boolean}
				disabled={values.disabled as boolean}
			>
				<Input placeholder="you@example.com" />
			</FormField>
		</div>
	{/snippet}
</PropsPlayground>
