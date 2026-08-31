<script lang="ts">
	import { AlertDialog } from "$lib/fancy-ui/alert-dialog";
	import { Button } from "$lib/fancy-ui/button";

	let status = $state("");
</script>

{#snippet trigger()}
	<Button variant="destructive">Delete project</Button>
{/snippet}

<AlertDialog
	sound
	{trigger}
	title="Delete this project?"
	description="This action is irreversible. All data will be lost."
	confirmLabel="Delete"
	onConfirm={() => (status = "Project deleted.")}
	onCancel={() => (status = "Cancelled.")}
/>

{#if status}
	<p class="text-muted-foreground mt-2 text-[12px]">{status}</p>
{/if}
