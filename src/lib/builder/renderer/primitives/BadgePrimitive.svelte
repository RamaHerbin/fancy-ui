<script lang="ts">
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { cn } from "$lib/utils";
	import type { BadgeVariant } from "$lib/components/ui/badge/badge.svelte";

	interface Props {
		text?: string;
		variant?: string;
		class?: string;
	}

	let { text = "Badge", variant = "default", class: className = "" }: Props = $props();
</script>

<Badge variant={variant as BadgeVariant} class={cn(className)}>{text}</Badge>
