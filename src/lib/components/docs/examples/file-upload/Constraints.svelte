<script lang="ts">
	// accept, maxSize and maxFiles are all re-checked in JS, on both the
	// picker and a drop — the input's own `accept` only filters what the OS
	// picker shows, so a dropped file needs the same JS gate to be enforced
	// at all.
	import { FileUpload, type UploadFile } from "$lib/fancy-ui/file-upload";

	let files = $state<UploadFile[]>([]);
</script>

<div class="w-full max-w-sm">
	<FileUpload
		sound
		bind:files
		multiple
		accept="image/png,image/svg+xml"
		maxSize={4_000_000}
		maxFiles={3}
		hint="PNG, SVG — 4 MB max, up to 3 files"
	/>
</div>
