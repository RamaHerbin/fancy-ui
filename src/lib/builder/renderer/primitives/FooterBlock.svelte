<script lang="ts">
	import { cn } from "$lib/utils";
	import { getSiteConfig } from "../SiteProvider.svelte";
	import type { NavItem } from "../../types/site.js";

	interface Props {
		class?: string;
	}

	let { class: className = "" }: Props = $props();

	const config = getSiteConfig();
	let footerText = $derived(config?.footer?.text ?? "");
	let footerLinks = $derived(config?.footer?.links ?? []);
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

<footer class={cn("border-border bg-muted/40 border-t", className)}>
	<div class="mx-auto max-w-6xl px-4 py-8">
		<div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
			<div class="text-muted-foreground text-sm">
				{#if footerText}
					{footerText}
				{:else if title}
					&copy; {new Date().getFullYear()} {title}
				{/if}
			</div>
			{#if footerLinks.length > 0}
				<div class="flex items-center gap-4">
					{#each footerLinks as item (item.id)}
						<a
							href={resolveHref(item)}
							target={isExternal(item) ? "_blank" : undefined}
							rel={isExternal(item) ? "noopener noreferrer" : undefined}
							class="text-muted-foreground hover:text-foreground text-sm transition-colors"
						>
							{item.label}
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</footer>
