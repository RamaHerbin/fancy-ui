<script lang="ts">
	import { CommandMenu, type CommandItem } from "$lib/fancy-ui/command-menu";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);
	let picked = $state("");

	const items: CommandItem[] = [
		{ id: "button", label: "Button", meta: "Actions" },
		{ id: "icon-button", label: "Icon Button", meta: "Actions" },
		{ id: "rainbow-button", label: "Rainbow Button", meta: "Buttons" },
		{ id: "settings", label: "Settings" },
	];

	function handleSelect(item: CommandItem) {
		picked = item.label;
	}
</script>

<div class="flex flex-col items-start gap-3">
	<Button onclick={() => (open = true)}>Open command menu</Button>
	{#if picked}
		<p class="text-muted-foreground text-[12px]">Last picked: {picked}</p>
	{/if}
</div>

<CommandMenu bind:open {items} onSelect={handleSelect} />
