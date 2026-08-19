<script lang="ts">
	import { CommandMenu, type CommandItem } from "$lib/fancy-ui/command-menu";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);

	// Items with no `group` render first, ungrouped — "Search everything"
	// here. Everything else buckets under the uppercase heading matching its
	// own `group`, in the order that group name first appears in the list.
	const items: CommandItem[] = [
		{ id: "search", label: "Search everything" },
		{ id: "new-doc", label: "New document", group: "Create", meta: "Document" },
		{ id: "new-folder", label: "New folder", group: "Create", meta: "Folder" },
		{ id: "profile", label: "Go to profile", group: "Navigate" },
		{ id: "billing", label: "Go to billing", group: "Navigate" },
	];
</script>

<Button onclick={() => (open = true)}>Open command menu</Button>

<CommandMenu bind:open {items} label="Jump to" />
