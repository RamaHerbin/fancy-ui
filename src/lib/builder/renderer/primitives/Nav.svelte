<script lang="ts">
	import { cn } from "$lib/utils";
	import { getSiteConfig } from "../SiteProvider.svelte";
	import type { NavItem } from "../../types/site.js";

	interface Props {
		variant?: string;
		class?: string;
	}

	let { variant = "sticky", class: className = "" }: Props = $props();

	const config = getSiteConfig();
	let navItems = $derived(config?.navigation ?? []);
	let title = $derived(config?.title ?? "");

	function resolveHref(item: NavItem): string {
		switch (item.target.type) {
			case "page":
				return `/pages/${item.target.slug}`;
			case "anchor":
				return `#${item.target.anchorId}`;
			case "url":
				return item.target.href;
			default:
				return "#";
		}
	}

	function isExternal(item: NavItem): boolean {
		return item.target.type === "url" && (item.target.external ?? false);
	}
</script>

<nav
	class={cn(
		"border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 z-50 w-full border-b backdrop-blur",
		variant === "sticky" ? "sticky top-0" : "",
		className
	)}
>
	<div class="mx-auto flex h-14 max-w-6xl items-center px-4">
		{#if title}
			<a href="/" class="mr-6 text-lg font-bold">{title}</a>
		{/if}
		<div class="flex items-center gap-6">
			{#each navItems as item (item.id)}
				<a
					href={resolveHref(item)}
					target={isExternal(item) ? "_blank" : undefined}
					rel={isExternal(item) ? "noopener noreferrer" : undefined}
					class="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
				>
					{item.label}
				</a>
			{/each}
		</div>
	</div>
</nav>
