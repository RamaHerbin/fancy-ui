<script lang="ts">
	import { cn } from "$lib/utils";
	import type { LinkValue } from "../../types/registry.js";

	interface Props {
		text?: string;
		href?: LinkValue;
		variant?: string;
		icon?: string;
		class?: string;
	}

	let {
		text = "Click here",
		href = { href: "#", target: "_self" as const },
		variant = "link",
		class: className = "",
	}: Props = $props();

	let resolvedHref = $derived(href?.pageSlug ? `/pages/${href.pageSlug}` : (href?.href ?? "#"));
	let target = $derived(href?.target ?? "_self");

	const variantClasses: Record<string, string> = {
		link: "text-primary underline-offset-4 hover:underline",
		button:
			"inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90",
		ghost:
			"inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
	};
</script>

<a
	href={resolvedHref}
	{target}
	rel={target === "_blank" ? "noopener noreferrer" : undefined}
	class={cn(variantClasses[variant] ?? variantClasses.link, className)}
>
	{text}
</a>
