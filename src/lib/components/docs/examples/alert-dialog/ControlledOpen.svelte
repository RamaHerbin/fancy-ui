<script lang="ts">
	import { AlertDialog } from "$lib/fancy-ui/alert-dialog";
	import { Button } from "$lib/fancy-ui/button";

	// Same non-bound + onOpenChange pattern Dialog supports — useful when the
	// confirmation is triggered by something other than AlertDialog's own
	// `trigger`, e.g. a toolbar action or a keyboard shortcut.
	let isOpen = $state(false);
	let members = $state(["Alice", "Bob", "Priya"]);
</script>

<ul class="flex flex-col gap-1 text-[13px]">
	{#each members as member (member)}
		<li class="flex items-center justify-between gap-3">
			{member}
			<Button variant="ghost" size="sm" onclick={() => (isOpen = true)}>Remove</Button>
		</li>
	{/each}
</ul>

<AlertDialog
	sound
	open={isOpen}
	onOpenChange={(next) => (isOpen = next)}
	title="Remove member?"
	description="They will lose access to this workspace immediately."
	confirmLabel="Remove"
	onConfirm={() => (members = members.slice(0, -1))}
/>
