<script lang="ts">
	import { CommandMenu, type CommandItem } from "$lib/fancy-ui/command-menu";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);

	const items: CommandItem[] = [
		{ id: "button", label: "Button" },
		{ id: "badge", label: "Badge" },
		{ id: "banner", label: "Banner" },
		{ id: "icon-button", label: "Icon Button" },
	];

	// Replaces the default filter entirely — only a prefix match on the
	// label counts, so typing "ba" surfaces "Badge" and "Banner" but not
	// "Icon Button", even though "icon-button" never appears anywhere here.
	function prefixFilter(item: CommandItem, query: string): boolean {
		return item.label.toLowerCase().startsWith(query.toLowerCase());
	}
</script>

<Button onclick={() => (open = true)}>Open command menu</Button>

<CommandMenu sound bind:open {items} filter={prefixFilter} />
