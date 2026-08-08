<script lang="ts">
	import { CommandMenu, type CommandItem } from "$lib/fancy-ui/command-menu";

	const items: CommandItem[] = [
		{ id: "button", label: "Button" },
		{ id: "icon-button", label: "Icon Button" },
		{ id: "rainbow-button", label: "Rainbow Button" },
	];
</script>

<!--
	Opened with a query that matches nothing, so the empty state renders
	immediately for the preview instead of requiring a keystroke first.
	`open` here is a plain, non-bound prop on purpose — this example only
	ever needs to show the one state, not a working toggle.
-->
<CommandMenu open {items} query="zzz-no-match" emptyMessage="No components match “zzz-no-match”." />
