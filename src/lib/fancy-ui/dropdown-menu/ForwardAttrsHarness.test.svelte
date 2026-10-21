<!--
	Test-only rig: mounts the trigger, an item and a sub-trigger with consumer
	attribute bags spread onto them, the way a consumer would write
	`<DropdownMenuItem data-testid="x" onfocus={...}>`.
-->
<script lang="ts">
	import DropdownMenu from "./DropdownMenu.svelte";
	import DropdownMenuTrigger from "./DropdownMenuTrigger.svelte";
	import DropdownMenuContent from "./DropdownMenuContent.svelte";
	import DropdownMenuItem from "./DropdownMenuItem.svelte";
	import DropdownMenuSub from "./DropdownMenuSub.svelte";
	import DropdownMenuSubTrigger from "./DropdownMenuSubTrigger.svelte";
	import DropdownMenuSubContent from "./DropdownMenuSubContent.svelte";

	interface Props {
		open?: boolean;
		triggerAttrs?: Record<string, unknown>;
		itemAttrs?: Record<string, unknown>;
		subTriggerAttrs?: Record<string, unknown>;
		triggerDisabled?: boolean;
		itemDisabled?: boolean;
		onSelect?: () => void;
	}

	let {
		open = $bindable(false),
		triggerAttrs = {},
		itemAttrs = {},
		subTriggerAttrs = {},
		triggerDisabled = false,
		itemDisabled = false,
		onSelect,
	}: Props = $props();
</script>

<DropdownMenu bind:open>
	<DropdownMenuTrigger disabled={triggerDisabled} {...triggerAttrs}>Open menu</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuItem disabled={itemDisabled} closeOnSelect={false} {onSelect} {...itemAttrs}>
			Rename
		</DropdownMenuItem>
		<DropdownMenuSub>
			<DropdownMenuSubTrigger {...subTriggerAttrs}>More tools</DropdownMenuSubTrigger>
			<DropdownMenuSubContent>
				<DropdownMenuItem>Nested</DropdownMenuItem>
			</DropdownMenuSubContent>
		</DropdownMenuSub>
	</DropdownMenuContent>
</DropdownMenu>
