<script lang="ts">
	import { FileUpload, type UploadFile } from "$lib/fancy-ui/file-upload";
	import PropsPlayground from "$lib/components/PropsPlayground.svelte";

	let files = $state<UploadFile[]>([]);
</script>

<PropsPlayground
	component="FileUpload"
	slug="file-upload"
	controls={[
		{ key: "accept", type: "text", label: "Accept", maxLength: 60 },
		{ key: "multiple", type: "boolean", label: "Multiple" },
		{ key: "maxSizeMb", type: "range", label: "Max size (MB, 0 = none)", min: 0, max: 20, step: 1 },
		{ key: "maxFiles", type: "range", label: "Max files (0 = none)", min: 0, max: 10, step: 1 },
		{ key: "label", type: "text", label: "Label", maxLength: 30 },
		{ key: "hint", type: "text", label: "Hint", maxLength: 60 },
		{ key: "disabled", type: "boolean", label: "Disabled" },
		{ key: "required", type: "boolean", label: "Required" },
		{ key: "invalid", type: "boolean", label: "Invalid" },
		{ key: "sound", type: "boolean", label: "Sound" },
	]}
	initialValues={{
		accept: "image/png,image/svg+xml",
		multiple: false,
		maxSizeMb: 4,
		maxFiles: 0,
		label: "Upload files",
		hint: "PNG, SVG, 4 MB max",
		disabled: false,
		required: false,
		invalid: false,
		sound: false,
	}}
>
	{#snippet preview(values)}
		<div class="w-full max-w-sm">
			<FileUpload
				bind:files
				accept={(values.accept as string) || undefined}
				multiple={values.multiple as boolean}
				maxSize={(values.maxSizeMb as number) > 0
					? (values.maxSizeMb as number) * 1024 * 1024
					: undefined}
				maxFiles={(values.maxFiles as number) > 0 ? (values.maxFiles as number) : undefined}
				label={values.label as string}
				hint={values.hint as string}
				disabled={values.disabled as boolean}
				required={values.required as boolean}
				invalid={values.invalid as boolean}
				sound={values.sound as boolean}
			/>
		</div>
	{/snippet}
</PropsPlayground>
