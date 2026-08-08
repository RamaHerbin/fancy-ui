<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { FileUpload, type UploadFile } from "$lib/fancy-ui/file-upload";

	const { Story } = defineMeta({
		title: "Forms/FileUpload",
		component: FileUpload,
		tags: ["autodocs"],
		args: {
			multiple: false,
			hint: "PNG, SVG — 4 MB max",
		},
		argTypes: {
			accept: { control: "text", description: "Native accept attribute; also enforced in JS" },
			multiple: { control: "boolean", description: "Allows more than one file per selection/drop" },
			maxSize: { control: "number", description: "Maximum size per file, in bytes" },
			maxFiles: { control: "number", description: "Maximum number of files the list may hold" },
			disabled: {
				control: "boolean",
				description: "Blocks selecting, dropping and removing files",
			},
			required: { control: "boolean", description: "Native required on the underlying input" },
			invalid: { control: "boolean", description: "Error border plus aria-invalid" },
			label: { control: "text", description: "Accessible name with no visible Label" },
			hint: { control: "text", description: "Constraint text under the drop zone" },
		},
	});

	const uploadingFiles: UploadFile[] = [
		{
			id: "1",
			file: new File(["logo"], "logo.svg", { type: "image/svg+xml" }),
			progress: 70,
			status: "uploading",
		},
	];

	const errorFiles: UploadFile[] = [
		{
			id: "1",
			file: new File(["huge"], "archive.zip", { type: "application/zip" }),
			progress: null,
			status: "error",
			error: "archive.zip exceeds the 4 MB limit.",
		},
	];
</script>

{#snippet template(args: any)}
	<div class="w-96">
		<FileUpload {...args} />
	</div>
{/snippet}

<Story name="Resting" {template} />

<Story name="Multiple" {template} args={{ multiple: true }} />

<Story name="Uploading" {template} args={{ files: uploadingFiles }} />

<Story name="Error" {template} args={{ files: errorFiles }} />

<Story name="Invalid" {template} args={{ invalid: true }} />

<Story name="Disabled" {template} args={{ disabled: true }} />
