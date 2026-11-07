<script lang="ts">
	import { AlertDialog } from "$lib/fancy-ui/alert-dialog";
	import { Button } from "$lib/fancy-ui/button";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";
</script>

{#snippet trigger()}
	<Button variant="destructive">Delete project</Button>
{/snippet}

<PropsPlayground
	component="AlertDialog"
	slug="alert-dialog"
	importNames={{ svelte: ["AlertDialog", "Button"] }}
	controls={[
		{ key: "title", type: "text", label: "Title", maxLength: 60 },
		{ key: "description", type: "text", label: "Description", maxLength: 120 },
		{ key: "confirmLabel", type: "text", label: "Confirm label", maxLength: 24 },
		{ key: "cancelLabel", type: "text", label: "Cancel label", maxLength: 24 },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		title: "Delete this project?",
		description: "This action is irreversible. All data will be lost.",
		confirmLabel: "Delete",
		cancelLabel: "Cancel",
		sound: false,
	}}
>
	{#snippet preview(values)}
		<AlertDialog
			{trigger}
			title={values.title as string}
			description={values.description as string}
			confirmLabel={values.confirmLabel as string}
			cancelLabel={values.cancelLabel as string}
			sound={values.sound as boolean}
		/>
	{/snippet}
</PropsPlayground>
