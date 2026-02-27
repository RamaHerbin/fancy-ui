<script lang="ts">
	import { cn } from "$lib/utils";

	interface Props {
		style?: string;
		class?: string;
	}

	let { style = "solid", class: className = "" }: Props = $props();

	const styleMap: Record<string, string> = {
		solid: "border-solid",
		dashed: "border-dashed",
		dotted: "border-dotted",
	};
</script>

<hr class={cn("border-border my-4 border-t", styleMap[style] ?? "border-solid", className)} />
