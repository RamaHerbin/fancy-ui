<script lang="ts">
	import { CommandMenu, type CommandItem } from "$lib/fancy-ui/command-menu";
	import { Button } from "$lib/fancy-ui/button";

	let open = $state(false);

	const items: CommandItem[] = [
		{ id: "button", label: "Button" },
		{ id: "icon-button", label: "Icon Button" },
		{ id: "rainbow-button", label: "Rainbow Button" },
	];
</script>

<!--
	Opens on a click, with the query pre-filled to something no item matches, so
	the empty state is one interaction away rather than a keystroke away.

	It deliberately does NOT mount already-open. `CommandMenu` is modal and
	portalled to `document.body`, so an example rendered with `open` set does
	not appear inside the docs page's preview box the way every non-modal
	example does — it covers the entire page, traps focus and locks scrolling
	from the moment the route mounts, before the reader has scrolled anywhere
	near the Examples section. Whatever the example is meant to demonstrate,
	that is what a visitor sees first.
-->
<Button onclick={() => (open = true)}>Show the empty state</Button>

<CommandMenu
	bind:open
	{items}
	query="zzz-no-match"
	emptyMessage="No components match “zzz-no-match”."
/>
