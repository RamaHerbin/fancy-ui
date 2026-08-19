<!--
  Test-only rig. The behaviour under test spans every piece of the compound
  at once (root timers, an item's own trigger/content pair, the links inside
  a panel), so proving it needs real instances wired up the way a consumer
  actually would — a `.ts` test file has no snippets and no context. `bind:`
  is forwarded through this component's own bindable prop so a test can
  round-trip the open value the same way ToggleGroup's harness round-trips a
  selection.

  Not exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import NavigationMenu from "./NavigationMenu.svelte";
	import NavigationMenuList from "./NavigationMenuList.svelte";
	import NavigationMenuItem from "./NavigationMenuItem.svelte";
	import NavigationMenuTrigger from "./NavigationMenuTrigger.svelte";
	import NavigationMenuContent from "./NavigationMenuContent.svelte";
	import NavigationMenuLink from "./NavigationMenuLink.svelte";

	interface Link {
		href: string;
		title: string;
		description?: string;
		current?: boolean;
	}

	interface Item {
		value: string;
		label: string;
		links: Link[];
	}

	interface Props {
		items: Item[];
		value?: string;
		onValueChange?: (value: string) => void;
		label?: string;
		openDelay?: number;
		closeDelay?: number;
		/** A plain, non-disclosure link rendered after the items — the mockup's "Pricing". */
		extraLink?: Link;
	}

	let {
		items,
		value = $bindable(""),
		onValueChange,
		label = "Test navigation",
		openDelay = 150,
		closeDelay = 200,
		extraLink,
	}: Props = $props();
</script>

<NavigationMenu bind:value {onValueChange} {label} {openDelay} {closeDelay}>
	<NavigationMenuList>
		{#each items as item (item.value)}
			<NavigationMenuItem value={item.value}>
				<NavigationMenuTrigger>{item.label}</NavigationMenuTrigger>
				<NavigationMenuContent>
					{#each item.links as link (link.href)}
						<NavigationMenuLink
							href={link.href}
							title={link.title}
							description={link.description}
							current={link.current}
						/>
					{/each}
				</NavigationMenuContent>
			</NavigationMenuItem>
		{/each}
		{#if extraLink}
			<li><a href={extraLink.href}>{extraLink.title}</a></li>
		{/if}
	</NavigationMenuList>
</NavigationMenu>
<span data-testid="bound-value">{value}</span>
