<script lang="ts">
	// FormField ships from this same wave, built by a different component.
	// It supplies controlId, aria-describedby and aria-invalid to FileUpload
	// through context — FileUpload itself needs no id or invalid prop here.
	import { FormField } from "$lib/fancy-ui/form-field";
	import { FileUpload, type UploadFile } from "$lib/fancy-ui/file-upload";

	let files = $state<UploadFile[]>([]);
	const error = $derived(files.length === 0 ? "Add at least one file." : undefined);
</script>

<FormField label="Attachments" required {error} class="w-full max-w-sm">
	<FileUpload sound bind:files multiple hint="PNG, SVG — 4 MB max" />
</FormField>
