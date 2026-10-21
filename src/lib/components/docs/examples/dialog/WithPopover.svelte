<script lang="ts">
	import { Dialog } from "$lib/fancy-ui/dialog";
	import { Popover } from "$lib/fancy-ui/popover";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);
	let role = $state("Editor");
</script>

{#snippet trigger()}
	<Button variant="outline">Edit access</Button>
{/snippet}

<Dialog bind:open {trigger} title="Edit access" description="Change what this member can do.">
	<div class="flex items-center justify-between gap-3">
		<span class="text-muted-foreground text-[12px]">Role: {role}</span>
		<Popover class="w-[200px]">
			{#snippet trigger()}
				Change role
			{/snippet}
			<span class="text-[12px] font-semibold">Pick a role</span>
			<div class="flex gap-2">
				<Button size="sm" variant="outline" onclick={() => (role = "Viewer")}>Viewer</Button>
				<Button size="sm" variant="outline" onclick={() => (role = "Editor")}>Editor</Button>
			</div>
		</Popover>
	</div>
</Dialog>
