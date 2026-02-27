<script lang="ts">
	import { cn } from "$lib/utils";
	import { marked } from "marked";

	interface Props {
		content?: string;
		class?: string;
	}

	let { content = "", class: className = "" }: Props = $props();

	let html = $derived(marked.parse(content, { async: false, gfm: true }) as string);
</script>

<div class={cn("prose dark:prose-invert max-w-none", className)}>
	{@html html}
</div>
