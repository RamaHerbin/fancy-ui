<script lang="ts">
	// Demonstrates the intended shape of a real upload: FileUpload only draws
	// whatever status/progress each row currently holds, so driving it is a
	// matter of writing back into the bound array as an upload proceeds. This
	// fakes the network with a timer instead of an actual request.
	//
	// Every write below goes through the bound `files` array itself, found by
	// id — never through the row object `onFilesChange` hands back. That
	// object is a plain snapshot; mutating it directly doesn't reach the
	// reactive state Svelte is actually rendering from, so the bar never
	// visibly moves even though the data technically changed.
	import { FileUpload, type UploadFile } from "$lib/fancy-ui/file-upload";

	let files = $state<UploadFile[]>([]);

	function fakeUpload(id: string) {
		const timer = setInterval(() => {
			const entry = files.find((f) => f.id === id);
			if (!entry || entry.progress === null) {
				clearInterval(timer);
				return;
			}
			entry.progress = Math.min(100, entry.progress + 10);
			if (entry.progress >= 100) {
				entry.status = "done";
				clearInterval(timer);
			}
		}, 200);
	}

	function onFilesChange(next: UploadFile[]) {
		for (const added of next) {
			if (added.status !== "pending") continue;
			const entry = files.find((f) => f.id === added.id);
			if (entry) {
				entry.status = "uploading";
				entry.progress = 0;
			}
			fakeUpload(added.id);
		}
	}
</script>

<div class="w-full max-w-sm">
	<FileUpload bind:files {onFilesChange} multiple hint="Any file — upload speed is simulated" />
</div>
