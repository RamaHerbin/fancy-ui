<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { ButtonGroup, type ButtonGroupOrientation } from "$lib/fancy-ui/button-group";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

<PropsPlayground
	component="ButtonGroup"
	slug="button-group"
	importNames={{ svelte: ["ButtonGroup", "Button"] }}
	controls={[
		{
			key: "orientation",
			type: "select",
			label: "Orientation",
			options: [
				{ value: "horizontal", label: "horizontal" },
				{ value: "vertical", label: "vertical" },
			],
		},
		{ key: "label", type: "text", label: "Label", maxLength: 40 },
	]}
	initialValues={{ orientation: "horizontal", label: "Clipboard actions" }}
>
	{#snippet preview(values)}
		<ButtonGroup
			orientation={values.orientation as ButtonGroupOrientation}
			label={values.label as string}
		>
			<Button variant="outline">Cut</Button>
			<Button variant="outline">Copy</Button>
			<Button variant="outline">Paste</Button>
		</ButtonGroup>
	{/snippet}
</PropsPlayground>
