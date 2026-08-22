<!--
	Test-only rig. `DropdownMenu`'s behaviour lives across the root, the
	trigger, the content and its items together, so proving any of it needs
	real instances of all of them, wired up the way a consumer actually
	would — raw HTML strings from a `.ts` test file carry no context and no
	event handlers. Every prop a test might need to vary is a parameter here,
	never hardcoded (items, disabled/variant/shortcut/closeOnSelect per item,
	`loop`, the submenu). Not exported from index.ts, and not collected by
	Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import DropdownMenu from "./DropdownMenu.svelte";
	import DropdownMenuTrigger from "./DropdownMenuTrigger.svelte";
	import DropdownMenuContent from "./DropdownMenuContent.svelte";
	import DropdownMenuItem from "./DropdownMenuItem.svelte";
	import DropdownMenuSeparator from "./DropdownMenuSeparator.svelte";
	import DropdownMenuLabel from "./DropdownMenuLabel.svelte";
	import DropdownMenuSub from "./DropdownMenuSub.svelte";
	import DropdownMenuSubTrigger from "./DropdownMenuSubTrigger.svelte";
	import DropdownMenuSubContent from "./DropdownMenuSubContent.svelte";

	interface ItemSpec {
		label: string;
		disabled?: boolean;
		variant?: "default" | "destructive";
		shortcut?: string;
		icon?: string;
		closeOnSelect?: boolean;
	}

	interface Props {
		items: ItemSpec[];
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		onSelect?: (label: string) => void;
		loop?: boolean;
		triggerDisabled?: boolean;
		labelText?: string;
		separatorBeforeIndex?: number;
		withSubmenu?: boolean;
		subItems?: ItemSpec[];
		subTriggerDisabled?: boolean;
		sound?: boolean;
	}

	let {
		items,
		open = $bindable(false),
		onOpenChange,
		onSelect,
		loop = true,
		triggerDisabled = false,
		labelText,
		separatorBeforeIndex,
		withSubmenu = false,
		subItems = [],
		subTriggerDisabled = false,
		sound = false,
	}: Props = $props();
</script>

<DropdownMenu bind:open {onOpenChange} {loop} {sound}>
	<DropdownMenuTrigger disabled={triggerDisabled}>Open menu</DropdownMenuTrigger>
	<DropdownMenuContent>
		{#if labelText}
			<DropdownMenuLabel>{labelText}</DropdownMenuLabel>
		{/if}
		{#each items as item, index (item.label)}
			{#if separatorBeforeIndex === index}
				<DropdownMenuSeparator />
			{/if}
			{#snippet itemIcon()}{item.icon}{/snippet}
			<DropdownMenuItem
				disabled={item.disabled}
				variant={item.variant}
				shortcut={item.shortcut}
				closeOnSelect={item.closeOnSelect}
				icon={item.icon ? itemIcon : undefined}
				onSelect={() => onSelect?.(item.label)}
			>
				{item.label}
			</DropdownMenuItem>
		{/each}
		{#if withSubmenu}
			<DropdownMenuSub>
				<DropdownMenuSubTrigger disabled={subTriggerDisabled}>More tools</DropdownMenuSubTrigger>
				<DropdownMenuSubContent>
					{#each subItems as item (item.label)}
						<DropdownMenuItem disabled={item.disabled} onSelect={() => onSelect?.(item.label)}>
							{item.label}
						</DropdownMenuItem>
					{/each}
				</DropdownMenuSubContent>
			</DropdownMenuSub>
		{/if}
	</DropdownMenuContent>
</DropdownMenu>
