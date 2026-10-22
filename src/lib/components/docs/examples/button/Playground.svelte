<script lang="ts">
	import { Button, type ButtonSize, type ButtonVariant } from "$lib/fancy-ui/button";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	component="Button"
	slug="button"
	childrenKey="label"
	constraints={["Needs no wrapper: it sizes itself to its label."]}
	controls={[
		{ key: "label", type: "text", label: "Label", maxLength: 40 },
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
		{ key: "disabled", type: "boolean", label: "Disabled" },
		{ key: "loading", type: "boolean", label: "Loading" },
	]}
	initialValues={{
		label: "Save changes",
		variant: "primary",
		size: "md",
		disabled: false,
		loading: false,
	}}
>
	{#snippet preview(values)}
		<Button
			variant={values.variant as ButtonVariant}
			size={values.size as ButtonSize}
			disabled={values.disabled as boolean}
			loading={values.loading as boolean}
		>
			{values.label}
		</Button>
	{/snippet}
</PropsPlayground>
