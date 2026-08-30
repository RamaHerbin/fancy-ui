<script lang="ts">
	import { FileUpload, type UploadFile } from "$lib/fancy-ui/file-upload";

	let files = $state<UploadFile[]>([]);
</script>

<div class="w-full max-w-sm">
	<FileUpload sound bind:files hint="PNG, SVG — 4 MB max" />
</div>
