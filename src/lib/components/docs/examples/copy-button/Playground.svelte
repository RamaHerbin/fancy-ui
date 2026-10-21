<script lang="ts">
	import { CopyButton } from "$lib/fancy-ui/copy-button";
	import type { ButtonSize, ButtonVariant } from "$lib/fancy-ui/button";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	component="CopyButton"
	slug="copy-button"
	required={["value"]}
	constraints={[
		"`value` is required: it is the text written to the clipboard.",
		"Clipboard access needs a secure context (https or localhost).",
	]}
	controls={[
		{ key: "value", type: "text", label: "Value to copy", maxLength: 80 },
		{ key: "label", type: "text", label: "Label", maxLength: 24 },
		{
			key: "variant",
			type: "select",
			label: "Variant",
			options: ["primary", "secondary", "outline", "ghost", "accent", "destructive"].map((v) => ({
				value: v,
				label: v,
			})),
		},
		{
			key: "size",
			type: "select",
			label: "Size",
			options: ["sm", "md", "lg"].map((v) => ({ value: v, label: v })),
		},
		{ key: "iconOnly", type: "boolean", label: "Icon only" },
		{ key: "disabled", type: "boolean", label: "Disabled" },
	]}
	initialValues={{
		value: "npm install fancy-ui-svelte",
		label: "Copy",
		variant: "outline",
		size: "md",
		iconOnly: false,
		disabled: false,
	}}
>
	{#snippet preview(values)}
		<CopyButton
			value={values.value as string}
			label={values.label as string}
			variant={values.variant as ButtonVariant}
			size={values.size as ButtonSize}
			iconOnly={values.iconOnly as boolean}
			disabled={values.disabled as boolean}
		/>
	{/snippet}
</PropsPlayground>
