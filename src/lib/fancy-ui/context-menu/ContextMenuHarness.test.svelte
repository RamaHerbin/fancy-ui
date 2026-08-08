<!--
	Test-only rig, same reasoning as `dropdown-menu/DropdownMenuHarness.test.svelte`:
	`ContextMenu`'s behaviour lives across the root, the trigger region, the
	content and its items together, so proving it needs real instances of
	all of them. Every prop a test might vary is a parameter here, never
	hardcoded. Not exported from index.ts, and not collected by Vitest.
-->
<script lang="ts">
	import ContextMenu from "./ContextMenu.svelte";
	import ContextMenuTrigger from "./ContextMenuTrigger.svelte";
	import ContextMenuContent from "./ContextMenuContent.svelte";
	// Item/Sub/SubTrigger/SubContent have no file of their own in this folder
	// — they are `dropdown-menu`'s implementations, re-exported under this
	// family's names from `index.ts`. See index.ts and README.md, "Shared
	// implementation".
	import {
		ContextMenuItem,
		ContextMenuSub,
		ContextMenuSubTrigger,
		ContextMenuSubContent,
	} from "./index.js";

	interface ItemSpec {
		label: string;
		disabled?: boolean;
	}

	interface Props {
		items: ItemSpec[];
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		onSelect?: (label: string) => void;
		triggerDisabled?: boolean;
		withSubmenu?: boolean;
		subItems?: ItemSpec[];
	}

	let {
		items,
		open = $bindable(false),
		onOpenChange,
		onSelect,
		triggerDisabled = false,
		withSubmenu = false,
		subItems = [],
	}: Props = $props();
</script>

<ContextMenu bind:open {onOpenChange}>
	<ContextMenuTrigger disabled={triggerDisabled}>
		<div data-testid="region">Right-click me</div>
	</ContextMenuTrigger>
	<ContextMenuContent>
		{#each items as item (item.label)}
			<ContextMenuItem disabled={item.disabled} onSelect={() => onSelect?.(item.label)}>
				{item.label}
			</ContextMenuItem>
		{/each}
		{#if withSubmenu}
			<ContextMenuSub>
				<ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
				<ContextMenuSubContent>
					{#each subItems as item (item.label)}
						<ContextMenuItem onSelect={() => onSelect?.(item.label)}>
							{item.label}
						</ContextMenuItem>
					{/each}
				</ContextMenuSubContent>
			</ContextMenuSub>
		{/if}
	</ContextMenuContent>
</ContextMenu>
