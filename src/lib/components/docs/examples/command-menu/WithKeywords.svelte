<script lang="ts">
	import { CommandMenu, type CommandItem } from "$lib/fancy-ui/command-menu";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);

	// `keywords` extend what the default filter matches against without
	// ever being shown — typing "invoice" or "plan" still finds "Billing",
	// and typing "shortcut" still finds "Keyboard Shortcuts".
	const items: CommandItem[] = [
		{ id: "billing", label: "Billing", meta: "Settings", keywords: ["invoice", "plan", "payment"] },
		{
			id: "shortcuts",
			label: "Keyboard Shortcuts",
			meta: "Help",
			keywords: ["hotkeys", "bindings"],
		},
		{ id: "theme", label: "Appearance", meta: "Settings", keywords: ["dark mode", "light mode"] },
	];
</script>

<Button onclick={() => (open = true)}>Open command menu</Button>

<CommandMenu sound bind:open {items} placeholder="Try “invoice” or “hotkeys”…" />
