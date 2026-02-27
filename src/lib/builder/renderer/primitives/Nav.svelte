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
	let description = $derived(config?.description ?? "");

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
	<div class="container mx-auto px-4 py-4">
		<div class="flex items-center justify-between">
			<div>
				{#if title}
					<h1 class="text-xl font-semibold">{title}</h1>
				{/if}
				{#if description}
					<p class="text-muted-foreground text-sm">{description}</p>
				{/if}
			</div>
			<nav class="hidden items-center space-x-6 md:flex">
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
			</nav>
		</div>
	</div>
</nav>
